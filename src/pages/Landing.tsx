import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  Clock,
  Link2,
  MessageSquareText,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import logo from "@/assets/logo.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SERVICES } from "@/lib/booking";

const STEPS = [
  {
    icon: CalendarDays,
    title: "Choose your time",
    body: "Select a date and reserve an open slot. Availability is always current, so there is no waiting on a reply.",
  },
  {
    icon: Smartphone,
    title: "Leave your details",
    body: "Your name, phone number and service of choice. No account, no downloads — the essentials only.",
  },
  {
    icon: BellRing,
    title: "Arrive assured",
    body: "The barber receives your appointment immediately, and a reminder reaches you an hour before your time.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export default function Landing() {
  const shops = useQuery(api.barbers.listAll, {});

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
            <a className="transition-colors hover:text-foreground" href="#shops">
              Shops
            </a>
            <a className="transition-colors hover:text-foreground" href="#barber">
              For the barber
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/dashboard">Barber access</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/book">
                Book an appointment
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
                The booking platform for barbershops
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              Every barber gets a booking{" "}
              <span className="text-primary">link of their own</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
            >
              Barber Booked gives each barbershop its own page and a unique
              link to share. Clients reserve a chair in under a minute, the
              barber watches bookings arrive live, and every client is texted a
              reminder an hour before their time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/dashboard">
                  Claim your booking link
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-7"
              >
                <Link to="#shops">Browse the shops</Link>
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <ShieldCheck className="size-4 text-primary" />
              Complimentary for clients · takes under a minute
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
                    Next available sitting
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
                    { icon: Scissors, label: "Cut & Beard", meta: "60 minutes · $35" },
                    { icon: Clock, label: "Reminder", meta: "One hour before" },
                    { icon: MessageSquareText, label: "Confirmation", meta: "Sent by message" },
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
                  <Link to="/dashboard">Reserve this sitting</Link>
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
              Three quiet steps between intention and appointment
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

      {/* ── Shop directory ────────────────────────────────────────── */}
      <section id="shops" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                On the platform
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Shops taking bookings today
              </h2>
            </div>
          </div>
          {shops === undefined ? (
            <p className="mt-10 text-sm text-muted-foreground">Loading shops…</p>
          ) : shops.length === 0 ? (
            <p className="mt-10 max-w-2xl text-sm leading-6 text-muted-foreground">
              The first shops are setting up their pages now. Claim your link
              and be among them.
            </p>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop, i) => (
                <motion.div
                  key={shop._id}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                >
                  <Link to={`/b/${shop.slug}`} className="block h-full">
                    <Card className="card-soft group h-full rounded-2xl border-border/70 transition-colors hover:border-primary/40">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 font-serif text-base font-semibold text-primary">
                            {shop.shopName.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {shop.shopName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {shop.city}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            /b/{shop.slug}
                          </span>
                          <span className="ml-3 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                            Book
                            <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── For clients ────────────────────────────────────────── */}
      <section id="services" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">                <p className="text-sm font-medium uppercase tracking-wider text-primary">
                For clients
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                The standard menu, ready on every shop page
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="#shops">
                Find a shop to book
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
                      {s.minutes} minutes
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
              For the barber
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              The day's schedule, kept to one standard
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Every appointment reaches your dashboard the moment it is made",
                "Clients are texted a reminder one hour before their time",
                "Confirm a client with a single tap as they take the chair",
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
                Claim your booking link
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
                    Five appointments
                  </Badge>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    { t: "09:30", n: "Marco D.", s: "Signature Cut", ok: true },
                    { t: "11:00", n: "Amine K.", s: "Beard Trim", ok: true },
                    { t: "13:30", n: "Sofia R.", s: "Cut & Beard", ok: false },
                    { t: "16:00", n: "Louis P.", s: "Junior Cut", ok: false },
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
            Your link. Your chairs. Fully booked.
          </h2>            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Set up your booking page in minutes and share it with every client
            — reminders, confirmations and no-show tracking included.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-8">
            <Link to="/dashboard">
              Claim your booking link
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} Barber Booked · All rights reserved</p>
          <p>
            The appointment platform for modern barbershops
          </p>
        </div>
      </footer>
    </div>
  );
}
