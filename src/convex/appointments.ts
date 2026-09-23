import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { SLOT_MINUTES, isValidPhone } from "../lib/booking";
import type { Id } from "./_generated/dataModel";

/** Look up the signed-in user's shop, or null. */
async function findMyShop(ctx: any, userId: Id<"users">) {
  return ctx.db
    .query("barbers")
    .withIndex("by_owner", (q: any) => q.eq("ownerUserId", userId))
    .unique();
}

/** Ensure the appointment belongs to the signed-in barber's shop. */
async function requireOwnership(
  ctx: any,
  userId: Id<"users">,
  barberId: Id<"barbers">,
) {
  const shop = await findMyShop(ctx, userId);
  if (!shop || shop._id !== barberId) {
    throw new Error("Not found.");
  }
}

/** Public: slot starts already booked for one shop on one date. */
export const takenSlots = query({
  args: { barberId: v.id("barbers"), dateKey: v.string() },
  handler: async (ctx, { barberId, dateKey }) => {
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_barber_and_date", (q) =>
        q.eq("barberId", barberId).eq("dateKey", dateKey),
      )
      .collect();
    return rows
      .filter((r) => r.status !== "cancelled")
      .map((r) => r.startAt);
  },
});

/** Public: create a booking at a specific shop. */
export const createBooking = mutation({
  args: {
    barberId: v.id("barbers"),
    dateKey: v.string(),
    startAt: v.number(),
    serviceName: v.string(),
    clientName: v.string(),
    clientPhone: v.string(),
    clientUtcOffset: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isValidPhone(args.clientPhone)) {
      throw new Error("Please enter a valid phone number.");
    }

    const shop = await ctx.db.get(args.barberId);
    if (!shop) throw new Error("This shop does not exist.");

    // Avoid double-booking the same slot at this shop.
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_barber_and_date", (q) =>
        q.eq("barberId", args.barberId).eq("dateKey", args.dateKey),
      )
      .collect();
    const clash = rows.some(
      (r) => r.status !== "cancelled" && r.startAt === args.startAt,
    );
    if (clash) {
      throw new Error("Sorry — that time was just reserved. Choose another.");
    }

    const id = await ctx.db.insert("appointments", {
      barberId: args.barberId,
      dateKey: args.dateKey,
      startAt: args.startAt,
      endAt: args.startAt + SLOT_MINUTES * 60 * 1000,
      clientName: args.clientName.trim(),
      clientPhone: args.clientPhone.trim(),
      clientUtcOffset: args.clientUtcOffset,
      serviceName: args.serviceName,
      notes: args.notes?.trim() || undefined,
      status: "pending",
      reminderStatus: "scheduled",
    });

    // Fire the client's reminder one hour before the slot starts.
    const fireAt = Math.max(args.startAt - 60 * 60 * 1000, Date.now() + 5_000);
    const jobId = await ctx.scheduler.runAt(
      fireAt,
      internal.reminders.sendReminder,
      { appointmentId: id },
    );
    await ctx.db.patch(id, { reminderJobId: jobId });

    return id;
  },
});

/** Barber-scoped: my shop's appointments for one date. */
export const byDay = query({
  args: { dateKey: v.string() },
  handler: async (ctx, { dateKey }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const shop = await findMyShop(ctx, userId);
    if (!shop) return [];
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_barber_and_date", (q) =>
        q.eq("barberId", shop._id).eq("dateKey", dateKey),
      )
      .collect();
    return rows.sort((a, b) => a.startAt - b.startAt);
  },
});

/** Barber-scoped: mark a booking as confirmed (client showed up). */
export const confirm = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const appt = await ctx.db.get(id);
    if (!appt) throw new Error("Not found.");
    await requireOwnership(ctx, userId, appt.barberId);
    await ctx.db.patch(id, { status: "confirmed" });
  },
});

/** Barber-scoped: no-show — client would be invited to rebook. */
export const markNoShow = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const appt = await ctx.db.get(id);
    if (!appt) throw new Error("Not found.");
    await requireOwnership(ctx, userId, appt.barberId);
    await ctx.db.patch(id, { status: "noShow" });
  },
});

/** Barber-scoped: cancel a booking (frees the slot + cancels the reminder). */
export const cancel = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const appt = await ctx.db.get(id);
    if (!appt) throw new Error("Not found.");
    await requireOwnership(ctx, userId, appt.barberId);
    // Stop the scheduled reminder if it has not run yet.
    if (appt.reminderStatus === "scheduled" && appt.reminderJobId) {
      try {
        await ctx.scheduler.cancel(appt.reminderJobId);
      } catch {
        // Already fired — the reminder's own guard handles this case.
      }
    }
    await ctx.db.patch(id, {
      status: "cancelled",
      reminderStatus: "cancelled",
    });
  },
});
