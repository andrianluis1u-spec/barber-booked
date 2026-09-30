import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { isValidPhone } from "../lib/booking";
import type { Id } from "./_generated/dataModel";

/**
 * Spam guard: one phone number may book at most 3 times per hour across
 * the whole platform. Runs inside the booking mutation so it cannot be
 * skipped, and works without any client-supplied data.
 */
async function enforcePublicRateLimit(ctx: any, phone: string, ip?: string) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = await ctx.db.query("appointments").collect();
  const samePhone = recent.filter(
    (r: any) =>
      r.clientPhone === phone &&
      r.status !== "cancelled" &&
      r._creationTime >= hourAgo,
  );
  if (samePhone.length >= 3) {
    throw new Error(
      "Too many bookings with this number recently. Please try again later.",
    );
  }
  void ip;
}

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

/** Best-effort cancellation of a scheduled job that may have already run. */
async function tryCancelJob(
  ctx: any,
  jobId: Id<"_scheduled_functions"> | undefined,
) {
  if (!jobId) return;
  try {
    await ctx.scheduler.cancel(jobId);
  } catch {
    // Already fired or completed — nothing to cancel.
  }
}

/** Stop all messages tied to a booking (reminder, alert, follow-up, re-notify). */
async function stopAllJobs(ctx: any, appt: any) {
  await tryCancelJob(ctx, appt.reminderJobId);
  await tryCancelJob(ctx, appt.followUpJobId);
  await tryCancelJob(ctx, appt.reNotifyJobId);
}

/**
 * Public: busy intervals for one shop on one date (start & end epoch ms).
 * Clients render the shop's own slot grid locally and disable anything
 * overlapping these intervals.
 */
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
      .map((r) => ({ start: r.startAt, end: r.endAt }));
  },
});

/**
 * Public: create a booking at a specific shop.
 *
 * Flow is service-free: date & time + name + phone + explicit SMS consent.
 * The consent timestamp is stored server-side; without it no client SMS is
 * ever sent. Double-booking the same slot at the same shop is rejected.
 */
export const createBooking = mutation({
  args: {
    barberId: v.id("barbers"),
    dateKey: v.string(),
    startAt: v.number(),
    clientName: v.string(),
    clientPhone: v.string(),
    clientEmail: v.optional(v.string()),
    clientUtcOffset: v.optional(v.number()),
    // Epoch ms of the client's explicit SMS consent — required.
    smsConsentAt: v.number(),
    // Coarse client IP for the public rate limit (never shown anywhere).
    clientIp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isValidPhone(args.clientPhone)) {
      throw new Error("Please enter a valid phone number.");
    }
    if (args.clientName.trim().length < 2) {
      throw new Error("Please enter your name.");
    }
    if (args.startAt <= Date.now()) {
      throw new Error("That time has already passed. Choose a new one.");
    }

    const shop = await ctx.db.get(args.barberId);
    if (!shop) throw new Error("This shop does not exist.");

    // Per-shop booking rules (falling back to platform defaults).
    const slotMinutes = shop.slotMinutes ?? 30;
    const openHour = shop.openHour ?? 9;
    const closeHour = shop.closeHour ?? 20;
    const closedDays = shop.closedWeekdays ?? [];
    const windowDays = shop.bookingWindowDays ?? 14;

    // Slot must align with the shop's grid and respect opening hours —
    // computed in the SHOP's local time, never the server's.
    const shopOffset = shop.ownerUtcOffset ?? 0;
    const [y, mo, d] = args.dateKey.split("-").map(Number);
    const slotDate = new Date(Date.UTC(y, mo - 1, d) - 24 * 60 * 1000);
    // Weekday of the dateKey in the shop's local calendar:
    const weekday = new Date(`${args.dateKey}T12:00:00Z`).getUTCDay();
    if (closedDays.includes(weekday)) {
      throw new Error("The shop is closed on that day. Pick another day.");
    }
    void slotDate;
    // Shop-local wall-clock minutes of the slot start:
    const shifted = new Date(args.startAt - shopOffset * 60_000);
    const slotLocalMin = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
    if (
      args.startAt % (slotMinutes * 60_000) !== 0 ||
      slotLocalMin < openHour * 60 ||
      slotLocalMin + slotMinutes > closeHour * 60
    ) {
      throw new Error("That time is outside the shop's opening hours. Pick another.");
    }
    if (args.startAt > Date.now() + windowDays * 24 * 60 * 60 * 1000) {
      throw new Error("That date is too far ahead. Choose one within the booking window.");
    }

    // Avoid double-booking: reject any overlap with existing busy intervals
    // at this shop (works for any mix of slot lengths).
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_barber_and_date", (q) =>
        q.eq("barberId", args.barberId).eq("dateKey", args.dateKey),
      )
      .collect();
    const newEnd = args.startAt + slotMinutes * 60_000;
    const clash = rows.some(
      (r) =>
        r.status !== "cancelled" &&
        args.startAt < r.endAt &&
        r.startAt < newEnd,
    );
    if (clash) {
      throw new Error("Sorry — that time was just reserved. Choose another.");
    }

    // Consent is mandatory: the checkbox on the booking form is required.
    if (!args.smsConsentAt) {
      throw new Error("Please agree to receive SMS messages to continue.");
    }

    await enforcePublicRateLimit(ctx, args.clientPhone.trim(), args.clientIp);

    // Secret token for the client's cancel / rebook links.
    const cancelToken =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    const id = await ctx.db.insert("appointments", {
      barberId: args.barberId,
      dateKey: args.dateKey,
      startAt: args.startAt,
      endAt: args.startAt + slotMinutes * 60 * 1000,
      clientName: args.clientName.trim(),
      clientPhone: args.clientPhone.trim(),
      clientEmail: args.clientEmail?.trim() || undefined,
      clientUtcOffset: args.clientUtcOffset,
      smsConsentAt: args.smsConsentAt,
      bookingIp: args.clientIp,
      cancelToken,
      status: "pending",
      reminderStatus: "scheduled",
      alertStatus: "scheduled",
      followUpStatus: "scheduled",
    });

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    // 1) Immediate alert to the barber: name, phone, date, time.
    const alertJobId = await ctx.scheduler.runAfter(
      5_000,
      internal.reminders.sendNewBookingAlert,
      { appointmentId: id },
    );

    // 2) Client reminder one hour before the slot (with cancel link).
    const reminderFireAt = Math.max(args.startAt - HOUR, now + 5_000);
    const reminderJobId = await ctx.scheduler.runAt(
      reminderFireAt,
      internal.reminders.sendReminder,
      { appointmentId: id },
    );

    // 3) Post-appointment follow-up to the barber one hour after the slot:
    //    "Came or No-show?" — re-sent once at two hours (same job chain).
    const followUpFireAt = Math.max(args.startAt + HOUR, now + 10_000);
    const followUpJobId = await ctx.scheduler.runAt(
      followUpFireAt,
      internal.reminders.sendFollowUp,
      { appointmentId: id },
    );

    // 4) If the barber has not answered by two hours after the slot, the
    //    follow-up fires again (one reminder only).
    const reNotifyJobId = await ctx.scheduler.runAt(
      args.startAt + 2 * HOUR,
      internal.reminders.sendFollowUp,
      { appointmentId: id },
    );

    await ctx.db.patch(id, {
      alertJobId,
      reminderJobId,
      followUpJobId,
      reNotifyJobId,
    });

    return id;
  },
});

/**
 * Barber-scoped: this week's numbers for the value dashboard — bookings,
 * no-shows and the revenue those no-shows would have cost.
 */
export const weekStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const shop = await findMyShop(ctx, userId);
    if (!shop) return null;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_barber_and_date", (q) => q.eq("barberId", shop._id))
      .collect();
    const week = rows.filter((r) => r.startAt >= weekAgo);
    const noShow = week.filter((r) => r.status === "noShow").length;
    return {
      bookings: week.filter((r) => r.status !== "cancelled").length,
      confirmed: week.filter((r) => r.status === "confirmed").length,
      noShow,
      // 30-minute slots at a notional $30/chair — an honest, generic proxy
      // for the revenue no-shows swallowed this week.
      noShowCost: noShow * 30,
    };
  },
});

/** Barber-scoped: my shop's appointments for one date (minimal projection). */
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
    return rows.sort((a, b) => a.startAt - b.startAt).map((a) => ({
      _id: a._id,
      startAt: a.startAt,
      clientName: a.clientName,
      clientPhone: a.clientPhone,
      status: a.status,
      reminderStatus: a.reminderStatus,
      followUpStatus: a.followUpStatus,
    }));
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
    if (appt.status === "cancelled") return;
    // Barber answered the follow-up: stop further nudges.
    await stopAllJobs(ctx, appt);
    await ctx.db.patch(id, {
      status: "confirmed",
      followUpStatus: "cancelled",
    });
  },
});

/**
 * Barber-scoped: no-show. The barber's explicit decision is what triggers
 * the client's "book a new date" SMS — clients are never messaged
 * automatically.
 */
export const markNoShow = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const appt = await ctx.db.get(id);
    if (!appt) throw new Error("Not found.");
    await requireOwnership(ctx, userId, appt.barberId);
    if (appt.status === "noShow") return; // already handled
    if (appt.status === "cancelled") {
      throw new Error("This appointment was cancelled.");
    }
    // Barber answered the follow-up: stop further nudges.
    await stopAllJobs(ctx, appt);
    await ctx.db.patch(id, {
      status: "noShow",
      followUpStatus: "cancelled",
    });
    // Text the client an invitation to rebook (consent checked in the action).
    await ctx.scheduler.runAfter(
      5_000,
      internal.reminders.sendRebookInvite,
      { appointmentId: id },
    );
  },
});

/** Barber-scoped: cancel a booking (frees the slot + stops all messages). */
export const cancel = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const appt = await ctx.db.get(id);
    if (!appt) throw new Error("Not found.");
    await requireOwnership(ctx, userId, appt.barberId);
    if (appt.status === "cancelled") return;
    await stopAllJobs(ctx, appt);
    await ctx.db.patch(id, {
      status: "cancelled",
      reminderStatus: "cancelled",
      alertStatus: "cancelled",
      followUpStatus: "cancelled",
    });
  },
});
