import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import axios from "axios";
import { BARBER_NAME } from "../lib/booking";

/**
 * Sends the 1-hour reminder SMS to the client's phone number.
 *
 * Runs as a scheduled internal action, fired by `createBooking` exactly one
 * hour before the appointment (or immediately, if booking inside the final
 * hour). Twilio is called directly over its REST API, so no SDK is required.
 *
 * Requires these environment variables (set in the Keys/API keys UI):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */
export const sendReminder = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    // Fail loudly if keys are missing so the reminder is retried later.
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        "Twilio credentials are not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).",
      );
    }

    const appt = await ctx.runQuery(internal.reminders.getAppointment, {
      id: appointmentId,
    });
    if (!appt) return;

    // Only remind clients whose appointment is still happening.
    if (
      appt.status === "cancelled" ||
      appt.reminderStatus === "cancelled" ||
      appt.reminderStatus === "sent"
    ) {
      return;
    }

    // Guard against a duplicate reminder if this action somehow re-runs.
    const alreadyRunning = appt.reminderStatus === "sending";
    if (alreadyRunning) return;
    await ctx.runMutation(internal.reminders.markSending, {
      id: appointmentId,
    });

    // Compose the message body, localising the time using the offset captured
    // at booking time (minutes behind UTC, as returned by getTimezoneOffset).
    const offsetMin = appt.clientUtcOffset ?? 0;
    const localStart = new Date(appt.startAt - offsetMin * 60_000);
    const hh = String(localStart.getUTCHours()).padStart(2, "0");
    const mm = String(localStart.getUTCMinutes()).padStart(2, "0");
    const timeLabel = `${hh}:${mm}`;
    const dayLabel = localStart.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });

    const message =
      `Hi ${appt.clientName}, a reminder from ${BARBER_NAME}: ` +
      `your ${appt.serviceName} is coming up on ${dayLabel} at ${timeLabel}. ` +
      `See you soon!`;

    try {
      const res = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          To: appt.clientPhone,
          From: fromNumber,
          Body: message,
        }),
        {
          auth: { username: accountSid, password: authToken },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10_000,
        },
      );
      await ctx.runMutation(internal.reminders.markSent, {
        id: appointmentId,
      });
    } catch (err) {
      await ctx.runMutation(internal.reminders.markFailed, {
        id: appointmentId,
        errorText: err instanceof Error ? err.message : String(err),
      });
      // Re-throw so Convex schedules retries with backoff.
      throw err;
    }
  },
});

/** Internal query used by the action to fetch the appointment. */
export const getAppointment = internalQuery({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/** Internal mutation: mark the reminder as being sent. */
export const markSending = internalMutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { reminderStatus: "sending" });
  },
});

/** Internal mutation: record a successful send. */
export const markSent = internalMutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      reminderStatus: "sent",
      reminderSentAt: Date.now(),
    });
  },
});

/** Internal mutation: record a failed send (Convex will retry the action). */
export const markFailed = internalMutation({
  args: { id: v.id("appointments"), errorText: v.string() },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { reminderStatus: "failed" });
  },
});
