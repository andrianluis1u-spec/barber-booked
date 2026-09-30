import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import axios from "axios";

/* ────────────────────────────────────────────────────────────────────────────
 * SMS hub.
 *
 * Every text the platform sends goes through `sendText` below. Behaviour is
 * controlled by two environment variables (Keys/API keys UI):
 *
 *   DRY_RUN  — when set ("1"/"true"), messages are printed to the console
 *              instead of being sent. Useful for testing the whole flow
 *              without Twilio keys or a verified phone number.
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER — real
 *              sending when DRY_RUN is off.
 *
 * Client-facing texts always end with "Reply STOP to opt out".
 * ──────────────────────────────────────────────────────────────────────────── */

function dryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Format an epoch-ms time in a UTC offset (minutes behind UTC) as HH:MM. */
function localClock(startAt: number, utcOffsetMin: number): string {
  const d = new Date(startAt - utcOffsetMin * 60_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

/** Format an epoch-ms date in a UTC offset as "Friday 9 October". */
function localDay(startAt: number, utcOffsetMin: number): string {
  const d = new Date(startAt - utcOffsetMin * 60_000);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * Send one SMS via Twilio's REST API (no SDK). When DRY_RUN is on, the
 * message is printed to the console instead. Never throws: failures are
 * logged and reported through the return value.
 */
async function sendText(to: string, body: string): Promise<"sent" | "dry" | "error"> {
  if (dryRun()) {
    console.log(
      `\n[DRY_RUN] SMS (not sent)\n  To:   ${to}\n  Body: ${body}\n`,
    );
    return "dry";
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.error(
      "[SMS] Twilio credentials missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) — set them or enable DRY_RUN.",
    );
    return "error";
  }

  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({ To: to, From: fromNumber, Body: body }),
      {
        auth: { username: accountSid, password: authToken },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10_000,
      },
    );
    return "sent";
  } catch (err) {
    console.error(
      "[SMS] Twilio send failed:",
      err instanceof Error ? err.message : String(err),
    );
    return "error";
  }
}

/** Message bodies. Client texts end with the STOP footer. */
const STOP = "Reply STOP to opt out.";

function clientReminderBody(
  shopName: string,
  name: string,
  day: string,
  clock: string,
  cancelUrl: string,
): string {
  return (
    `Hi ${name}, a reminder from ${shopName}: your appointment is on ` +
    `${day} at ${clock}. Need to cancel? ${cancelUrl} ` +
    `See you soon! ${STOP}`
  );
}

function barberNewBookingBody(
  clientName: string,
  clientPhone: string,
  day: string,
  clock: string,
): string {
  return (
    `New booking: ${clientName} (${clientPhone}) — ${day} at ${clock}. ` +
    `Manage it in your Barber Booked dashboard.`
  );
}

function barberFollowUpBody(
  clientName: string,
  day: string,
  clock: string,
): string {
  return (
    `${clientName} (${day} at ${clock}) — did they come? ` +
    `Answer in your Barber Booked dashboard.`
  );
}

function clientRebookBody(
  shopName: string,
  name: string,
  rebookUrl: string,
): string {
  return (
    `Hi ${name}, ${shopName} missed you today. ` +
    `Book a new date here: ${rebookUrl}. ${STOP}`
  );
}

/* ── Scheduled jobs ──────────────────────────────────────────────────────── */

/**
 * Client reminder, scheduled one hour before the appointment (or
 * immediately when booked inside the final hour). Includes a cancel link
 * that frees the slot. Best-effort: never throws, so a failed text does not
 * spin up Convex retries.
 */
export const sendReminder = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt) return;
    if (
      appt.status === "cancelled" ||
      appt.reminderStatus === "cancelled" ||
      appt.reminderStatus === "sent"
    ) {
      return;
    }

    // Respect the client's SMS consent: no consent, no client messages.
    if (!appt.smsConsentAt) {
      await ctx.runMutation(internal.reminders.setReminderStatus, {
        id: appointmentId,
        status: "cancelled",
      });
      return;
    }

    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    const shopName = shop?.shopName ?? "your barbershop";
    const base = shop?.bookingBaseUrl ?? "";
    const cancelUrl = appt.cancelToken
      ? `${base}/c/${appt.cancelToken}`
      : "";
    const body = clientReminderBody(
      shopName,
      appt.clientName,
      localDay(appt.startAt, appt.clientUtcOffset ?? 0),
      localClock(appt.startAt, appt.clientUtcOffset ?? 0),
      cancelUrl,
    );

    const result = await sendText(appt.clientPhone, body);
    if (result === "error") {
      await ctx.runMutation(internal.reminders.setReminderStatus, {
        id: appointmentId,
        status: "failed",
      });
      return;
    }
    await ctx.runMutation(internal.reminders.markReminderSent, {
      id: appointmentId,
    });
  },
});

/**
 * New-booking alert to the barber, scheduled right after the booking is
 * created. Best-effort, never throws.
 */
export const sendNewBookingAlert = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt) return;
    if (
      appt.status === "cancelled" ||
      appt.alertStatus === "sent" ||
      appt.alertStatus === "cancelled"
    ) {
      return;
    }

    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    if (!shop?.ownerPhone) {
      await ctx.runMutation(internal.reminders.setAlertStatus, {
        id: appointmentId,
        status: "cancelled",
      });
      return;
    }

    const body = barberNewBookingBody(
      appt.clientName,
      appt.clientPhone,
      localDay(appt.startAt, shop.ownerUtcOffset ?? 0),
      localClock(appt.startAt, shop.ownerUtcOffset ?? 0),
    );
    const result = await sendText(shop.ownerPhone, body);
    if (result === "error") {
      await ctx.runMutation(internal.reminders.setAlertStatus, {
        id: appointmentId,
        status: "failed",
      });
      return;
    }
    await ctx.runMutation(internal.reminders.setAlertStatus, {
      id: appointmentId,
      status: "sent",
    });
  },
});

/**
 * Post-appointment follow-up to the BARBER, scheduled one hour after the
 * slot: "Came or No-show?". Re-sent once two hours after the slot if the
 * barber has not answered (both texts fire from this one action via the
 * reNotify job). The client is never messaged here — the barber decides.
 */
export const sendFollowUp = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt) return;
    if (appt.status === "cancelled") return;
    // Barber already decided (dashboard tap or a previous re-notify fired
    // after they confirmed). Nothing to do.
    if (appt.followUpStatus === "cancelled") {
      return;
    }

    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    if (!shop?.ownerPhone) return;

    const body = barberFollowUpBody(
      appt.clientName,
      localDay(appt.startAt, shop.ownerUtcOffset ?? 0),
      localClock(appt.startAt, shop.ownerUtcOffset ?? 0),
    );
    const result = await sendText(shop.ownerPhone, body);
    if (result === "error") {
      await ctx.runMutation(internal.reminders.setFollowUpStatus, {
        id: appointmentId,
        status: "failed",
      });
      return;
    }
    await ctx.runMutation(internal.reminders.setFollowUpStatus, {
      id: appointmentId,
      status: "sent",
    });
  },
});

/**
 * No-show rebook invitation to the CLIENT, fired by the barber's explicit
 * "No-show" action only. The client is never messaged automatically.
 */
export const sendRebookInvite = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt || appt.status !== "noShow") return;
    if (!appt.smsConsentAt) return; // consent required for any client text

    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    if (!shop) return;
    const rebookUrl = appt.cancelToken
      ? `${shop.bookingBaseUrl}/b/${shop.slug}?rebook=${appt.cancelToken}`
      : "";
    const body = clientRebookBody(
      shop.shopName,
      appt.clientName,
      rebookUrl,
    );
    await sendText(appt.clientPhone, body);
  },
});

/* ── Shared internals ────────────────────────────────────────────────────── */

/** Internal query used by the actions to fetch the appointment. */
export const getAppointment = internalQuery({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/** Internal query used by the actions to fetch the shop. */
export const getShop = internalQuery({
  args: { id: v.id("barbers") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/** Internal: set the client-reminder status. */
export const setReminderStatus = internalMutation({
  args: {
    id: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { reminderStatus: status });
  },
});

/** Internal: set the new-booking alert status. */
export const setAlertStatus = internalMutation({
  args: {
    id: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { alertStatus: status });
  },
});

/** Internal: record a successful client reminder. */
export const markReminderSent = internalMutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      reminderStatus: "sent",
      reminderSentAt: Date.now(),
    });
  },
});

/** Internal: set the follow-up status (barber answered → "cancelled"). */
export const setFollowUpStatus = internalMutation({
  args: {
    id: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { followUpStatus: status });
  },
});

/* ── Public: cancel via secret token (link inside the reminder SMS) ─────── */

/**
 * Client self-cancellation from the reminder link. The token is a secret
 * generated at booking time; only appointments still pending can be
 * cancelled here.
 */
export const cancelByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) throw new Error("Invalid cancellation link.");
    const appt = await ctx.db
      .query("appointments")
      .withIndex("by_cancel_token", (q) => q.eq("cancelToken", token))
      .unique();
    if (!appt) throw new Error("This cancellation link is no longer valid.");
    if (appt.status === "cancelled") return; // already done — idempotent
    if (appt.status !== "pending") {
      throw new Error(
        "This appointment can no longer be cancelled online. Please contact the shop.",
      );
    }

    await cancelScheduledJobs(ctx, appt);
    await ctx.db.patch(appt._id, {
      status: "cancelled",
      reminderStatus: "cancelled",
      alertStatus: "cancelled",
      followUpStatus: "cancelled",
    });
  },
});

/** Cancel a booking's scheduled jobs, tolerating already-fired jobs. */
async function cancelScheduledJobs(
  ctx: { scheduler: { cancel: (id: unknown) => Promise<void> } },
  appt: {
    reminderJobId?: unknown;
    followUpJobId?: unknown;
    reNotifyJobId?: unknown;
  },
) {
  for (const jobId of [appt.reminderJobId, appt.followUpJobId, appt.reNotifyJobId]) {
    if (jobId) {
      try {
        await ctx.scheduler.cancel(jobId);
      } catch {
        // Already fired or completed — nothing to cancel.
      }
    }
  }
}
