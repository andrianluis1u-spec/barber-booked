import { useMutation, useQuery } from "convex/react";
import { addDays, format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Instagram,
  Loader2,
  MapPin,
  Phone,
  Scissors,
  ShieldCheck,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.svg";
import {
  isValidPhone,
  startAtToSlot,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/booking";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

/* ── Full-page theming ───────────────────────────────────────────────────
 * The shop's accent color overrides the app's CSS variables on the page
 * root, so EVERYTHING follows: background, cards, borders, muted text and
 * buttons. Dark accents (black, ink green, midnight) flip the whole page
 * into a dark, branded experience; light accents keep a light page with
 * the accent on primary elements.
 * ──────────────────────────────────────────────────────────────────────*/

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mixColor(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(mix(r, target[0]))}${to(mix(g, target[1]))}${to(mix(b, target[2]))}`;
}

function buildTheme(accent: string): React.CSSProperties {
  const [r, g, b] = hexToRgb(accent);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance < 0.45) {
    // Dark accent → the whole page goes dark and branded.
    const fg = mixColor(accent, [255, 255, 255], 0.93);
    return {
      "--page-glow": `radial-gradient(60rem 30rem at 50% -10rem, ${accent}2E, transparent 70%)`,
      "--background": mixColor(accent, [0, 0, 0], 0.85),
      "--foreground": fg,
      "--card": mixColor(accent, [0, 0, 0], 0.7),
      "--card-foreground": fg,
      "--popover": mixColor(accent, [0, 0, 0], 0.7),
      "--popover-foreground": fg,
      "--primary": accent,
      "--primary-foreground": "#ffffff",
      "--secondary": mixColor(accent, [0, 0, 0], 0.58),
      "--secondary-foreground": fg,
      "--muted": mixColor(accent, [0, 0, 0], 0.6),
      "--muted-foreground": mixColor(accent, [255, 255, 255], 0.55),
      "--accent": mixColor(accent, [0, 0, 0], 0.52),
      "--accent-foreground": fg,
      "--border": mixColor(accent, [255, 255, 255], 0.13),
      "--input": mixColor(accent, [255, 255, 255], 0.16),
      "--ring": accent,
    } as React.CSSProperties;
  }
  // Light accent → light page, accent on primary elements.
  return {
    "--page-glow": `radial-gradient(60rem 30rem at 50% -10rem, ${accent}1A, transparent 70%)`,
    "--primary": accent,
    "--primary-foreground": "#ffffff",
    "--ring": accent,
    "--background": mixColor(accent, [255, 255, 255], 0.97),
    "--accent": mixColor(accent, [255, 255, 255], 0.9),
    "--accent-foreground": accent,
  } as React.CSSProperties;
}

/**
 * The client booking flow for one shop: date & time → details + SMS consent
 * → confirmation. Service-free by design. Reused by the unique per-barber
 * page at /b/<slug>; `rebookToken` preselects a date (no-show rebook link).
 */
export default function ShopBookingFlow({
  shop,
  rebookToken,
}: {
  shop: Doc<"barbers">;
  rebookToken?: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null); // epoch ms
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shop customisation with platform defaults.
  const slotMinutes = shop.slotMinutes ?? 30;
  const openHour = shop.openHour ?? 9;
  const closeHour = shop.closeHour ?? 20;
  const closedDays = shop.closedWeekdays ?? [];
  const windowDays = shop.bookingWindowDays ?? 14;
  const accent = shop.accentColor ?? null;
  const themeStyle = useMemo(
    () => (accent ? buildTheme(accent) : undefined),
    [accent],
  );

  const taken = useQuery(
    api.appointments.takenSlots,
    dateKey ? { barberId: shop._id, dateKey } : "skip",
  );

  const logoUrl = useQuery(
    api.barbers.logoUrl,
    shop.logoStorageId ? { storageId: shop.logoStorageId } : "skip",
  );

  const hasProfileInfo = Boolean(
    shop.logoStorageId ||
      shop.tagline ||
      shop.about ||
      shop.address ||
      shop.mapsUrl ||
      shop.publicPhone ||
      shop.instagramUrl,
  );

  // Next N days as a horizontal strip (N = the shop's booking window),
  // generated in the SHOP's local calendar so closed weekdays line up
  // regardless of where the client is.
  const days = useMemo(() => {
    const out: { key: string; date: Date }[] = [];
    const shopOffset = shop.ownerUtcOffset ?? 0;
    // "Today" in the shop's local calendar:
    const nowShifted = new Date(Date.now() - shopOffset * 60_000);
    const shopToday = new Date(
      Date.UTC(
        nowShifted.getUTCFullYear(),
        nowShifted.getUTCMonth(),
        nowShifted.getUTCDate(),
      ),
    );
    for (let i = 0; i < windowDays; i++) {
      const utcDay = new Date(shopToday.getTime() + i * 86_400_000);
      // Render the strip from the shop-local date parts.
      const key = toDateKey(
        new Date(
          utcDay.getUTCFullYear(),
          utcDay.getUTCMonth(),
          utcDay.getUTCDate(),
        ),
      );
      out.push({ key, date: new Date(`${key}T12:00:00`) });
    }
    return out;
  }, [windowDays, shop.ownerUtcOffset]);

  // Slot grid built from the shop's LOCAL wall clock (e.g. "09:00" local
  // means the same moment no matter where the client is): each slot's epoch
  // value is reconstructed as UTC(shopDate - shopOffset, openHour + n).
  const slots = useMemo(() => {
    if (!dateKey) return [];
    const now = Date.now();
    const shopOffset = shop.ownerUtcOffset ?? 0;
    const [y, mo, d] = dateKey.split("-").map(Number);
    const out: {
      start: number;
      end: number;
      label: string;
      disabled: boolean;
    }[] = [];
    const stepMs = slotMinutes * 60_000;
    const openMin = openHour * 60;
    const closeMin = closeHour * 60;
    for (let m = openMin; m + slotMinutes <= closeMin; m += slotMinutes) {
      // Epoch for shop-local wall time m on this dateKey:
      const start =
        Date.UTC(y, mo - 1, d, Math.floor(m / 60), m % 60) +
        shopOffset * 60_000;
      const end = start + stepMs;
      const isBusy = (taken ?? []).some((b) => start < b.end && b.start < end);
      out.push({
        start,
        end,
        label: startAtToSlot(start),
        disabled: isBusy || start < now,
      });
    }
    return out;
  }, [dateKey, taken, slotMinutes, openHour, closeHour, shop.ownerUtcOffset]);

  const createBooking = useMutation(api.appointments.createBooking);

  async function handleSubmit() {
    if (!dateKey || slot === null) return;
    if (!consent) {
      setError("Please agree to receive SMS messages to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createBooking({
        barberId: shop._id,
        dateKey,
        startAt: slot,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        clientEmail: email.trim() || undefined,
        clientUtcOffset: new Date().getTimezoneOffset(),
        smsConsentAt: Date.now(),
      });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-glow min-h-screen" style={themeStyle}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={shop.shopName}
                className="size-10 rounded-lg border object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 font-serif text-base font-semibold text-primary">
                {shop.shopName.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-tight">
                {shop.shopName}
              </p>
              <p className="flex items-center gap-1 text-xs leading-tight text-muted-foreground">
                <MapPin className="size-3" />
                {shop.city}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/25 text-primary"
          >
            <img src={logo} alt="" className="size-3.5 rounded-sm" />
            Powered by Booking Reminded
          </Badge>
        </div>
      </header>

      {/* ── Shop profile — every field is optional and barber-controlled ── */}
      <section className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6">
        <Card className="card-soft overflow-hidden rounded-2xl">
          <div
            className="h-14 w-full"
            style={
              accent
                ? { background: `linear-gradient(90deg, ${accent}, ${accent}00)` }
                : { background: "linear-gradient(90deg, var(--primary), transparent)" }
            }
          />
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="-mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-background bg-muted shadow-lg">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={shop.shopName}
                    className="size-full object-cover"
                  />
                ) : (
                  <Scissors className="size-10 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h2 className="font-serif text-2xl font-semibold tracking-tight">
                  {shop.shopName}
                </h2>
                {shop.tagline && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {shop.tagline}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                  {shop.address &&
                    (shop.mapsUrl ? (
                      <a
                        href={shop.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                      >
                        <MapPin className="size-3.5" />
                        {shop.address}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {shop.address}
                      </span>
                    ))}
                  {shop.publicPhone && (
                    <a
                      href={`tel:${shop.publicPhone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Phone className="size-3.5" />
                      {shop.publicPhone}
                    </a>
                  )}
                  {shop.instagramUrl && (
                    <a
                      href={shop.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Instagram className="size-3.5" />
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>
            {shop.about && (
              <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">
                {shop.about}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <span>
                {slotMinutes}-minute sittings · open {String(openHour).padStart(2, "0")}:
                00–{String(closeHour % 24).padStart(2, "0")}:00 · book up to{" "}
                {windowDays} days ahead
              </span>
              {closedDays.length > 0 && (
                <span>
                  Closed {closedDays.map((d) => WEEKDAY_LABELS[d]).join(", ")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {/* Stepper */}
        <ol className="mb-8 flex items-center gap-2">
          {["Date & time", "Your details", "Done"].map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    (done || active) &&
                      "bg-primary text-primary-foreground",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : n}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {i < 2 && <span className="h-px flex-1 bg-border" />}
              </li>
            );
          })}
        </ol>

        {/* Step 1 — date & time */}
        {step === 1 && (
          <section>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              Choose a date and time
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Availability at {shop.shopName} is shown in real time — reserved
              times cannot be chosen.
            </p>

            {/* Date strip — closed days are shown but not selectable */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {days.map(({ key, date }) => {
                const active = dateKey === key;
                const closed = closedDays.includes(date.getDay());
                if (closed) {
                  return (
                    <div
                      key={key}
                      aria-disabled
                      className="flex w-16 shrink-0 cursor-not-allowed flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-muted/50 py-2.5 opacity-50"
                    >
                      <span className="text-[11px] uppercase tracking-wide opacity-70">
                        {format(date, "EEE")}
                      </span>
                      <span className="text-lg font-semibold">
                        {format(date, "d")}
                      </span>
                      <span className="text-[10px] font-medium uppercase opacity-70">
                        Closed
                      </span>
                    </div>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDateKey(key);
                      setSlot(null);
                    }}
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl border bg-card py-2.5 transition-colors hover:border-primary/50",
                      active &&
                        "border-primary bg-primary text-primary-foreground ring-2 ring-ring/30 hover:border-primary",
                    )}
                  >
                    <span className="text-[11px] uppercase tracking-wide opacity-70">
                      {format(date, "EEE")}
                    </span>
                    <span className="text-lg font-semibold">
                      {format(date, "d")}
                    </span>
                    <span className="text-[11px] opacity-70">
                      {format(date, "MMM")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slots */}
            <div className="mt-4 rounded-2xl border bg-card p-4">
              {dateKey ? (
                taken === undefined ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading availability…
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {format(
                          new Date(dateKey + "T12:00:00"),
                          "EEEE, d MMMM",
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slots.filter((s) => !s.disabled).length} times
                        available
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          disabled={s.disabled}
                          onClick={() => setSlot(s.start)}
                          className={cn(
                            "rounded-lg border py-2 text-sm font-medium transition-colors hover:border-primary/50",
                            s.disabled &&
                              "cursor-not-allowed opacity-35 hover:border-border",
                            slot === s.start &&
                              "border-primary bg-primary text-primary-foreground ring-2 ring-ring/30 hover:border-primary",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Pick a day above to see open times.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button disabled={slot === null} onClick={() => setStep(2)}>
                Continue <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </section>
        )}

        {/* Step 2 — details + consent */}
        {step === 2 && (
          <section>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              Your details
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {shop.shopName} receives your appointment immediately. Your
              phone number is used for appointment messages only.
            </p>
            <Card className="card-soft mt-6 rounded-2xl">
              <CardContent className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Carter"
                        className="pl-9"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 010 2030"
                        className="pl-9"
                        autoComplete="tel"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      With country code — used for the 1-hour reminder.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your confirmation by email too — handy if texts are
                    inconvenient.
                  </p>
                </div>

                {/* Required SMS consent */}
                <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <Checkbox
                    id="sms-consent"
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    className="mt-0.5"
                  />
                  <div>
                    <Label
                      htmlFor="sms-consent"
                      className="text-sm font-medium leading-5"
                    >
                      Send me text messages about this appointment
                    </Label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      A confirmation to the barber, one reminder an hour
                      before your time, and a rebooking link if needed. Reply
                      STOP at any time to opt out.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {dateKey && slot !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-primary" />
                  {format(new Date(dateKey + "T12:00:00"), "EEE d MMM")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" />
                  {startAtToSlot(slot)} · {slotMinutes} min
                </span>
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                <ArrowLeft className="mr-1.5 size-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  name.trim().length < 2 ||
                  !isValidPhone(phone) ||
                  !consent
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Reserving…
                  </>
                ) : (
                  <>
                    Confirm appointment <ArrowRight className="ml-1.5 size-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        )}

        {/* Step 3 — success */}
        {step === 3 && (
          <section className="py-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10"
            >
              <Check className="size-8 text-primary" />
            </motion.div>
            <h1 className="mt-6 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              Your appointment is booked
              {name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}.
            </h1>
            {dateKey && slot !== null && (
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {shop.shopName} ·{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(dateKey + "T12:00:00"), "EEEE d MMM")}
                </span>{" "}
                at {startAtToSlot(slot)}. The barber has been notified, and a
                reminder with a cancel link will reach you an hour before
                your time.
              </p>
            )}
            <p className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              No account needed — this page was all it took.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setDateKey(null);
                  setSlot(null);
                  setName("");
                  setPhone("");
                  setConsent(false);
                  setError(null);
                }}
              >
                Book another appointment
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/**
 * Client cancellation page opened from the cancel link inside the 1-hour
 * reminder SMS (/c/<token>). No login — the secret token is the proof.
 */
export function CancelBookingPage() {
  const cancelByToken = useMutation(api.reminders.cancelByToken);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = window.location.pathname.split("/").pop() ?? "";
    cancelByToken({ token })
      .then(() => setState("done"))
      .catch((e: unknown) => {
        setMessage(e instanceof Error ? e.message : "Something went wrong.");
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page-glow flex min-h-screen items-center justify-center p-6">
      <Card className="card-soft w-full max-w-md rounded-2xl text-center">
        <CardContent className="p-8">
          {state === "working" && (
            <>
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight">
                Cancelling your appointment…
              </h1>
            </>
          )}
          {state === "done" && (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-6 text-primary" />
              </div>
              <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight">
                Your appointment is cancelled
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The time has been freed up. You can book again whenever it
                suits you.
              </p>
            </>
          )}
          {state === "error" && (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <Scissors className="size-6 text-destructive" />
              </div>
              <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight">
                We couldn't cancel that
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {message ||
                  "This cancellation link is no longer valid. Please contact the shop."}
              </p>
            </>
          )}
          <Button asChild className="mt-6 rounded-full">
            <a href="/">Visit Booking Reminded</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
