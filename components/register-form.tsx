"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ProseLink } from "@/components/prose-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { registerAction } from "@/lib/auth-actions";
import { formatAuthError } from "@/lib/i18n/auth-error";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export function RegisterForm() {
  const t = useTranslations("auth");
  const errors = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <div className="space-y-4">
        <p className="text-base text-foreground">{t("checkEmail", { email: sentTo })}</p>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="min-h-11 px-4"
          render={<Link href="/login" />}
        >
          {t("backToSignIn")}
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
            setError(errors("passwordsMismatch"));
            return;
          }
          setPending(true);
          const result = await registerAction(email, password);
          setPending(false);
          if (!result.ok) {
            setError(formatAuthError(errors, result.error));
            return;
          }
          setSentTo(email.trim().toLowerCase());
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
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
          <Label htmlFor="password">{t("password")}</Label>
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
          {pending ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-card text-overline text-muted-foreground px-3">
            {t("or")}
          </span>
        </span>
      </div>

      <GoogleSignInButton disabled={pending} />

      <p className="text-center text-sm text-muted-foreground">
        {t.rich("alreadyHaveAccount", {
          link: (chunks) => (
            <ProseLink href="/login">{chunks}</ProseLink>
          ),
        })}
      </p>
    </div>
  );
}
