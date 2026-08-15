import { BookOpen, CalendarCheck, ListPlus, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { TRAININGS } from "@/lib/practice/catalog";
import { SHARED_LEXICON_SIZE } from "@/lib/site";
import { redirect } from "next/navigation";
import {
  CourseScreen,
  DictionaryScreen,
  PracticeAudioStill,
  PracticeChoiceStill,
  PracticeTypingStill,
  ProductFrame,
  ProductPanel,
  TodayScreen,
} from "@/components/product-frame";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STEPS: {
  icon: LucideIcon;
  title: "stepPasteTitle" | "stepStudyTitle" | "stepRuleTitle" | "stepDueTitle";
  body: "stepPasteBody" | "stepStudyBody" | "stepRuleBody" | "stepDueBody";
}[] = [
  { icon: ListPlus, title: "stepPasteTitle", body: "stepPasteBody" },
  { icon: Repeat, title: "stepStudyTitle", body: "stepStudyBody" },
  { icon: BookOpen, title: "stepRuleTitle", body: "stepRuleBody" },
  { icon: CalendarCheck, title: "stepDueTitle", body: "stepDueBody" },
];

const FORMAT_CHIPS = [
  "formatChoice",
  "formatTyping",
  "formatAudio",
  "formatReverse",
  "formatBuilder",
  "formatDictation",
  "formatBrainstorm",
] as const;

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/tasks/today");

  const t = await getTranslations("landing");
  const locale = await getLocale();
  const lexiconCount = new Intl.NumberFormat(locale).format(SHARED_LEXICON_SIZE);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader />

      <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 pt-4 pb-12 lg:grid-cols-2 lg:gap-16 lg:pt-8 lg:pb-12">
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
          <div className="mt-8">
            <Button
              size="lg"
              className="min-h-11 px-5"
              render={<Link href="/register" />}
            >
              {t("createAccount")}
            </Button>
          </div>
          <p className="mt-4 text-sm text-brand-soft">{t("freeLine")}</p>
        </div>

        <ProductFrame>
          <TodayScreen />
        </ProductFrame>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12 lg:pb-16">
        <dl className="grid gap-8 sm:grid-cols-3">
          <div>
            <dt className="font-display text-4xl tracking-tight text-primary tabular-nums sm:text-5xl">
              {lexiconCount}
            </dt>
            <dd className="mt-2 text-sm text-muted-foreground">{t("statLexicon")}</dd>
          </div>
          <div>
            <dt className="font-display text-4xl tracking-tight text-primary tabular-nums sm:text-5xl">
              {TRAININGS.length}
            </dt>
            <dd className="mt-2 text-sm text-muted-foreground">{t("statFormats")}</dd>
          </div>
          <div>
            <dt className="font-display text-4xl tracking-tight text-primary tabular-nums sm:text-5xl">
              1
            </dt>
            <dd className="mt-2 text-sm text-muted-foreground">{t("statRequest")}</dd>
          </div>
        </dl>
      </section>

      <ul className="mx-auto grid w-full max-w-6xl items-stretch gap-8 px-6 pb-12 sm:grid-cols-2 lg:grid-cols-4 lg:pb-16">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex h-full gap-3">
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
      </ul>

      <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {t("dictionaryEyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            {t("dictionaryTitle")}
          </h2>
          <p className="max-w-sm text-muted-foreground">{t("dictionaryBody")}</p>
          <Badge className="h-auto rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
            {t("dictionaryPill")}
          </Badge>
        </div>
        <ProductFrame chrome="panel">
          <DictionaryScreen />
        </ProductFrame>
      </section>

      <section className="bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
              {t("practiceEyebrow")}
            </p>
            <h2 className="mt-4 font-display text-3xl tracking-tight">
              {t("practiceTitle")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("practiceBody")}</p>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {FORMAT_CHIPS.map((chip) => (
              <li key={chip}>
                <Badge className="h-auto rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
                  {t(chip)}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <ProductPanel>
              <PracticeChoiceStill />
            </ProductPanel>
            <ProductPanel>
              <PracticeAudioStill />
            </ProductPanel>
            <ProductPanel>
              <PracticeTypingStill />
            </ProductPanel>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <div className="order-1 space-y-4 lg:order-2">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {t("coursesEyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight">
            {t("coursesTitle")}
          </h2>
          <p className="max-w-sm text-muted-foreground">{t("coursesBody")}</p>
        </div>
        <div className="order-2 lg:order-1">
          <ProductFrame chrome="panel" active="courses">
            <CourseScreen />
          </ProductFrame>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 sm:flex-row sm:items-center sm:justify-between lg:py-20">
          <div>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              {t("closeTitle")}
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/80">
              {t("freeLine")}
            </p>
          </div>
          <Button
            size="lg"
            className="min-h-11 bg-primary-foreground px-5 text-primary hover:bg-primary-foreground/90"
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
