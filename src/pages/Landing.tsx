import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  Clock,
  MessageSquareText,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import logo from "@/assets/logo.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BARBER_CITY,
  BARBER_NAME,
  SERVICES,
} from "@/lib/booking";

const STEPS = [
  {
    icon: CalendarDays,
    title: "Pick a day & time",
    body: "Choose a date and grab one of the open slots — live availability, no back-and-forth.",
  },
  {
    icon: Smartphone,
    title: "Leave your number",
    body: "Name, phone, service. That's all we need — no account, no app to install.",
  },
  {
    icon: BellRing,
    title: "Get reminded",
    body: "The barber sees your booking instantly, and you get a reminder an hour before your slot.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export default function Landing() {
  return (
    <div className="page-glow min-h-screen">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-8 rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight">
              Barber Booked
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#how">
              How it works
            </a>
            <a className="transition-colors hover:text-foreground" href="#services">
              Services
            </a>
            <a className="transition-colors hover:text-foreground" href="#barber">
              For barbers
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/dashboard">Barber sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/book">
                Book a chair
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="grain relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 md:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="mb-5 gap-1.5 rounded-full border-primary/25 bg-primary/5 px-3 py-1 text-primary"
              >
                <Sparkles className="size-3.5" />
                Online booking for {BARBER_NAME}, {BARBER_CITY}
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              Your chair, booked in{" "}
              <span className="text-primary">under a minute</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
            >
              Clients pick a slot and leave their number. The booking lands on
              the barber's phone, a reminder goes out an hour before — and
              no-shows get a one-tap rebook link instead of an empty chair.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/book">
                  Book an appointment
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-7"
              >
                <Link to="/dashboard">I'm the barber</Link>
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <ShieldCheck className="size-4 text-primary" />
              Free for clients · takes about 40 seconds
            </motion.p>
          </div>

          {/* Booking preview card */}
          <motion.div
            initial={{ opacity: 0, y: 32, rotate: 1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-primary/5 blur-2xl" />
            <Card className="card-soft-lg relative rounded-3xl border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Next available
                  </p>
                  <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                    Today
                  </Badge>
                </div>
                <p className="mt-2 font-serif text-3xl font-semibold">
                  4:30 <span className="text-lg text-muted-foreground">PM</span>
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    { icon: Scissors, label: "Cut + Beard", meta: "45 min · $35" },
                    { icon: Clock, label: "Reminders", meta: "1 hour before" },
                    { icon: MessageSquareText, label: "Confirmation", meta: "By SMS" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <row.icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.meta}
                        </p>
                      </div>
                      <Check className="ml-auto size-4 text-primary" />
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-5 w-full rounded-full">
                  <Link to="/book">Reserve this slot</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Three taps from open slot to confirmed chair
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="card-soft h-full rounded-2xl border-border/70">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <step.icon className="size-5" />
                      </div>
                      <span className="font-serif text-3xl font-semibold text-border">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────── */}
      <section id="services" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                Services
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Straightforward menu, fair prices
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/book">
                Book any of these
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.id}
                {...fadeUp}
                transition={{ duration: 0.45, delay: i * 0.07 }}
              >
                <Card className="card-soft group h-full rounded-2xl border-border/70 transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <span className="font-serif text-xl font-semibold text-primary">
                        ${s.price}
                      </span>
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                      {s.blurb}
                    </p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      ~{s.minutes} min
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For barbers ────────────────────────────────────────── */}
      <section id="barber" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              For barbers
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Your day, on one screen — not in your DMs
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Every booking lands in your dashboard the moment it's made",
                "Confirm walk-ins in one tap when the client sits down",
                "No-shows are flagged so clients get a rebook nudge",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="size-3 text-primary" />
                  </span>
                  <span className="text-[15px] leading-7 text-muted-foreground">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 rounded-full px-7">
              <Link to="/dashboard">
                Open the barber dashboard
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>

          {/* Dashboard preview */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-primary/5 blur-2xl" />
            <Card className="card-soft-lg relative rounded-3xl border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Today · Thursday</p>
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/25 text-primary"
                  >
                    5 bookings
                  </Badge>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    { t: "09:30", n: "Marco D.", s: "Signature Cut", ok: true },
                    { t: "11:00", n: "Amine K.", s: "Beard Trim", ok: true },
                    { t: "13:30", n: "Sofia R.", s: "Cut + Beard", ok: false },
                    { t: "16:00", n: "Louis P.", s: "Kids Cut", ok: false },
                  ].map((r) => (
                    <div
                      key={r.t}
                      className="flex items-center gap-3 rounded-xl border border-border/70 px-3.5 py-2.5"
                    >
                      <span className="font-mono text-xs font-medium text-muted-foreground">
                        {r.t}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.n}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.s}
                        </p>
                      </div>
                      <span
                        className={
                          "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium " +
                          (r.ok
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {r.ok ? "Confirmed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl font-serif text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            The chair is waiting. The clock is running.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Book in under a minute — no account, no app, no phone tag.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-8">
            <Link to="/book">
              Book your appointment
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} {BARBER_NAME} · {BARBER_CITY}</p>
          <p>
            Booking powered by{" "}
            <span className="font-medium text-foreground">Barber Booked</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
