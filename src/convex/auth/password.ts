import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { internal } from "../_generated/api";
import bcrypt from "bcryptjs";

/**
 * Email + password sign-in, powered by Convex Auth's ConvexCredentials
 * provider.
 *
 * - Passwords are hashed with bcrypt (cost 12) and only the hash is stored
 *   on the user document (`passwordHash`) — never the plain text.
 * - `flow: "signUp"` creates the account and logs the barber straight in —
 *   no email verification, no confirmation step, no magic links.
 * - `flow: "signIn"` verifies the password against the stored hash.
 *
 * The signed-in user's identity is available everywhere via getAuthUserId;
 * every barber-scoped query/mutation resolves ownership through that id.
 */
export const Password = ConvexCredentials({
  id: "password",
  // Explicit parameter/return annotations break a type-inference cycle:
  // the generated `internal` api type includes the auth config, which
  // includes this provider.
  authorize: async (
    params: Record<string, unknown>,
    ctx: {
      runQuery: (ref: any, args: any) => Promise<any>;
      runMutation: (ref: any, args: any) => Promise<any>;
    },
  ): Promise<{ userId: any } | null> => {
    const email = String(params.email ?? "").trim().toLowerCase();
    const password = String(params.password ?? "");
    const flow = String(params.flow ?? "signIn");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    // authorize runs as an action: DB access goes through internal
    // queries/mutations (see authHelpers.ts).
    const user = await ctx.runQuery(internal.authHelpers.getByEmail, {
      email,
    });

    if (flow === "signUp") {
      if (user?.passwordHash) {
        throw new Error(
          "An account with this email already exists. Sign in instead.",
        );
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = await ctx.runMutation(
        internal.authHelpers.upsertPasswordUser,
        { email, passwordHash, existingUserId: user?._id ?? null },
      );
      return { userId };
    }

    if (!user?.passwordHash) {
      throw new Error("Invalid email or password.");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new Error("Invalid email or password.");
    }
    return { userId: user._id };
  },
});
