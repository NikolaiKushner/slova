import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-brand-soft/15 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="font-display text-3xl tracking-tight text-foreground transition hover:opacity-80"
        >
          Slova
        </Link>

        <Card className="mt-10 bg-white/85 shadow-sm ring-border">
          <CardHeader className="gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
              Welcome
            </p>
            <CardTitle className="font-display text-3xl font-normal tracking-tight">
              Sign in
            </CardTitle>
            <CardDescription className="text-base">
              Continue with Google — a new account is created on first sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          By continuing you agree to study a few words today.
        </p>
      </div>
    </main>
  );
}
