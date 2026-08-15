"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { confirmEmailAction } from "@/lib/auth-actions";
import { formatAuthError } from "@/lib/i18n/auth-error";

export function VerifyEmailForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const t = useTranslations("auth");
  const errors = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">{t("confirmLinkMissing")}</p>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 px-4"
          render={<Link href="/register" />}
        >
          {t("createAccount")}
        </Button>
      </div>
    );
  }

  if (result === "ok") {
    return (
      <Button
        size="lg"
        className="min-h-11 w-full"
        render={<Link href="/login" />}
      >
        {t("signIn")}
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
          setError(formatAuthError(errors, next.error));
          return;
        }
        setResult("ok");
      }}
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        size="lg"
        className="min-h-11 w-full"
        disabled={pending}
      >
        {pending ? t("confirming") : t("confirmEmail")}
      </Button>
    </form>
  );
}
