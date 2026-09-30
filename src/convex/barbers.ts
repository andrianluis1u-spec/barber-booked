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
