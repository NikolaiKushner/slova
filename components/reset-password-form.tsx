"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordResetAction } from "@/lib/auth-actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">
          That reset link is missing its token. Ask for a new one.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 px-4"
          render={<Link href="/forgot-password" />}
        >
          Reset password
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
        const password = String(form.get("password") ?? "");
        const confirm = String(form.get("confirm") ?? "");
        setError(null);
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        setPending(true);
        const result = await completePasswordResetAction(email, token, password);
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push("/login");
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
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
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
