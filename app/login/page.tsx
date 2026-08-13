import Link from "next/link";

import { BrandWordmark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";
import { StudyPreview } from "@/components/study-preview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-brand-soft/15 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-12 lg:py-20">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="hidden lg:block">
            <Link href="/" className="inline-flex transition hover:opacity-80">
              <BrandWordmark className="text-4xl" />
            </Link>
            <p className="mt-10 font-display text-4xl leading-[1.1] tracking-tight text-foreground">
              Paste a word list.
              <br />
              Start learning.
            </p>
            <p className="mt-4 max-w-sm text-muted-foreground">
              One Google account. A new one is created on first sign-in.
            </p>
            <div className="mt-12">
              <StudyPreview />
            </div>
          </div>

          <div>
            <Link href="/" className="inline-flex transition hover:opacity-80 lg:hidden">
              <BrandWordmark className="text-3xl" />
            </Link>

            <Card className="mt-8 bg-card py-8 shadow-sm lg:mt-0">
              <CardHeader className="gap-2">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
                  Welcome
                </p>
                <CardTitle className="font-display text-3xl font-normal tracking-tight">
                  Sign in
                </CardTitle>
                <CardDescription className="text-base">
                  A new account is created on first sign-in.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <LoginForm />
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground lg:text-left">
              By continuing you agree to study a few words today.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
