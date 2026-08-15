import { getTranslations } from "next-intl/server";

import { AuthCard, AuthSplit } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";
import { LegalLinks } from "@/components/site-chrome";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <AuthSplit lead={t("registerLead")}>
      <AuthCard
        eyebrow={t("welcome")}
        title={t("registerTitle")}
        description={t("registerDescription")}
      >
        <RegisterForm />
      </AuthCard>
      <LegalLinks className="mt-6 text-center text-sm text-muted-foreground lg:text-left" />
    </AuthSplit>
  );
}
