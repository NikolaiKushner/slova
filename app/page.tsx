import { CalendarCheck, ListPlus, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { BrandWordmark } from "@/components/brand-mark";
import { StudyPreview } from "@/components/study-preview";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ListPlus,
    title: "Paste a list",
    body: "A tutor sheet or CSV. Translations fill in as you add the words.",
  },
  {
    icon: Repeat,
    title: "Study the words",
    body: "One card, seven formats. Recognising one is easy; writing it is not.",
  },
  {
    icon: CalendarCheck,
    title: "Come back when due",
    body: "The schedule brings words back. Nothing to organise by hand.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/tasks/today");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-brand-soft/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="flex flex-col">
          <BrandWordmark className="text-4xl sm:text-5xl" />

          <div className="mt-14 space-y-6 sm:mt-20">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
              Vocabulary
            </p>
            <h1 className="max-w-xl font-display text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Paste a word list.
              <br />
              Start learning.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Drop a tutor sheet or CSV into Slova. Study in minutes. Come back
              when words are due again.
            </p>
            <div className="max-w-sm space-y-3 pt-2">
              <LoginForm />
              <p className="text-sm text-muted-foreground">
                First time here? Signing in creates your account.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <StudyPreview />
        </div>
      </div>

      <ol className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 sm:grid-cols-3 sm:gap-10">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-soft">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-display text-lg leading-snug">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
