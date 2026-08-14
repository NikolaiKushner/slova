import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthNarrow>
      <AuthCard
        eyebrow="Account"
        title="Reset password"
        description="We email a link. It expires in an hour."
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthNarrow>
  );
}
