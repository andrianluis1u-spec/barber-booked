import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Public: look up a shop by its unique slug (used by /b/<slug>). */
export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query("barbers")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/** Public: all shops (landing page directory). */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("barbers").collect();
    return rows.sort((a, b) => a.shopName.localeCompare(b.shopName));
  },
});

/** Public: check whether a slug is free during shop setup. */
export const slugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("barbers")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return existing === null;
  },
});

/** Signed-in barber: get or create my shop profile. */
export const myShop = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return ctx.db
      .query("barbers")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .unique();
  },
});

/**
 * Public: resolve a stored logo image into a URL the client can load.
 * Uses an internal action-style URL via getFileUrl equivalent — Convex file
 * storage URLs need an action, so we expose the storage id and let the
 * client fetch through the `logoUrl` query below.
 */
export const logoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Signed-in barber: update the optional public profile shown on the
 * booking page. Ownership enforced via the signed-in user's shop.
 */
export const updateProfile = mutation({
  args: {
    tagline: v.optional(v.string()),
    about: v.optional(v.string()),
    address: v.optional(v.string()),
    mapsUrl: v.optional(v.string()),
    publicPhone: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const shop = await ctx.db
      .query("barbers")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .unique();
    if (!shop) throw new Error("Create your shop profile first.");

    const patch: Record<string, unknown> = {};
    const clamp = (s: string | undefined, max: number) => {
      const t = s?.trim();
      return t ? t.slice(0, max) : undefined;
    };
    const tagline = clamp(args.tagline, 90);
    if (args.tagline !== undefined) patch.tagline = tagline;
    const about = clamp(args.about, 600);
    if (args.about !== undefined) patch.about = about;
    const address = clamp(args.address, 160);
    if (args.address !== undefined) patch.address = address;
    const mapsUrl = clamp(args.mapsUrl, 400);
    if (args.mapsUrl !== undefined) patch.mapsUrl = mapsUrl;
    const publicPhone = clamp(args.publicPhone, 24);
    if (args.publicPhone !== undefined) {
      if (publicPhone && !/^\+?[\d\s-]{7,20}$/.test(publicPhone)) {
        throw new Error("Please enter a valid public phone number.");
      }
      patch.publicPhone = publicPhone;
    }
    const instagramUrl = clamp(args.instagramUrl, 200);
    if (args.instagramUrl !== undefined) {
      if (instagramUrl && !/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(instagramUrl)) {
        throw new Error("Instagram link must point to instagram.com.");
      }
      // Normalize to a full URL for the anchor on the public page.
      patch.instagramUrl = instagramUrl
        ? instagramUrl.startsWith("http")
          ? instagramUrl
          : `https://${instagramUrl}`
        : undefined;
    }
    if (args.logoStorageId !== undefined) {
      // Replace or remove: clean up the previous logo file so storage does
      // not fill with orphans.
      if (
        shop.logoStorageId &&
        shop.logoStorageId !== (args.logoStorageId ?? undefined)
      ) {
        await ctx.storage.delete(shop.logoStorageId);
      }
      patch.logoStorageId = args.logoStorageId ?? undefined;
    }

    await ctx.db.patch(shop._id, patch);
  },
});

/**
 * Signed-in barber: update page & booking customisation for the public
 * booking page — accent color, slot length, opening hours, closed days and
 * how far ahead clients can book.
 */
export const updateBookingSettings = mutation({
  args: {
    accentColor: v.optional(v.union(v.string(), v.null())),
    slotMinutes: v.optional(v.number()),
    openHour: v.optional(v.number()),
    closeHour: v.optional(v.number()),
    closedWeekdays: v.optional(v.array(v.number())),
    bookingWindowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    const shop = await ctx.db
      .query("barbers")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .unique();
    if (!shop) throw new Error("Create your shop profile first.");

    const patch: Record<string, unknown> = {};

    if (args.accentColor !== undefined) {
      let accent: string | undefined;
      if (args.accentColor) {
        const m = /^#?([0-9a-fA-F]{6})$/.exec(args.accentColor.trim());
        if (!m) throw new Error("Accent color must be a hex color like #1F4235.");
        accent = `#${m[1].toUpperCase()}`;
      }
      patch.accentColor = accent; // null/empty resets to platform default
    }

    if (args.slotMinutes !== undefined) {
      if (![15, 30, 45, 60].includes(args.slotMinutes)) {
        throw new Error("Slot length must be 15, 30, 45 or 60 minutes.");
      }
      patch.slotMinutes = args.slotMinutes;
    }

    if (args.openHour !== undefined) {
      if (!Number.isInteger(args.openHour) || args.openHour < 0 || args.openHour > 23) {
        throw new Error("Opening hour must be between 0 and 23.");
      }
      patch.openHour = args.openHour;
    }

    if (args.closeHour !== undefined) {
      if (!Number.isInteger(args.closeHour) || args.closeHour < 1 || args.closeHour > 24) {
        throw new Error("Closing hour must be between 1 and 24.");
      }
      patch.closeHour = args.closeHour;
    }

    if (args.closedWeekdays !== undefined) {
      const days = [...new Set(args.closedWeekdays)];
      if (
        days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
        days.length >= 7
      ) {
        throw new Error("Pick at least one open day (closed days must be 0–6)."
        );
      }
      patch.closedWeekdays = days.sort((a, b) => a - b);
    }
    
    if (args.bookingWindowDays !== undefined) {
      if (![7, 14, 30, 60].includes(args.bookingWindowDays)) {
        throw new Error("Booking window must be 7, 14, 30 or 60 days.");
      }
      patch.bookingWindowDays = args.bookingWindowDays;
    }

    // Cross-check: opening hour must be before closing hour.
    const openHour = (patch.openHour as number | undefined) ?? shop.openHour;
    const closeHour = (patch.closeHour as number | undefined) ?? shop.closeHour;
    if (openHour !== undefined && closeHour !== undefined && openHour >= closeHour) {
      throw new Error("Opening hour must be before closing hour.");
    }

    await ctx.db.patch(shop._id, patch);
  },
});

/**
 * Signed-in barber: create my shop with a unique link slug. The barber's
 * own mobile number is required — it receives the new-booking alerts and
 * the post-appointment follow-ups.
 */
export const createShop = mutation({
  args: {
    shopName: v.string(),
    city: v.string(),
    slug: v.string(),
    ownerPhone: v.string(),
    ownerUtcOffset: v.number(),
    bookingBaseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");

    const existing = await ctx.db
      .query("barbers")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .unique();
    if (existing) throw new Error("You already have a shop profile.");

    const shopName = args.shopName.trim();
    if (shopName.length < 2) {
      throw new Error("Please enter your shop name.");
    }
    const city = args.city.trim();
    if (city.length < 2) {
      throw new Error("Please enter your city or area.");
    }

    const slug = slugify(args.slug);
    if (slug.length < 3) {
      throw new Error("Your link name must be at least 3 characters.");
    }

    const taken = await ctx.db
      .query("barbers")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (taken) throw new Error("That link is already taken — try another.");

    const ownerPhone = args.ownerPhone.trim();
    if (!/^\+?[1-9]\d{7,14}$/.test(ownerPhone)) {
      throw new Error("Please enter a valid phone number, e.g. +15550102030.");
    }

    // Only ever store an origin, so SMS links cannot be poisoned.
    let bookingBaseUrl = "/";
    try {
      const url = new URL(args.bookingBaseUrl);
      bookingBaseUrl = url.origin;
    } catch {
      bookingBaseUrl = "/";
    }

    const id = await ctx.db.insert("barbers", {
      ownerUserId: userId,
      shopName,
      city,
      slug,
      ownerPhone,
      ownerUtcOffset: args.ownerUtcOffset,
      bookingBaseUrl,
    });
    return id;
  },
});
