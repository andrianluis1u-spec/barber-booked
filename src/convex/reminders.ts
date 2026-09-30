import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import axios from "axios";

/* ────────────────────────────────────────────────────────────────────────────
 * Notification hub — SMS (Twilio) + Email (Resend) fallbacks.
 *
 * Environment variables (Keys/API keys UI):
 *   DRY_RUN                — set to print messages to the console instead of
 *                            sending anything (SMS *and* email).
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER — SMS.
 *   RESEND_API_KEY         — email fallback so booking alerts and client
 *                            confirmations work before SMS is upgraded.
 *   RESEND_FROM_EMAIL      — optional "Booking Reminded <reminders@yourdomain>"
 *                            once a domain is verified in Resend; defaults to
 *                            Resend's test sender.
 *
 * Behaviour rules:
 *   • Client-facing texts end with "Reply STOP to opt out".
 *   • Replies (STOP/START) are handled by the HTTP webhook (http.ts) and
 *     stored in the smsOptOuts table; opted-out numbers never get texts.
 *   • Appointment times are always rendered in the SHOP's local time
 *     (client-facing messages use the client's offset captured at booking).
 * ──────────────────────────────────────────────────────────────────────────── */

function dryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** HH:MM for an epoch-ms time in a UTC offset (minutes behind UTC). */
function localClock(startAt: number, utcOffsetMin: number): string {
  const d = new Date(startAt - utcOffsetMin * 60_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

/** "Friday 9 October" for an epoch-ms time in a UTC offset. */
function localDay(startAt: number, utcOffsetMin: number): string {
  const d = new Date(startAt - utcOffsetMin * 60_000);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/* ── SMS (Twilio REST, no SDK) ───────────────────────────────────────────── */

/**
 * Send one SMS via Twilio. When DRY_RUN is on, print instead. Never throws;
 * failures are logged and reported through the return value.
 */
async function sendText(
  to: string,
  body: string,
): Promise<"sent" | "dry" | "error"> {
  if (dryRun()) {
    console.log(`\n[DRY_RUN] SMS (not sent)\n  To:   ${to}\n  Body: ${body}\n`);
    return "dry";
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.error("[SMS] Twilio credentials missing — skipping send.");
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

/* ── Email (Resend REST, no SDK) ─────────────────────────────────────────── */

/**
 * Send one transactional email via Resend. Works without Twilio, so booking
 * alerts and client confirmations arrive even before SMS is set up. Never
 * throws; returns a status like sendText.
 */
async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<"sent" | "dry" | "error" | "disabled"> {
  if (dryRun()) {
    console.log(
      `\n[DRY_RUN] EMAIL (not sent)\n  To:      ${to}\n  Subject: ${subject}\n  Body:    ${text}\n`,
    );
    return "dry";
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "disabled";
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Booking Reminded <onboarding@resend.dev>";
  try {
    await axios.post(
      "https://api.resend.com/emails",
      { from, to: [to], subject, text },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      },
    );
    return "sent";
  } catch (err) {
    console.error(
      "[EMAIL] Resend send failed:",
      err instanceof Error ? err.message : String(err),
    );
    return "error";
  }
}

/* ── Message bodies ──────────────────────────────────────────────────────── */

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
    `Manage it in your Booking Reminded dashboard.`
  );
}

function barberFollowUpBody(
  clientName: string,
  day: string,
  clock: string,
): string {
  return (
    `${clientName} (${day} at ${clock}) — did they come? ` +
    `Answer in your Booking Reminded dashboard.`
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

/** HTML-escape a string for email bodies. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clientConfirmationEmail(opts: {
  shopName: string;
  clientName: string;
  day: string;
  clock: string;
  cancelUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = `Appointment confirmed — ${opts.shopName}`;
  const lines = [
    `Hi ${opts.clientName},`,
    ``,
    `Your appointment at ${opts.shopName} is booked.`,
    ``,
    `When:  ${opts.day} at ${opts.clock}`,
    `Where: ${opts.shopName}`,
    ``,
    `Plans changed? Cancel here and the time frees up for someone else:`,
    opts.cancelUrl,
    ``,
    `See you soon!`,
    `— ${opts.shopName}, powered by Booking Reminded`,
  ];
  const text = lines.join("\n");
  const html = `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 4px;font-size:20px">Appointment confirmed</h2>
  <p style="margin:0 0 16px;color:#666;font-size:14px">${esc(opts.shopName)}</p>
  <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#f9fafb">
    <p style="margin:0;font-size:14px;color:#666">When</p>
    <p style="margin:0 0 12px;font-size:16px;font-weight:600">${esc(opts.day)} at ${esc(opts.clock)}</p>
    <p style="margin:0;font-size:14px;color:#666">Who</p>
    <p style="margin:0;font-size:16px;font-weight:600">${esc(opts.clientName)}</p>
  </div>
  <p style="margin:16px 0 8px;font-size:14px">Plans changed?</p>
  <a href="${esc(opts.cancelUrl)}" style="display:inline-block;background:#1F4235;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:600">Cancel my appointment</a>
  <p style="margin:20px 0 0;color:#999;font-size:12px">— ${esc(opts.shopName)}, powered by Booking Reminded</p>
</div>`;
  return { subject, text, html };
}

function barberAlertEmail(opts: {
  clientName: string;
  clientPhone: string;
  day: string;
  clock: string;
  dashboardUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = `New booking — ${opts.clientName}, ${opts.day} ${opts.clock}`;
  const lines = [
    `New booking at your shop:`,
    ``,
    `Client: ${opts.clientName} (${opts.clientPhone})`,
    `When:   ${opts.day} at ${opts.clock}`,
    ``,
    `Manage it here: ${opts.dashboardUrl}`,
  ];
  const text = lines.join("\n");
  const html = `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 16px;font-size:20px">New booking 🎉</h2>
  <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#f9fafb">
    <p style="margin:0 0 4px;font-size:16px;font-weight:600">${esc(opts.clientName)}</p>
    <p style="margin:0 0 12px;font-size:14px;color:#666">${esc(opts.clientPhone)}</p>
    <p style="margin:0;font-size:14px;color:#666">When</p>
    <p style="margin:0;font-size:16px;font-weight:600">${esc(opts.day)} at ${esc(opts.clock)}</p>
  </div>
  <a href="${esc(opts.dashboardUrl)}" style="display:inline-block;margin-top:16px;background:#1F4235;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:600">Open dashboard</a>
</div>`;
  return { subject, text, html };
}

/* ── Scheduled jobs ──────────────────────────────────────────────────── */

/**
 * Client reminder, scheduled one hour before the appointment (with cancel
 * link). SMS when consented and not opted out; email fallback otherwise.
 * Best-effort: never throws.
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

    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    const shopName = shop?.shopName ?? "your barbershop";
    const base = shop?.bookingBaseUrl ?? "";
    const cancelUrl = appt.cancelToken ? `${base}/c/${appt.cancelToken}` : "";
    const day = localDay(
      appt.startAt,
      appt.clientUtcOffset ?? shop?.ownerUtcOffset ?? 0,
    );
    const clock = localClock(
      appt.startAt,
      appt.clientUtcOffset ?? shop?.ownerUtcOffset ?? 0,
    );

    let smsOk = false;
    if (appt.smsConsentAt) {
      const optedOut = await ctx.runQuery(internal.reminders.isOptedOut, {
        phone: appt.clientPhone,
        barberId: appt.barberId,
      });
      if (!optedOut) {
        const result = await sendText(
          appt.clientPhone,
          clientReminderBody(shopName, appt.clientName, day, clock, cancelUrl),
        );
        smsOk = result === "sent" || result === "dry";
      }
    }
    // Email fallback (also fires when SMS is off/failed) — but never email
    // a client who has opted out.
    if (!smsOk) {
      const clientEmail = await ctx.runQuery(
        internal.reminders.getClientEmail,
        { phone: appt.clientPhone, barberId: appt.barberId },
      );
      if (clientEmail && !(await ctx.runQuery(internal.reminders.isOptedOut, { phone: appt.clientPhone, barberId: appt.barberId }))) {
        await sendEmail(
          clientEmail,
          clientConfirmationEmail({
            shopName,
            clientName: appt.clientName,
            day,
            clock,
            cancelUrl,
          }).subject,
          clientReminderBody(shopName, appt.clientName, day, clock, cancelUrl),
        );
      }
    }
    await ctx.runMutation(internal.reminders.markReminderSent, {
      id: appointmentId,
    });
  },
});

/**
 * New-booking alert to the barber: SMS to ownerPhone when possible, plus an
 * email fallback so the alert always arrives. Best-effort, never throws.
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
    if (!shop) return;

    const day = localDay(appt.startAt, shop.ownerUtcOffset ?? 0);
    const clock = localClock(appt.startAt, shop.ownerUtcOffset ?? 0);
    let delivered = false;

    if (shop.ownerPhone) {
      const result = await sendText(
        shop.ownerPhone,
        barberNewBookingBody(appt.clientName, appt.clientPhone, day, clock),
      );
      delivered = result === "sent" || result === "dry";
    }
    if (!delivered) {
      const ownerEmail = await ctx.runQuery(internal.reminders.getOwnerEmail, {
        barberId: shop._id,
      });
      if (ownerEmail) {
        const mail = barberAlertEmail({
          clientName: appt.clientName,
          clientPhone: appt.clientPhone,
          day,
          clock,
          dashboardUrl: `${shop.bookingBaseUrl}/dashboard`,
        });
        await sendEmail(ownerEmail, mail.subject, mail.text);
      }
    }
    await ctx.runMutation(internal.reminders.setAlertStatus, {
      id: appointmentId,
      status: "sent",
    });
  },
});

/**
 * Post-appointment follow-up to the BARBER (SMS + email fallback), one hour
 * after the slot; re-sent once at two hours via the reNotify job. The
 * client is never messaged here.
 */
export const sendFollowUp = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt) return;
    if (appt.status === "cancelled" || appt.followUpStatus === "cancelled") {
      return;
    }
    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    if (!shop) return;

    const day = localDay(appt.startAt, shop.ownerUtcOffset ?? 0);
    const clock = localClock(appt.startAt, shop.ownerUtcOffset ?? 0);
    let delivered = false;
    if (shop.ownerPhone) {
      const result = await sendText(
        shop.ownerPhone,
        barberFollowUpBody(appt.clientName, day, clock),
      );
      delivered = result === "sent" || result === "dry";
    }
    if (!delivered) {
      const ownerEmail = await ctx.runQuery(internal.reminders.getOwnerEmail, {
        barberId: shop._id,
      });
      if (ownerEmail) {
        const mail = barberAlertEmail({
          clientName: appt.clientName,
          clientPhone: appt.clientPhone,
          day,
          clock,
          dashboardUrl: `${shop.bookingBaseUrl}/dashboard`,
        });
        await sendEmail(
          ownerEmail,
          `Did ${appt.clientName} come? — answer needed`,
          mail.text,
        );
      }
    }
    await ctx.runMutation(internal.reminders.setFollowUpStatus, {
      id: appointmentId,
      status: "sent",
    });
  },
});

/**
 * No-show rebook invitation to the CLIENT — fired only by the barber's
 * explicit "No-show" action. SMS with email fallback, opt-out respected.
 */
export const sendRebookInvite = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt || appt.status !== "noShow") return;

    const shop = await ctx.runQuery(internal.reminders.getShop, {
      id: appt.barberId,
    });
    if (!shop) return;
    const rebookUrl = appt.cancelToken
      ? `${shop.bookingBaseUrl}/b/${shop.slug}?rebook=${appt.cancelToken}`
      : "";
    const optedOut = appt.smsConsentAt
      ? await ctx.runQuery(internal.reminders.isOptedOut, {
          phone: appt.clientPhone,
          barberId: appt.barberId,
        })
      : true;

    if (appt.smsConsentAt && !optedOut) {
      await sendText(
        appt.clientPhone,
        clientRebookBody(shop.shopName, appt.clientName, rebookUrl),
      );
      return;
    }
    const clientEmail = await ctx.runQuery(internal.reminders.getClientEmail, {
      phone: appt.clientPhone,
      barberId: appt.barberId,
    });
    if (clientEmail) {
      await sendEmail(
        clientEmail,
        `Book a new date — ${shop.shopName}`,
        clientRebookBody(shop.shopName, appt.clientName, rebookUrl),
      );
    }
  },
});

/* ── Shared internals ────────────────────────────────────────────────── */

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

/** Internal: owner's account email (email fallback recipient). */
export const getOwnerEmail = internalQuery({
  args: { barberId: v.id("barbers") },
  handler: async (ctx, { barberId }) => {
    const shop = await ctx.db.get(barberId);
    if (!shop) return null;
    const user = await ctx.db.get(shop.ownerUserId);
    return user?.email ?? null;
  },
});

/** Internal: find a past client's email by phone at this shop. */
export const getClientEmail = internalQuery({
  args: { phone: v.string(), barberId: v.id("barbers") },
  handler: async (ctx, { phone, barberId }) => {
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_barber_and_date", (q) => q.eq("barberId", barberId))
      .collect();
    const match = rows.find((r) => r.clientPhone === phone && r.clientEmail);
    return match?.clientEmail ?? null;
  },
});

/** Internal: is this phone opted out of client texts at this shop? */
export const isOptedOut = internalQuery({
  args: { phone: v.string(), barberId: v.id("barbers") },
  handler: async (ctx, { phone, barberId }) => {
    const row = await ctx.db
      .query("smsOptOuts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    return row?.barberId === barberId;
  },
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

/* ── Public: cancel via secret token (link inside the reminder) ─────── */

/**
 * Client self-cancellation from the reminder link. The token is a secret
 * generated at booking time; only pending appointments can be cancelled.
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

    await cancelScheduledJobs(ctx.scheduler, [
      appt.reminderJobId,
      appt.followUpJobId,
      appt.reNotifyJobId,
    ]);
    await ctx.db.patch(appt._id, {
      status: "cancelled",
      reminderStatus: "cancelled",
      alertStatus: "cancelled",
      followUpStatus: "cancelled",
    });
  },
});

/**
 * Cancel a booking's scheduled jobs, tolerating already-fired jobs.
 */
async function cancelScheduledJobs(
  scheduler: { cancel: (id: any) => Promise<void> },
  jobs: Array<Id<"_scheduled_functions"> | undefined>,
) {
  for (const jobId of jobs) {
    if (jobId) {
      try {
        await scheduler.cancel(jobId);
      } catch {
        // Already fired or completed — nothing to cancel.
      }
    }
  }
}
