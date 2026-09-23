import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { SLOT_MINUTES, isValidPhone } from "../lib/booking";

/** Public (no auth): slot start times (epoch ms) already booked for a date. */
export const takenSlots = query({
  args: { dateKey: v.string() },
  handler: async (ctx, { dateKey }) => {
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .collect();
    return rows.filter((r) => r.status !== "cancelled").map((r) => r.startAt);
  },
});

/** Public (no auth): create a booking from the client booking form. */
export const createBooking = mutation({
  args: {
    dateKey: v.string(),
    startAt: v.number(),
    serviceName: v.string(),
    clientName: v.string(),
    clientPhone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isValidPhone(args.clientPhone)) {
      throw new Error("Please enter a valid phone number.");
    }

    // Avoid double-booking the exact same slot.
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("dateKey", args.dateKey))
      .collect();
    const clash = rows.some(
      (r) => r.status !== "cancelled" && r.startAt === args.startAt,
    );
    if (clash) {
      throw new Error("Sorry — that slot was just taken. Pick another time.");
    }

    const id = await ctx.db.insert("appointments", {
      dateKey: args.dateKey,
      startAt: args.startAt,
      endAt: args.startAt + SLOT_MINUTES * 60 * 1000,
      clientName: args.clientName.trim(),
      clientPhone: args.clientPhone.trim(),
      serviceName: args.serviceName,
      notes: args.notes?.trim() || undefined,
      status: "pending",
    });
    return id;
  },
});

/** Signed-in barber: every appointment for one calendar date. */
export const byDay = query({
  args: { dateKey: v.string() },
  handler: async (ctx, { dateKey }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .collect();
    return rows.sort((a, b) => a.startAt - b.startAt);
  },
});

/** Signed-in barber: mark a booking as confirmed (client showed up). */
export const confirm = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    await ctx.db.patch(id, { status: "confirmed" });
  },
});

/** Signed-in barber: no-show — client gets nudged to rebook. */
export const markNoShow = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    await ctx.db.patch(id, { status: "noShow" });
  },
});

/** Signed-in barber: cancel a booking (frees the slot). */
export const cancel = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    await ctx.db.patch(id, { status: "cancelled" });
  },
});

/** Public: lightweight count of active bookings (landing page social proof). */
export const publicStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("appointments").collect();
    const active = all.filter((a) => a.status !== "cancelled");
    return { total: active.length };
  },
});
