import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  return (
    <AuthNarrow>
      <AuthCard
        eyebrow="Account"
        title="New password"
        description="Choose something you will remember."
      >
        <ResetPasswordForm email={email ?? ""} token={token ?? ""} />
      </AuthCard>
    </AuthNarrow>
  );
}
