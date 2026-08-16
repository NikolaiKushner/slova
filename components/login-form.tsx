"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ProseLink } from "@/components/prose-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SIGNED_IN_HOME } from "@/lib/auth.config";
import { formatAuthError } from "@/lib/i18n/auth-error";
import { cn } from "@/lib/utils";

function errorMessage(
  t: ReturnType<typeof useTranslations<"errors">>,
  error?: string | null,
  code?: string | null,
) {
  if (code) return formatAuthError(t, code);
  if (error) return formatAuthError(t, error);
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
  const t = useTranslations("auth");
  const errors = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    errorMessage(errors, error, code),
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
            setFormError(errorMessage(errors, result.error, result.code));
            return;
          }
          router.push(SIGNED_IN_HOME);
          router.refresh();
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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">{t("password")}</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {t("forgotPassword")}
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
          className="min-h-11 w-full"
          disabled={pending}
        >
          {pending ? t("signingIn") : t("signIn")}
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
        {t.rich("newHere", {
          link: (chunks) => (
            <ProseLink href="/register">{chunks}</ProseLink>
          ),
        })}
      </p>
    </div>
  );
}
