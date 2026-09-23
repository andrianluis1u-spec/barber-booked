import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Bookings created by clients from the public booking flow.
    // Single-barber shop for v1, so there is no barberId here.
    // `dateKey` is a local calendar date like "2026-09-24" so slots can be
    // grouped per day, and `startAt` is the slot start as an epoch-ms number.
    appointments: defineTable({
      dateKey: v.string(), // local calendar date, e.g. "2026-09-24"
      startAt: v.number(), // slot start (epoch ms)
      endAt: v.number(), // slot end (epoch ms)
      clientName: v.string(),
      clientPhone: v.string(), // phone number is the essential piece
      serviceName: v.string(),
      notes: v.optional(v.string()),
      // Client's UTC offset at booking time (getTimezoneOffset(), in minutes),
      // so reminder messages can show the appointment time in local clock time.
      clientUtcOffset: v.optional(v.number()),
      // Reminder lifecycle: scheduled -> sending -> sent | failed,
      // or cancelled when the appointment itself is cancelled.
      reminderStatus: v.optional(
        v.union(
          v.literal("scheduled"),
          v.literal("sending"),
          v.literal("sent"),
          v.literal("failed"),
          v.literal("cancelled"),
        ),
      ),
      reminderSentAt: v.optional(v.number()),
      // Convex scheduled-function job id, so a cancelled appointment can stop
      // its reminder before it fires.
      reminderJobId: v.optional(v.id("_scheduled_functions")),
      // pending  -> waiting for the barber to decide
      // confirmed -> barber confirmed the client showed up
      // noShow    -> barber marked the client as a no-show
      // cancelled -> client cancelled (kept for the audit trail)
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("noShow"),
        v.literal("cancelled"),
      ),
    })
      .index("by_date", ["dateKey"])
      .index("by_status", ["status"])
      .index("by_reminder_status", ["reminderStatus"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
