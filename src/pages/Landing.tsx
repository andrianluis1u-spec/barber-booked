import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Check,
  Link2,
  MessageSquareText,
  Palette,
  Scissors,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router";
import logo from "@/assets/logo.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The one and only page of the brand: who we are, what the barber gets
 * (one generated booking link) and demo pricing. Clients never land here —
 * they arrive at a barber's /b/<slug> link directly.
 */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const PRICING = [
  {
    name: "Basic",
    price: "$25",
    cadence: "/month",
    tagline: "One chair, one link, fully reminded.",
    features: [
      "Your own booking link, your colors & hours",
      "Unlimited appointments & clients",
      "200 reminder messages / month (SMS + WhatsApp)",
      "Booking alerts straight to your phone",
      "Client cancel-link, no phone tag",
      "Came / No-show tracking",
    ],
    cta: "Start with Basic",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$49",
    cadence: "/month",
    tagline: "For shops where every chair stays busy.",
    features: [
      "Everything in Basic",
      "600 messages / month (SMS + WhatsApp)",
      "Multiple barbers on one shop page",
      "Client history & repeat bookings",
      "Custom SMS sender name",
      "Priority support",
    ],
    cta: "Start with Pro",
    highlight: false,
  },
  {
    name: "Chain",
    price: "$99",
    cadence: "/month",
    tagline: "Several locations, one standard of reminders.",
    features: [
      "Everything in Pro",
      "Unlimited messages",
      "Multi-location booking links",
      "Central owner dashboard",
      "Onboarding for your whole team",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

/** Pricing footnote. */
function PricingNote() {
  return (
    <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
      Founding-barber pricing — the first shops on Booking Reminded keep this
      rate forever. Extra messages beyond your plan: $0.05 each. No setup fee,
      cancel anytime.
    </p>
  );
}

export default function Landing() {
  return (
    <div className="page-glow min-h-screen">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-8 rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight">
              Booking Reminded
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#how"
            >
              How it works
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#pricing"
            >
              Pricing
            </a>
          </nav>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/dashboard">
              Generate your link
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
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
                <Scissors className="size-3.5" />
                For barbershops that hate empty chairs
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl"
            >
              One link. Booked chairs.{" "}
              <span className="text-primary">Nobody forgets.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
            >
              Booking Reminded gives every barbershop its own booking page —
              your logo, your colors, your hours. Clients pick a chair in under
              a minute; your phone gets every booking, and their phone gets the
              reminder — one hour before, every time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/dashboard">
                  Generate your booking link
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-7"
            >
              <a href="/b/demo-barbershop">See a live booking page</a>
            </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <ShieldCheck className="size-4 text-primary" />
              Free to start · no app for clients to install
            </motion.p>
          </div>

          {/* Link card preview */}
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
                    Your booking link
                  </p>
                  <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                    Live in 2 minutes
                  </Badge>
                </div>
                <p className="mt-3 break-all rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 font-mono text-sm font-medium text-foreground">
                  booking-reminded.com/b/your-shop
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    {
                      icon: Smartphone,
                      label: "Client books from the link",
                      meta: "Name, phone, done — no account",
                    },
                    {
                      icon: MessageSquareText,
                      label: "You get the booking by text",
                      meta: "Client name & number, instantly",
                    },
                    {
                      icon: BellRing,
                      label: "Client gets reminded",
                      meta: "One hour before — with a cancel link",
                    },
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
                  <Link to="/dashboard">
                    <Link2 className="mr-1.5 size-4" />
                    Claim this link
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── The problem: silent no-shows ─────────────────────────── */}
      <section id="why" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-destructive">
              The problem
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              An appointment that isn't reminded is a coin flip
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              Clients book on Instagram and forget. You wait by the chair, the
              phone stays silent, and the slot is gone for anyone else.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                stat: "$500+",
                label: "lost per month",
                body: "Four forgotten appointments a week at an average cut price quietly adds up to thousands a year.",
              },
              {
                stat: "~30%",
                label: "of bookings never reminded",
                body: "DMs and phone bookings leave no trail — and nobody dares to text a stranger a day before. Wait — nobody texts, nobody comes.",
              },
              {
                stat: "1 hour",
                label: "is all it takes",
                body: "A reminder sent one hour before cuts no-shows dramatically — the same reason airlines and dentists never skip it.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.stat}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="card-soft h-full rounded-2xl border-destructive/20 bg-destructive/[0.03]">
                  <CardContent className="p-6">
                    <p className="font-serif text-4xl font-semibold text-destructive">
                      {s.stat}
                    </p>
                    <span className="mt-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </span>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {s.body}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
              From link to chair in six quiet steps
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Link2,
                title: "Generate your link",
                body: "Sign up, name your shop and your personal booking page goes live in two minutes — no website, no app, no developer.",
              },
              {
                icon: Palette,
                title: "Make it yours",
                body: "Upload your logo, pick your brand color, set your hours and closed days. Your page looks like your shop — not like a template.",
              },
              {
                icon: Smartphone,
                title: "Clients book themselves",
                body: "They open your link, see live availability, and reserve a chair with name and phone. Double bookings are impossible — the grid closes instantly.",
              },
              {
                icon: MessageSquareText,
                title: "You get texted instantly",
                body: "Every booking lands on your phone the second it happens: name, number, day and time. No refreshing a dashboard to find out.",
              },
              {
                icon: BellRing,
                title: "Clients get reminded",
                body: "One hour before their appointment, your client gets a text with the time and a cancel link — so empty chairs reopen in time.",
              },
              {
                icon: Check,
                title: "You stay in control",
                body: "After the appointment, a text asks if the client came. One tap confirms them; if they no-showed, we invite them back by text.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
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

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Pricing
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Simple plans, built around messages
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Every plan includes your booking link, unlimited appointments,
              email confirmations and reminder messages by SMS &amp; WhatsApp.
              Pick the message volume that matches your chairs.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card
                  className={
                    "card-soft relative h-full rounded-2xl border-border/70 " +
                    (plan.highlight
                      ? "border-primary/40 ring-2 ring-primary/20"
                      : "")
                  }
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-2.5 left-5 rounded-full bg-primary text-primary-foreground hover:bg-primary">
                      Best to start
                    </Badge>
                  )}
                  <CardContent className="flex h-full flex-col p-6">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.tagline}
                    </p>
                    <p className="mt-4 font-serif text-4xl font-semibold">
                      {plan.price}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {plan.cadence}
                      </span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Check className="size-3 text-primary" />
                          </span>
                          <span className="text-sm leading-5 text-muted-foreground">
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className="mt-6 w-full rounded-full"
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      <Link to="/dashboard">
                        {plan.cta}
                        <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <PricingNote />
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl font-serif text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Your link is waiting. Your chairs won't fill themselves.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Generate your booking page now — reminders, confirmations and
            no-show tracking included from the first booking.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-8">
            <Link to="/dashboard">
              Generate your booking link
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer / brand info ────────────────────────────────── */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="" className="size-7 rounded-lg" />
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  Booking Reminded
                </p>
                <p className="text-xs text-muted-foreground">
                  One link. Booked chairs. Nobody forgets.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a
                href="#how"
                className="transition-colors hover:text-foreground"
              >
                How it works
              </a>
              <a
                href="#pricing"
                className="transition-colors hover:text-foreground"
              >
                Pricing
              </a>
              <Link
                to="/dashboard"
                className="transition-colors hover:text-foreground"
              >
                For barbers
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Booking Reminded. All rights
              reserved.
            </p>
            <p>SMS &amp; WhatsApp appointment reminders for barbershops.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
