import { getTranslations } from "next-intl/server";

import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default async function VerifyEmailPage({
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
        title={t("confirmTitle")}
        description={t("confirmDescription")}
      >
        <VerifyEmailForm email={email ?? ""} token={token ?? ""} />
      </AuthCard>
    </AuthNarrow>
  );
}
