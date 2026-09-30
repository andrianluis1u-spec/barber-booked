import { useQuery } from "convex/react";
import { ArrowRight, Scissors } from "lucide-react";
import { useParams, Link, useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ShopBookingFlow from "@/components/ShopBookingFlow";

export default function ShopPage() {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  // Present when the client followed the "book a new date" link from a
  // no-show text.
  const rebookToken = searchParams.get("rebook") ?? undefined;
  const shop = useQuery(api.barbers.bySlug, { slug });

  if (shop === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (shop === null) {
    return (
      <main className="page-glow flex min-h-screen items-center justify-center p-6">
        <Card className="card-soft w-full max-w-md rounded-2xl text-center">
          <CardContent className="p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <Scissors className="size-5 text-muted-foreground" />
            </div>
            <h1 className="mt-4 font-serif text-xl font-semibold tracking-tight">
              This booking link doesn't exist
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The page <span className="font-mono text-xs">/b/{slug}</span>{" "}
              isn't connected to a barbershop. Check the link with your barber.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/">
                Visit Booking Reminded
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <ShopBookingFlow shop={shop} rebookToken={rebookToken} />;
}
