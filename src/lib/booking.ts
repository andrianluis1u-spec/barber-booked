import { format } from "date-fns";

/** Slot length in minutes (also used by the Convex backend). */
export const SLOT_MINUTES = 30;

export type ServiceId = "haircut" | "beard" | "combo" | "kids";

export interface Service {
  id: ServiceId;
  name: string;
  price: number;
  minutes: number;
  blurb: string;
}

export const SERVICES: Service[] = [
  {
    id: "haircut",
    name: "Signature Cut",
    price: 25,
    minutes: 30,
    blurb: "A considered consultation, precision cut, wash and styled finish.",
  },
  {
    id: "beard",
    name: "Beard Trim",
    price: 15,
    minutes: 30,
    blurb: "Sculpted shape and line-up, finished with a hot towel and oil.",
  },
  {
    id: "combo",
    name: "Cut & Beard",
    price: 35,
    minutes: 60,
    blurb: "Cut and beard in one sitting, completed with a hot towel.",
  },
  {
    id: "kids",
    name: "Junior Cut",
    price: 18,
    minutes: 30,
    blurb: "An unhurried cut for younger clients, aged under twelve.",
  },
];

export const BARBER_NAME = "Fade Room Studio";
export const BARBER_CITY = "Downtown";

/** Epoch-ms start -> local "HH:mm" label used across the app. */
export function startAtToSlot(startAt: number): string {
  return format(new Date(startAt), "HH:mm");
}

/** Local calendar key for a Date, e.g. "2026-09-24". */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Minimal E.164-style validation for client phone numbers. */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d+]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(digits);
}
