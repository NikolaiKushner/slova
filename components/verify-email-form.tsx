"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { confirmEmailAction } from "@/lib/auth-actions";

export function VerifyEmailForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">
          That confirmation link is missing its token. Check the email again.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 px-4"
          render={<Link href="/register" />}
        >
          Create an account
        </Button>
      </div>
    );
  }

  if (result === "ok") {
    return (
      <Button
        size="lg"
        className="min-h-11 w-full bg-teal-800 text-white hover:bg-teal-900"
        render={<Link href="/login" />}
      >
        Sign in
      </Button>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const next = await confirmEmailAction(email, token);
        setPending(false);
        if (!next.ok) {
          setResult("error");
          setError(next.error);
          return;
        }
        setResult("ok");
      }}
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        size="lg"
        className="min-h-11 w-full bg-teal-800 text-white hover:bg-teal-900"
        disabled={pending}
      >
        {pending ? "Confirming…" : "Confirm email"}
      </Button>
    </form>
  );
}
