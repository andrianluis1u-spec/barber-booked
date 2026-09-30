import { Credentials } from "@convex-dev/auth/server";
import bcrypt from "bcryptjs";
import { v } from "convex/values";

/**
 * Email + password sign-in, powered by Convex Auth's Credentials provider.
 *
 * - Passwords are hashed with bcrypt (cost 12) and only the hash is stored.
 * - `flow: "signUp"` creates the account and logs the barber straight in —
 *   no email verification, no confirmation step, no magic links.
 * - `flow: "signIn"` verifies the password against the stored hash.
 *
 * The signed-in user's identity is available everywhere via getAuthUserId;
 * every barber-scoped query/mutation resolves ownership through the user id.
 */
export const Password = Credentials({
  id: "password",
  params: {
    email: v.string(),
    password: v.string(),
    flow: v.union(v.literal("signUp"), v.literal("signIn")),
  },
  authorize: async (ctx, params) => {
    const email = params.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }
    if (params.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (params.flow === "signUp") {
      if (user?.passwordHash) {
        throw new Error(
          "An account with this email already exists. Sign in instead.",
        );
      }
      const passwordHash = await bcrypt.hash(params.password, 12);
      // Reuse the row only if it never had a password; otherwise create one.
      const userId = user
        ? user._id
        : await ctx.db.insert("users", { email });
      await ctx.db.patch(userId, { passwordHash });
      return { userId };
    }

    if (!user?.passwordHash) {
      throw new Error("Invalid email or password.");
    }
    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) {
      throw new Error("Invalid email or password.");
    }
    return { userId: user._id };
  },
});
