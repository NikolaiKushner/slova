import { getTranslations } from "next-intl/server";

import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <AuthNarrow>
      <AuthCard
        eyebrow={t("account")}
        title={t("newPasswordTitle")}
        description={t("newPasswordDescription")}
      >
        <ResetPasswordForm email={email ?? ""} token={token ?? ""} />
      </AuthCard>
    </AuthNarrow>
  );
}
