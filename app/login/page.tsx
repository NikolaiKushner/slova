import { AuthCard, AuthSplit } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { LegalLinks } from "@/components/site-chrome";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;

  return (
    <AuthSplit lead="Sign in with email, or continue with Google. A new account is created the first time you register.">
      <AuthCard
        eyebrow="Welcome"
        title="Sign in"
        description="Email and password, or Google."
      >
        <LoginForm error={error} code={code} />
      </AuthCard>
      <LegalLinks className="mt-6 text-center text-sm text-muted-foreground lg:text-left" />
    </AuthSplit>
  );
}
