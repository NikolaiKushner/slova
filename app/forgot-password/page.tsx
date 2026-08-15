import { getTranslations } from "next-intl/server";

import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <AuthNarrow>
      <AuthCard
        eyebrow={t("account")}
        title={t("resetTitle")}
        description={t("resetDescription")}
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthNarrow>
  );
}
