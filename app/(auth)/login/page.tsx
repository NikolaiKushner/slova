import { getTranslations } from "next-intl/server";

import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { LegalLinks } from "@/components/site-chrome";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <AuthNarrow headerAction="register">
      <AuthCard
        eyebrow={t("welcome")}
        title={t("signInTitle")}
        description={t("signInDescription")}
      >
        <LoginForm error={error} code={code} />
      </AuthCard>
      <LegalLinks className="mt-6 text-center text-sm text-muted-foreground" />
    </AuthNarrow>
  );
}
