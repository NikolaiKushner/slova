import { getTranslations } from "next-intl/server";

import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <AuthNarrow>
      <AuthCard
        eyebrow={t("welcome")}
        title={t("registerTitle")}
        description={t("registerDescription")}
      >
        <RegisterForm />
      </AuthCard>
    </AuthNarrow>
  );
}
