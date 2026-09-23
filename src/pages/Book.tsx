import { useMutation, useQuery } from "convex/react";
import { addDays, format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Phone,
  Scissors,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import logo from "@/assets/logo.svg";
import {
  BARBER_CITY,
  BARBER_NAME,
  SERVICES,
  SLOT_MINUTES,
  isValidPhone,
  startAtToSlot,
  toDateKey,
} from "@/lib/booking";
import { cn } from "@/lib/utils";
import type { ServiceId } from "@/lib/booking";

type Step = 1 | 2 | 3 | 4;

const OPEN_MIN = 9 * 60; // 09:00
const CLOSE_MIN = 20 * 60; // 20:00

export default function Book() {
  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState<ServiceId | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null); // epoch ms
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = SERVICES.find((s) => s.id === serviceId) ?? null;

  const taken = useQuery(
    api.appointments.takenSlots,
    dateKey ? { dateKey } : "skip",
  );

  // Next 14 days as a horizontal strip.
  const days = useMemo(() => {
    const out: { key: string; date: Date }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(new Date(), i);
      out.push({ key: toDateKey(d), date: d });
    }
    return out;
  }, []);

  // All slot start times for the selected day, minus taken & past ones.
  const slots = useMemo(() => {
    if (!dateKey) return [];
    const now = Date.now();
    const [y, mo, d] = dateKey.split("-").map(Number);
    const out: { start: number; label: string; disabled: boolean }[] = [];
    for (let m = OPEN_MIN; m <= CLOSE_MIN; m += SLOT_MINUTES) {
      const start = new Date(
        y,
        mo - 1,
        d,
        Math.floor(m / 60),
        m % 60,
        0,
        0,
      ).getTime();
      const isTaken = (taken ?? []).includes(start);
      out.push({
        start,
        label: startAtToSlot(start),
        disabled: isTaken || start < now,
      });
    }
    return out;
  }, [dateKey, taken]);

  const createBooking = useMutation(api.appointments.createBooking);

  async function handleSubmit() {
    if (!service || !dateKey || slot === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await createBooking({
        dateKey,
        startAt: slot,
        serviceName: service.name,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        notes: notes.trim() || undefined,
      });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setStep(1);
    setServiceId(null);
    setDateKey(null);
    setSlot(null);
    setName("");
    setPhone("");
    setNotes("");
    setError(null);
  }

  return (
    <div className="page-glow min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-8 rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight">
              Barber Booked
            </span>
          </a>
          <Badge
            variant="outline"
            className="rounded-full border-primary/25 text-primary"
          >
            {BARBER_NAME} · {BARBER_CITY}
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {/* Stepper */}
        <ol className="mb-8 flex items-center gap-2">
          {["Service", "Date & time", "Your details", "Done"].map(
            (label, i) => {
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
                  {i < 3 && <span className="h-px flex-1 bg-border" />}
                </li>
              );
            },
          )}
        </ol>

        {/* Step 1 — service */}
        {step === 1 && (
          <section>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              What are we doing today?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pick a service to continue.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServiceId(s.id);
                    setStep(2);
                  }}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm",
                    serviceId === s.id && "border-primary ring-2 ring-ring/30",
                  )}
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Scissors className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {s.blurb}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg font-semibold text-primary">
                      ${s.price}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.minutes} min
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2 — date & time */}
        {step === 2 && (
          <section>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              When works for you?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Live availability — taken slots are greyed out.
            </p>

            {/* Date strip */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {days.map(({ key, date }) => {
                const active = dateKey === key;
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
                        {slots.filter((s) => !s.disabled).length} open slots
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

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1.5 size-4" /> Back
              </Button>
              <Button disabled={slot === null} onClick={() => setStep(3)}>
                Continue <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </section>
        )}

        {/* Step 3 — details */}
        {step === 3 && (
          <section>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              Almost done — your details
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              The barber gets your booking instantly; your number is only used
              for reminders.
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
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything the barber should know — e.g. skin fade, longer on top…"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {service && dateKey && slot !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Scissors className="size-4 text-primary" />
                  {service.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-primary" />
                  {format(new Date(dateKey + "T12:00:00"), "EEE d MMM")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" />
                  {startAtToSlot(slot)}
                </span>
                <span className="ml-auto font-serif text-lg font-semibold text-primary">
                  ${service.price}
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
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                <ArrowLeft className="mr-1.5 size-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  submitting || name.trim().length < 2 || !isValidPhone(phone)
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Booking…
                  </>
                ) : (
                  <>
                    Confirm booking <ArrowRight className="ml-1.5 size-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        )}

        {/* Step 4 — success */}
        {step === 4 && (
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
              You're booked{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}!
            </h1>
            {service && dateKey && slot !== null && (
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {service.name} ·{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(dateKey + "T12:00:00"), "EEEE d MMM")}
                </span>{" "}
                at {startAtToSlot(slot)}. The barber has your booking, and
                you'll get a reminder an hour before.
              </p>
            )}
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild variant="outline">
                <a href="/">Back to home</a>
              </Button>
              <Button onClick={restart}>Book another</Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
