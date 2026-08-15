import { BookOpen, CalendarCheck, ListPlus, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { TRAININGS } from "@/lib/practice/catalog";
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
import { cn } from "@/lib/utils";

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

/** The three trainings the stills under the chip row show. */
const SHOWN_TRAININGS = ["word-to-translation", "audio-choice", "typing"];

const CONTAINER = "mx-auto w-full max-w-6xl px-6";
/** Between two content bands: the whitespace is the section divider. */
const BAND = "pt-24 lg:pt-32";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
      {children}
    </p>
  );
}

/** `free · no card · takes a minute` — small facts, separated by dots. */
function MicroLine({
  items,
  className,
  dotClassName,
}: {
  items: string[];
  className?: string;
  dotClassName?: string;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]",
        className,
      )}
    >
      {items.map((item, index) => (
        <span key={item} className="flex items-center gap-x-2.5">
          {index > 0 ? (
            <span
              className={cn("size-[3px] rounded-full bg-border", dotClassName)}
              aria-hidden
            />
          ) : null}
          {item}
        </span>
      ))}
    </p>
  );
}

function Chip({ on = false, children }: { on?: boolean; children: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-full px-3 py-1.5 text-[13px] font-normal",
        on
          ? "border-primary/20 bg-accent font-medium text-accent-foreground"
          : "bg-card/60 text-muted-foreground",
      )}
    >
      {children}
    </Badge>
  );
}

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/tasks/today");

  const t = await getTranslations("landing");
  const trainings = await getTranslations("trainings");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader />

      <section
        className={cn(
          CONTAINER,
          "grid items-start gap-12 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:gap-20 lg:pt-20",
        )}
      >
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-5 max-w-[13ch] font-display text-[clamp(2.5rem,5.4vw,3.75rem)] leading-[1.06] tracking-[-0.012em] text-foreground">
            {t("heroTitle1")} {t("heroTitle2")}
          </h1>
          <p className="mt-6 max-w-[44ch] text-[16.5px] leading-[1.62] text-muted-foreground">
            {t("heroBody")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button
              size="lg"
              className="min-h-11 px-6"
              render={<Link href="/register" />}
            >
              {t("createAccount")}
            </Button>
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition hover:text-primary"
            >
              {t("haveAccount")}
            </Link>
          </div>
          <MicroLine
            className="mt-7 text-muted-foreground"
            items={[t("microFree"), t("microNoCard"), t("microLexicon")]}
          />
        </div>

        <ProductFrame>
          <TodayScreen />
        </ProductFrame>
      </section>

      <div className={cn(CONTAINER, "mt-20 lg:mt-28")}>
        <dl className="grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            [t("statLexiconValue"), t("statLexicon")],
            [String(TRAININGS.length), t("statFormats")],
            [t("statRequestValue"), t("statRequest")],
          ].map(([value, caption]) => (
            <div
              key={caption}
              className="py-7 sm:pr-8 sm:pl-8 sm:first:pl-0 sm:last:pr-0"
            >
              <dt className="font-display text-[34px] leading-none tracking-tight text-primary tabular-nums">
                {value}
              </dt>
              <dd className="mt-2.5 max-w-[30ch] text-[13.5px] leading-relaxed text-muted-foreground">
                {caption}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <ul
        className={cn(
          CONTAINER,
          "mt-16 grid gap-9 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4",
        )}
      >
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <span className="mb-3.5 flex size-8 items-center justify-center rounded-md bg-accent text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <p className="font-display text-[17px] leading-snug">
                {t(step.title)}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-muted-foreground">
                {t(step.body)}
              </p>
            </li>
          );
        })}
      </ul>

      <section
        className={cn(
          CONTAINER,
          BAND,
          "grid items-start gap-12 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-20",
        )}
      >
        <div>
          <Eyebrow>{t("dictionaryEyebrow")}</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.12] tracking-[-0.012em]">
            {t("dictionaryTitle")}
          </h2>
          <p className="mt-5 max-w-[44ch] text-[16.5px] leading-[1.62] text-muted-foreground">
            {t("dictionaryBody")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip>{t("dictionaryPillList")}</Chip>
            <Chip on>{t("dictionaryPillRequest")}</Chip>
          </div>
        </div>
        <ProductFrame chrome="panel">
          <DictionaryScreen />
        </ProductFrame>
      </section>

      <section className={cn(CONTAINER, BAND)}>
        <div className="max-w-[52ch]">
          <Eyebrow>{t("practiceEyebrow")}</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.12] tracking-[-0.012em]">
            {t("practiceTitle")}
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.62] text-muted-foreground">
            {t("practiceBody")}
          </p>
        </div>
        <ul className="mt-7 flex flex-wrap gap-2">
          {TRAININGS.map((training) => (
            <li key={training.id}>
              <Chip on={SHOWN_TRAININGS.includes(training.id)}>
                {trainings(`${training.id}.title`)}
              </Chip>
            </li>
          ))}
        </ul>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <ProductPanel label={trainings("word-to-translation.title")}>
            <PracticeChoiceStill />
          </ProductPanel>
          <ProductPanel label={trainings("audio-choice.title")}>
            <PracticeAudioStill />
          </ProductPanel>
          <ProductPanel label={trainings("typing.title")}>
            <PracticeTypingStill />
          </ProductPanel>
        </div>
      </section>

      <section
        className={cn(
          CONTAINER,
          BAND,
          "grid items-start gap-12 lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] lg:gap-20",
        )}
      >
        <div className="order-2 lg:order-1">
          <ProductFrame chrome="panel" active="courses">
            <CourseScreen />
          </ProductFrame>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>{t("coursesEyebrow")}</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.12] tracking-[-0.012em]">
            {t("coursesTitle")}
          </h2>
          <p className="mt-5 max-w-[44ch] text-[16.5px] leading-[1.62] text-muted-foreground">
            {t("coursesBody")}
          </p>
        </div>
      </section>

      <section className="mt-24 bg-brand-deep text-primary-foreground lg:mt-32">
        <div
          className={cn(
            CONTAINER,
            "grid gap-10 pt-20 pb-20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:pt-28 lg:pb-24",
          )}
        >
          <div>
            <h2 className="max-w-[22ch] font-display text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.12] tracking-[-0.012em]">
              {t("closeTitle")}
            </h2>
            <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-primary-foreground/70">
              {t("closeBody")}
            </p>
            <MicroLine
              className="mt-7 text-primary-foreground/55"
              dotClassName="bg-primary-foreground/25"
              items={[t("microFree"), t("microNoCard"), t("microMinute")]}
            />
          </div>
          <Button
            size="lg"
            className="min-h-11 justify-self-start bg-primary-foreground px-6 text-brand-deep hover:bg-accent sm:justify-self-end"
            render={<Link href="/register" />}
          >
            {t("createAccount")}
          </Button>
        </div>

        <SiteFooter tone="dark" />
      </section>
    </main>
  );
}
