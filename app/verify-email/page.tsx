import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  return (
    <AuthNarrow>
      <AuthCard
        eyebrow="Account"
        title="Confirm your email"
        description="One click to finish creating the account."
      >
        <VerifyEmailForm email={email ?? ""} token={token ?? ""} />
      </AuthCard>
    </AuthNarrow>
  );
}
