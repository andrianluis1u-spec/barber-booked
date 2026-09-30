import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";

/**
 * Signed-in barbers only: get a short-lived upload URL for Convex file
 * storage. Used for the optional shop logo; the returned storage id is
 * attached to the shop via `barbers.updateProfile`.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Internal: delete an unused logo file after it has been replaced or
 * removed, so storage doesn't fill up with orphans.
 */
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in.");
    await ctx.storage.delete(storageId);
  },
});
