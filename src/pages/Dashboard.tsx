import { useMutation, useQuery } from "convex/react";
import {
  addDays,
  format,
  startOfDay,
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
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
import { useAuth } from "@/hooks/use-auth";
import { BARBER_NAME, startAtToSlot, toDateKey } from "@/lib/booking";
import { cn } from "@/lib/utils";

type ApptStatus = "pending" | "confirmed" | "noShow" | "cancelled";

const STATUS_STYLE: Record<
  ApptStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-primary/10 text-primary",
  },
  noShow: {
    label: "No-show",
    className: "bg-destructive/10 text-destructive",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

export default function Dashboard() {
  const { user, isLoading, signOut } = useAuth();
  const [dayOffset, setDayOffset] = useState(0);

  const selectedDate = useMemo(
    () => addDays(startOfDay(new Date()), dayOffset),
    [dayOffset],
  );
  const dateKey = toDateKey(selectedDate);

  // Signed-in only; undefined while loading, [] when no bookings that day.
  const appointments = useQuery(api.appointments.byDay, { dateKey });

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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <div className="page-glow min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scissors className="size-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-tight">
                {BARBER_NAME}
              </p>
              <p className="text-xs leading-tight text-muted-foreground">
                Barber dashboard
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
        {/* Date navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
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

        {/* Bookings list */}
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
                New client bookings will appear here as they are made.
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
                        {appt.notes ? ` · “${appt.notes}”` : ""}
                      </p>
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
          Reminder messages and rebooking invitations arrive with the next
          release. Appointments booked on{" "}
          <span className="font-medium text-foreground">/book</span> appear
          here in real time.
        </p>
      </main>
    </div>
  );
}
