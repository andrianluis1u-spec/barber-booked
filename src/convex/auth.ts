import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "./auth/password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
