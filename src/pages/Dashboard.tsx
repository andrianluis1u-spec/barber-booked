import { useMutation, useQuery } from "convex/react";
import { addDays, format, startOfDay } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Link2,
  LogOut,
  Scissors,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { startAtToSlot, toDateKey } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ApptStatus = "pending" | "confirmed" | "noShow" | "cancelled";

const REMINDER_STYLE: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: "Reminder scheduled",
    className: "bg-primary/10 text-primary",
  },
  sending: {
    label: "Reminder sending",
    className: "bg-primary/10 text-primary",
  },
  sent: { label: "Reminder sent", className: "bg-primary/10 text-primary" },
  failed: {
    label: "Reminder failed",
    className: "bg-destructive/10 text-destructive",
  },
};

const STATUS_STYLE: Record<ApptStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  confirmed: { label: "Confirmed", className: "bg-primary/10 text-primary" },
  noShow: { label: "No-show", className: "bg-destructive/10 text-destructive" },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

/** Shown before the barber has created their shop profile. */
function Onboarding() {
  const { user } = useAuth();
  const createShop = useMutation(api.barbers.createShop);
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugAvailable = useQuery(
    api.barbers.slugAvailable,
    slug.length >= 3 ? { slug } : "skip",
  );

  const slugState = !slugTouched
    ? "idle"
    : slug.length < 3
      ? "short"
      : slugAvailable === undefined
        ? "checking"
        : slugAvailable
          ? "free"
          : "taken";

  // Auto-suggest a slug from the shop name until the barber edits it.
  function suggest(name: string) {
    setShopName(name);
    if (!slugTouched) {
      const s = name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
      setSlug(s);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createShop({ shopName, city, slug });
      toast.success("Your booking page is live.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-glow flex min-h-screen items-center justify-center p-4">
      <Card className="card-soft w-full max-w-lg rounded-2xl">
        <CardContent className="p-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scissors className="size-5" />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight">
            Welcome{user?.name ? `, ${user.name}` : ""}. Set up your booking
            page.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose a name for your booking link — clients use it to book your
            chairs. Share it on Instagram, WhatsApp or your storefront window.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shopName">Shop name</Label>
              <Input
                id="shopName"
                value={shopName}
                onChange={(e) => suggest(e.target.value)}
                placeholder="Fade Room Studio"
                required
                minLength={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="city">City / area</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Downtown"
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Your booking link</Label>
                <div className="flex items-center rounded-md border border-input">
                  <span className="pl-3 text-sm text-muted-foreground">
                    /b/
                  </span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      );
                    }}
                    placeholder="fade-room-studio"
                    className="border-0 shadow-none focus-visible:ring-0"
                    required
                    minLength={3}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    slugState === "taken" && "text-destructive",
                    slugState === "free" && "text-primary",
                    (slugState === "idle" ||
                      slugState === "short" ||
                      slugState === "checking") &&
                      "text-muted-foreground",
                  )}
                >
                  {slugState === "idle" && "Choose your unique link."}
                  {slugState === "checking" && "Checking availability…"}
                  {slugState === "free" && "This link is available."}
                  {slugState === "taken" && "That link is already taken."}
                  {slugState === "short" && "At least 3 characters."}
                </p>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={submitting || slugState === "taken" || slugState === "short"}
            >
              {submitting ? "Creating…" : "Create my booking page"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Dashboard card showing the shop's unique booking link. */
function ShopLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/b/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Booking link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link manually.");
    }
  }

  return (
    <Card className="card-soft rounded-2xl border-primary/25 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Link2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Your unique booking link
          </p>
          <p className="truncate font-mono text-sm font-medium text-foreground">
            {url}
          </p>
        </div>
        <Button size="sm" className="rounded-full" onClick={copy}>
          {copied ? (
            <>
              <Check className="mr-1 size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 size-3.5" /> Copy
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, isLoading, signOut } = useAuth();
  const [dayOffset, setDayOffset] = useState(0);
  const shop = useQuery(api.barbers.myShop, {});

  const selectedDate = useMemo(
    () => addDays(startOfDay(new Date()), dayOffset),
    [dayOffset],
  );
  const dateKey = toDateKey(selectedDate);

  const appointments = useQuery(
    api.appointments.byDay,
    shop ? { dateKey } : "skip",
  );

  const confirm = useMutation(api.appointments.confirm);
  const markNoShow = useMutation(api.appointments.markNoShow);
  const cancel = useMutation(api.appointments.cancel);

  const counts = useMemo(() => {
    const list = appointments ?? [];
    return {
      total: list.filter((a) => a.status !== "cancelled").length,
      confirmed: list.filter((a) => a.status === "confirmed").length,
      pending: list.filter((a) => a.status === "pending").length,
      noShow: list.filter((a) => a.status === "noShow").length,
    };
  }, [appointments]);

  if (isLoading || shop === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (shop === null) {
    return <Onboarding />;
  }

  return (
    <div className="page-glow min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 font-serif text-base font-semibold text-primary">
              {shop.shopName.slice(0, 1)}
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-tight">
                {shop.shopName}
              </p>
              <p className="text-xs leading-tight text-muted-foreground">
                {shop.city} · Barber dashboard
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">
              {user?.name ?? user?.email ?? "Sign out"}
            </span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        {/* Unique booking link */}
        <ShopLinkCard slug={shop.slug} />

        {/* Date navigation */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              {format(selectedDate, "EEEE, d MMMM yyyy")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {dayOffset === 0
                ? "Today's appointments"
                : dayOffset === 1
                  ? "Tomorrow's appointments"
                  : `${format(selectedDate, "EEEE")}'s appointments`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous day"
              onClick={() => setDayOffset((d) => d - 1)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setDayOffset(0)}
              className={cn(dayOffset === 0 && "border-primary text-primary")}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next day"
              onClick={() => setDayOffset((d) => d + 1)}
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Appointments", value: counts.total, tone: "text-foreground" },
            { label: "Confirmed", value: counts.confirmed, tone: "text-primary" },
            {
              label: "Pending",
              value: counts.pending,
              tone: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "No-shows",
              value: counts.noShow,
              tone: "text-destructive",
            },
          ].map((s) => (
            <Card key={s.label} className="card-soft rounded-2xl border-border/70">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className={cn("mt-1 font-serif text-2xl font-semibold", s.tone)}>
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Appointments list */}
        <div className="mt-8 space-y-3">
          {appointments === undefined ? (
            <div className="flex items-center gap-2 rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading appointments…
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">No appointments for this day</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your booking link — new client bookings will appear here
                in real time.
              </p>
            </div>
          ) : (
            appointments.map((appt) => {
              const st = STATUS_STYLE[appt.status];
              return (
                <Card
                  key={appt._id}
                  className="card-soft rounded-2xl border-border/70"
                >
                  <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                    <div className="w-16 text-center">
                      <p className="font-serif text-xl font-semibold leading-none">
                        {startAtToSlot(appt.startAt)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        30 min
                      </p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{appt.clientName}</p>
                        <Badge
                          className={cn("rounded-full border-0", st.className)}
                          variant="secondary"
                        >
                          {st.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {appt.serviceName} · {appt.clientPhone}
                        {appt.notes ? ` · "${appt.notes}"` : ""}
                      </p>
                      {appt.reminderStatus &&
                        appt.reminderStatus !== "cancelled" && (
                          <p
                            className={cn(
                              "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              REMINDER_STYLE[appt.reminderStatus]?.className,
                            )}
                          >
                            <Clock className="size-3" />
                            {REMINDER_STYLE[appt.reminderStatus]?.label}
                          </p>
                        )}
                    </div>
                    {appt.status !== "cancelled" && (
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Button
                          size="sm"
                          className="flex-1 rounded-full sm:flex-none"
                          disabled={appt.status === "confirmed"}
                          onClick={() => void confirm({ id: appt._id })}
                        >
                          <Check className="mr-1 size-3.5" />
                          {appt.status === "confirmed" ? "Confirmed" : "Confirm"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-full sm:flex-none"
                          disabled={appt.status === "noShow"}
                          onClick={() => void markNoShow({ id: appt._id })}
                        >
                          <UserX className="mr-1 size-3.5" />
                          No-show
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          aria-label="Cancel booking"
                          onClick={() => void cancel({ id: appt._id })}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Clients are texted automatically one hour before their appointment.
          Appointments booked through your link appear here in real time.
        </p>
      </main>
    </div>
  );
}

