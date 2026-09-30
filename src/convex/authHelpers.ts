import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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

/** Internal: attach a display name to the freshly created user. */
export const setName = internalMutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;
    await ctx.db.patch(userId, { name });
  },
});
