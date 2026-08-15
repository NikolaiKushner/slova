import { BookOpen, CalendarCheck, ListPlus, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  CourseScreen,
  DictionaryScreen,
  PracticeScreen,
  ProductFrame,
  TodayScreen,
} from "@/components/product-frame";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";

const STEPS: { icon: LucideIcon; title: "stepPasteTitle" | "stepStudyTitle" | "stepRuleTitle" | "stepDueTitle"; body: "stepPasteBody" | "stepStudyBody" | "stepRuleBody" | "stepDueBody" }[] = [
  { icon: ListPlus, title: "stepPasteTitle", body: "stepPasteBody" },
  { icon: Repeat, title: "stepStudyTitle", body: "stepStudyBody" },
  { icon: BookOpen, title: "stepRuleTitle", body: "stepRuleBody" },
  { icon: CalendarCheck, title: "stepDueTitle", body: "stepDueBody" },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/tasks/today");

  const t = await getTranslations("landing");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 top-40 h-96 w-96 rounded-full bg-brand-soft/15 blur-3xl" />
      </div>

      <SiteHeader />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-8 pt-4 lg:grid-cols-2 lg:gap-16 lg:pb-20 lg:pt-10">
        <div className="flex flex-col">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t("heroTitle1")}
            <br />
            {t("heroTitle2")}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            {t("heroBody")}
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="min-h-11 bg-teal-800 px-5 text-white hover:bg-teal-900"
              render={<Link href="/register" />}
            >
              {t("createAccount")}
            </Button>
            <Link
              href="/login"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>

        <ProductFrame>
          <TodayScreen />
        </ProductFrame>
      </section>

      <ol className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-soft">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-display text-lg leading-snug">{t(step.title)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(step.body)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mx-auto grid w-full max-w-6xl gap-16 px-6 pb-24 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {t("dictionaryEyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            {t("dictionaryTitle")}
          </h2>
          <p className="max-w-sm text-muted-foreground">
            {t("dictionaryBody")}
          </p>
          <ProductFrame>
            <DictionaryScreen />
          </ProductFrame>
        </div>
        <div className="space-y-4 lg:pt-16">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {t("practiceEyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            {t("practiceTitle")}
          </h2>
          <p className="max-w-sm text-muted-foreground">
            {t("practiceBody")}
          </p>
          <ProductFrame>
            <PracticeScreen />
          </ProductFrame>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-24 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {t("coursesEyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            {t("coursesTitle")}
          </h2>
          <p className="max-w-sm text-muted-foreground">
            {t("coursesBody")}
          </p>
        </div>
        <ProductFrame active="courses">
          <CourseScreen />
        </ProductFrame>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <p className="font-display text-3xl tracking-tight sm:text-4xl">
          {t("closeTitle")}
        </p>
        <div className="mt-6">
          <Button
            size="lg"
            variant="outline"
            className="min-h-11 px-5"
            render={<Link href="/register" />}
          >
            {t("createAccount")}
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
