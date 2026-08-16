"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordResetAction } from "@/lib/auth-actions";
import { formatAuthError } from "@/lib/i18n/auth-error";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const router = useRouter();
  const t = useTranslations("auth");
  const errors = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">{t("resetLinkMissing")}</p>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 px-4"
          render={<Link href="/forgot-password" />}
        >
          {t("resetTitle")}
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
          setError(errors("passwordsMismatch"));
          return;
        }
        setPending(true);
        const result = await completePasswordResetAction(email, token, password);
        setPending(false);
        if (!result.ok) {
          setError(formatAuthError(errors, result.error));
          return;
        }
        router.push("/login");
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
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
          {t("passwordHint", { count: MIN_PASSWORD_LENGTH })}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
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
        className="min-h-11 w-full"
        disabled={pending}
      >
        {pending ? t("saving") : t("savePassword")}
      </Button>
    </form>
  );
}
