"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { GoogleIcon } from "@/components/google-icon";
import { Button } from "@/components/ui/button";
import { SIGNED_IN_HOME } from "@/lib/auth.config";

export function GoogleSignInButton({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="min-h-11 w-full gap-2"
      disabled={disabled || pending}
      onClick={() => {
        setPending(true);
        signIn("google", { redirectTo: SIGNED_IN_HOME });
      }}
    >
      <GoogleIcon className="size-5 rounded-sm bg-white p-0.5" />
      {pending ? t("openingGoogle") : t("continueGoogle")}
    </Button>
  );
}
