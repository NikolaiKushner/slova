"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SIGNED_IN_HOME } from "@/lib/auth.config";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Wrong email or password.",
  email_not_verified: "Confirm the email we sent you, then sign in.",
  AccessDenied: "That sign-in was denied.",
  OAuthAccountNotLinked:
    "This email is already in use with another sign-in method.",
  Configuration: "Sign-in is not configured yet.",
};

function errorMessage(error?: string | null, code?: string | null) {
  if (code && ERRORS[code]) return ERRORS[code];
  if (error && ERRORS[error]) return ERRORS[error];
  if (error || code) return "Could not sign in. Try again.";
  return null;
}

export function LoginForm({
  className,
  error,
  code,
}: {
  className?: string;
  error?: string;
  code?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    errorMessage(error, code),
  );

  return (
    <div className={cn("space-y-6", className)}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setFormError(null);
          setPending(true);
          const result = await signIn("credentials", {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            redirect: false,
            redirectTo: SIGNED_IN_HOME,
          });
          setPending(false);
          if (result?.error) {
            setFormError(errorMessage(result.error, result.code));
            return;
          }
          router.push(SIGNED_IN_HOME);
          router.refresh();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            className="min-h-11 px-3"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-11 px-3"
            disabled={pending}
          />
        </div>
        {formError ? (
          <p className="text-sm text-destructive">{formError}</p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="min-h-11 w-full bg-teal-800 text-white hover:bg-teal-900"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-card px-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            or
          </span>
        </span>
      </div>

      <GoogleSignInButton disabled={pending} />

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
