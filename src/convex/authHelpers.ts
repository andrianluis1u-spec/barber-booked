import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal: fetch a user by email (used by the password provider's
 * authorize during sign-in and sign-up).
 */
export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
  },
});

/**
 * Internal: create the user on sign-up (or attach a password to an existing
 * row that never had one). Stores only the bcrypt hash.
 */
export const upsertPasswordUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    existingUserId: v.union(v.id("users"), v.null()),
  },
  handler: async (ctx, { email, passwordHash, existingUserId }) => {
    if (existingUserId) {
      await ctx.db.patch(existingUserId, { passwordHash });
      return existingUserId;
    }
    return ctx.db.insert("users", { email, passwordHash });
  },
});

/**
 * Public check used by the sign-up form to tell a barber immediately that
 * the email is already registered.
 */
export const emailInUse = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .unique();
    return user !== null;
  },
});

/** Internal: attach a display name to a freshly created user. */
export const setName = internalMutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;
    await ctx.db.patch(userId, { name });
  },
});
