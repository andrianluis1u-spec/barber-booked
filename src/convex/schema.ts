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

      // Password auth (Convex Auth Credentials provider). Only the bcrypt
      // hash is stored — never the plain-text password.
      passwordHash: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Shops (one per barber). `slug` powers the unique public booking link
    // (/b/<slug>) and is unique.
    barbers: defineTable({
      ownerUserId: v.id("users"),
      shopName: v.string(),
      city: v.string(),
      slug: v.string(),
      // The barber's own mobile number — used for new-booking alerts and
      // the post-appointment follow-up. Required at onboarding.
      ownerPhone: v.string(),
      // The barber's UTC offset at onboarding time (getTimezoneOffset(), in
      // minutes), so barber-facing SMS show the appointment in the shop's
      // local clock time.
      ownerUtcOffset: v.optional(v.number()),
      // Public origin of the booking app (captured at onboarding), used to
      // build links inside SMS messages.
      bookingBaseUrl: v.string(),
      // ── Optional public profile (shown on the barber's /b/<slug> page).
      // logoStorageId points at a logo image in Convex file storage.
      logoStorageId: v.optional(v.id("_storage")),
      // Short brand line under the shop name, e.g. "Classic cuts since 2009".
      tagline: v.optional(v.string()),
      about: v.optional(v.string()),
      address: v.optional(v.string()),
      mapsUrl: v.optional(v.string()),
      publicPhone: v.optional(v.string()),
      instagramUrl: v.optional(v.string()),
      // ── Page & booking customisation (all optional, barber-controlled).
      // Accent color for the public booking page, as a hex string like
      // "#1F4235". Falls back to the platform default when unset.
      accentColor: v.optional(v.string()),
      // Slot length in minutes (15/30/45/60). Default 30.
      slotMinutes: v.optional(v.number()),
      // Opening hours in shop-local minutes-from-midnight. Default 9–20.
      openHour: v.optional(v.number()),
      closeHour: v.optional(v.number()),
      // Closed weekdays, 0=Sunday … 6=Saturday.
      closedWeekdays: v.optional(v.array(v.number())),
      // How far ahead clients can book, in days (7/14/30/60). Default 14.
      bookingWindowDays: v.optional(v.number()),
    }).index("by_slug", ["slug"]).index("by_owner", ["ownerUserId"]),

    // Bookings created by clients from a barber's unique booking link.
    // `dateKey` is a local calendar date like "2026-09-24" so slots can be
    // grouped per day, and `startAt` is the slot start as an epoch-ms number.
    appointments: defineTable({
      barberId: v.id("barbers"),
      dateKey: v.string(), // local calendar date, e.g. "2026-09-24"
      startAt: v.number(), // slot start (epoch ms)
      endAt: v.number(), // slot end (epoch ms)
      clientName: v.string(),
      clientPhone: v.string(), // phone number is the essential piece
      // Epoch ms of the client's explicit SMS consent at booking time.
      // Presence means consent was given; the booking form requires it.
      smsConsentAt: v.optional(v.number()),
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
      // New-booking alert to the BARBER, sent immediately after a client
      // books: name, phone, date and time.
      alertJobId: v.optional(v.id("_scheduled_functions")),
      alertStatus: v.optional(
        v.union(
          v.literal("scheduled"),
          v.literal("sending"),
          v.literal("sent"),
          v.literal("failed"),
          v.literal("cancelled"),
        ),
      ),
      // Post-appointment follow-up to the BARBER (not the client): one text
      // one hour after the slot asking "Came or No-show", re-sent once at
      // two hours if unanswered. Client is never messaged automatically.
      followUpStatus: v.optional(
        v.union(
          v.literal("scheduled"),
          v.literal("sent"),
          v.literal("failed"),
          v.literal("cancelled"),
        ),
      ),
      followUpJobId: v.optional(v.id("_scheduled_functions")),
      reNotifyJobId: v.optional(v.id("_scheduled_functions")),
      // Secret token generated at booking time. Embedded in the client's
      // cancel link (1-hour reminder) and in the no-show rebook link. Lets a
      // client cancel/rebook without an account; verified server-side.
      cancelToken: v.optional(v.string()),
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
      .index("by_barber_and_date", ["barberId", "dateKey"])
      .index("by_status", ["status"])
      .index("by_reminder_status", ["reminderStatus"])
      .index("by_cancel_token", ["cancelToken"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
