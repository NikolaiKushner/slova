"use client";

import Link from "next/link";
import { useState } from "react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LegalLinks } from "@/components/site-chrome";
import { registerAction } from "@/lib/auth-actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export function RegisterForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">
          Check {sentTo} and confirm the address. Then you can sign in.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 px-4"
          render={<Link href="/login" />}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") ?? "");
          const password = String(form.get("password") ?? "");
          const confirm = String(form.get("confirm") ?? "");
          setError(null);
          if (password !== confirm) {
            setError("Passwords do not match.");
            return;
          }
          setPending(true);
          const result = await registerAction(email, password);
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSentTo(email.trim().toLowerCase());
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="min-h-11 px-3"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="min-h-11 px-3"
            disabled={pending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          size="lg"
          className="min-h-11 w-full bg-teal-800 text-white hover:bg-teal-900"
          disabled={pending}
        >
          {pending ? "Creating account…" : "Create account"}
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
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <LegalLinks className="text-center text-sm text-muted-foreground" />
    </div>
  );
}
