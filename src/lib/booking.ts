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

/** Accent colors barbers can pick for their public booking page. */
export const ACCENT_COLORS = [
  { value: "#1F4235", name: "Ink Green", dark: false },
  { value: "#0F766E", name: "Teal", dark: false },
  { value: "#1D4ED8", name: "Royal Blue", dark: false },
  { value: "#7C3AED", name: "Violet", dark: false },
  { value: "#B45309", name: "Amber Bronze", dark: false },
  { value: "#B91C1C", name: "Crimson", dark: false },
  { value: "#0F172A", name: "Midnight", dark: true },
  { value: "#111111", name: "Onyx", dark: true },
] as const;

/** Allowed values for per-shop booking settings. */
export const SLOT_OPTIONS = [15, 30, 45, 60] as const;
export const WINDOW_OPTIONS = [7, 14, 30, 60] as const;
export const OPEN_HOUR_RANGE = { min: 0, max: 23 } as const;
export const CLOSE_HOUR_RANGE = { min: 1, max: 24 } as const;

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/** Clamp + sanitize a hex color, or return null when invalid. */
export function normalizeHexColor(input: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(input.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}
