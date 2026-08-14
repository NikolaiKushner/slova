import { AuthCard, AuthNarrow } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthNarrow>
      <AuthCard
        eyebrow="Welcome"
        title="Create an account"
        description="We will email a link to confirm the address."
      >
        <RegisterForm />
      </AuthCard>
    </AuthNarrow>
  );
}
