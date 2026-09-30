import { httpRouter } from "convex/server";
import { httpAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { auth } from "./auth";

/**
 * Twilio inbound-message webhook.
 *
 * Point your Twilio number's "A message comes in" webhook at:
 *   https://<your-deployment>.convex.site/twilio/inbound
 *
 * Replies are matched to a shop via the client's most recent appointment.
 * STOP / UNSUBSCRIBE opts the client out of future texts from that shop;
 * START / YES opts them back in. Always answers 200 with empty TwiML so
 * Twilio does not retry.
 */
const handleTwilioInbound = httpAction(async (ctx, request) => {
  try {
    const form = await request.formData();
    const from = String(form.get("From") ?? "").trim();
    const body = String(form.get("Body") ?? "")
      .trim()
      .toUpperCase();

    if (from && (body.startsWith("STOP") || body.startsWith("UNSUBSCRIBE"))) {
      await ctx.runMutation(internal.http.optOut, { phone: from });
    } else if (from && (body.startsWith("START") || body === "YES")) {
      await ctx.runMutation(internal.http.optIn, { phone: from });
    }
  } catch (err) {
    console.error("[webhook] inbound parse failed:", err);
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
});

/** Internal: opt the phone out at its most recently booked shop. */
export const optOut = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const appts = await ctx.db.query("appointments").collect();
    const latest = appts
      .filter((a) => a.clientPhone === phone)
      .sort((a, b) => b.startAt - a.startAt)[0];
    if (!latest) return;
    const existing = await ctx.db
      .query("smsOptOuts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        barberId: latest.barberId,
        createdAt: Date.now(),
      });
      return;
    }
    await ctx.db.insert("smsOptOuts", {
      phone,
      barberId: latest.barberId,
      createdAt: Date.now(),
    });
  },
});

/** Internal: remove an opt-out (client texted START). */
export const optIn = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const existing = await ctx.db
      .query("smsOptOuts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

const http = httpRouter();

http.route({
  path: "/twilio/inbound",
  method: "POST",
  handler: handleTwilioInbound,
});

// CRITICAL: Convex Auth's sign-in/sign-out/token endpoints are served from
// this router ("/api/auth/*"). Without these routes, sign-up and sign-in
// silently fail (the client gets 404s from /api/auth/*).
auth.addHttpRoutes(http);

export default http;
