import { format } from "date-fns";

/** Slot length in minutes (also used by the Convex backend). */
export const SLOT_MINUTES = 30;

/** Epoch-ms start -> local "HH:mm" label used across the app. */
export function startAtToSlot(startAt: number): string {
  return format(new Date(startAt), "HH:mm");
}

/** Local calendar key for a Date, e.g. "2026-09-24". */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Minimal E.164-style validation for phone numbers (client and barber). */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d+]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(digits);
}
