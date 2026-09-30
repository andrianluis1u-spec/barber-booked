import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { Loader2, Lock, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Go to the destination (usually the dashboard).
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      // Email + password only. signUp creates the account and signs the
      // barber straight in — no verification step anywhere.
      await signIn("password", {
        email,
        password,
        flow: mode === "signUp" ? "signUp" : "signIn",
      });

      // Straight through to onboarding/dashboard after sign-up or sign-in.
      navigate(redirect);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setIsLoading(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="min-w-[350px] pb-0 border shadow-md">
          <CardHeader className="text-center">
            <div className="flex justify-center">
              <img
                src={logo}
                alt=""
                width={64}
                height={64}
                className="rounded-lg mb-4 mt-4 cursor-pointer"
                onClick={() => navigate("/")}
              />
            </div>
            <CardTitle className="text-xl">
              {mode === "signIn" ? "Barber access" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "signIn"
                ? "Sign in to view today's appointments"
                : "Claim your booking link — you're signed in immediately"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="pl-9"
                      autoComplete="email"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      placeholder={
                        mode === "signUp"
                          ? "At least 8 characters"
                          : "Your password"
                      }
                      type="password"
                      className="pl-9"
                      autoComplete={
                        mode === "signUp" ? "new-password" : "current-password"
                      }
                      minLength={8}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  {mode === "signUp" && (
                    <p className="text-xs text-muted-foreground">
                      No email verification — your account is ready the moment
                      you sign up.
                    </p>
                  )}
                </div>
              </div>
              {error && (
                <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-3 pb-6">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "signUp" ? "Creating account…" : "Signing in…"}
                  </>
                ) : (
                  <>{mode === "signUp" ? "Create account" : "Sign in"}</>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={switchMode}
                disabled={isLoading}
                className="w-full text-muted-foreground"
              >
                {mode === "signIn"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </Button>
            </CardFooter>
          </form>
          <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t rounded-b-lg">
            Clients don't need an account —{" "}
            <a
              href="/"
              className="underline hover:text-primary transition-colors"
            >
              book straight from your barber's link
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
