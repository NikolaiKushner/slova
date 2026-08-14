"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/lib/auth-actions";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">
          If that email is with us, a reset link is on its way. It expires in
          an hour.
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
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setPending(true);
        const result = await requestPasswordResetAction(
          String(form.get("email") ?? ""),
        );
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSent(true);
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        size="lg"
        className="min-h-11 w-full bg-teal-800 text-white hover:bg-teal-900"
        disabled={pending}
      >
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
