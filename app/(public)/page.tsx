import { BookOpen, CalendarCheck, ListPlus, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getSession } from "@/lib/auth";
import { SIGNED_IN_HOME } from "@/lib/auth.config";
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
import { MARKETING, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Eyebrow } from "@/components/slova/eyebrow";
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

/** Between two content bands: the whitespace is the section divider. */
const BAND = "pt-24 lg:pt-32";

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
        "text-caption flex flex-wrap items-center gap-x-2.5 gap-y-1",
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
  const session = await getSession();
  if (session?.user) redirect(SIGNED_IN_HOME);

  const t = await getTranslations("landing");
  const trainings = await getTranslations("trainings");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader />

      <section
        className={cn(
          MARKETING,
          "grid items-start gap-12 pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:gap-20 lg:pt-24",
        )}
      >
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="text-display max-w-[13ch]">
            {t("heroTitle1")} {t("heroTitle2")}
          </h1>
          <p className="text-lead mt-6 max-w-[44ch] text-foreground/80">
            {t("heroBody")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              size="lg"
              className="min-h-12 px-6"
              render={<Link href="/register" />}
            >
              {t("createAccount")}
            </Button>
            <Link
              href="/login"
              className="focus-ring rounded-sm text-sm text-foreground/80 transition-colors duration-(--motion-instant) hover:text-primary"
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

      <div className={cn(MARKETING, "mt-16 lg:mt-24")}>
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
              <dt className="text-numeral text-primary">{value}</dt>
              <dd className="text-caption mt-2 max-w-[30ch] text-muted-foreground">
                {caption}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <ul
        className={cn(
          MARKETING,
          "mt-14 grid gap-8 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4",
        )}
      >
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <span className="mb-3.5 flex size-8 items-center justify-center rounded-[9px] bg-accent text-primary">
                <Icon className="size-4" strokeWidth={1.8} aria-hidden />
              </span>
              <p className="text-[1.0625rem] leading-snug font-semibold">
                {t(step.title)}
              </p>
              <p className="text-caption mt-1.5 leading-[1.55] text-muted-foreground">
                {t(step.body)}
              </p>
            </li>
          );
        })}
      </ul>

      <section
        className={cn(
          MARKETING,
          BAND,
          "grid items-start gap-12 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-16",
        )}
      >
        <div>
          <Eyebrow>{t("dictionaryEyebrow")}</Eyebrow>
          <h2 className="text-h2">{t("dictionaryTitle")}</h2>
          <p className="text-lead mt-4 max-w-[44ch] text-foreground/80">
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

      <section className={cn(MARKETING, BAND)}>
        <div className="max-w-[52ch]">
          <Eyebrow>{t("practiceEyebrow")}</Eyebrow>
          <h2 className="text-h2">{t("practiceTitle")}</h2>
          <p className="text-lead mt-4 text-foreground/80">{t("practiceBody")}</p>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2">
          {TRAININGS.map((training) => (
            <li key={training.id}>
              <Chip on={SHOWN_TRAININGS.includes(training.id)}>
                {trainings(`${training.id}.title`)}
              </Chip>
            </li>
          ))}
        </ul>
        <div className="mt-7 grid gap-3.5 sm:grid-cols-3">
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
          MARKETING,
          BAND,
          "grid items-start gap-12 lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] lg:gap-16",
        )}
      >
        <div className="order-2 lg:order-1">
          <ProductFrame chrome="panel" active="courses">
            <CourseScreen />
          </ProductFrame>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>{t("coursesEyebrow")}</Eyebrow>
          <h2 className="text-h2">{t("coursesTitle")}</h2>
          <p className="text-lead mt-4 max-w-[44ch] text-foreground/80">
            {t("coursesBody")}
          </p>
        </div>
      </section>

      <section className="bg-inverse-surface text-inverse-foreground mt-24 lg:mt-32">
        <div
          className={cn(
            MARKETING,
            "grid gap-10 pt-16 pb-16 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:pt-24 lg:pb-20",
          )}
        >
          <div>
            <h2 className="text-h2 max-w-[22ch]">{t("closeTitle")}</h2>
            <p className="text-inverse-muted mt-3.5 max-w-[46ch]">
              {t("closeBody")}
            </p>
            <MicroLine
              className="text-inverse-muted mt-5"
              dotClassName="bg-inverse-muted/40"
              items={[t("microFree"), t("microNoCard"), t("microMinute")]}
            />
          </div>
          <Button
            size="lg"
            className="min-h-12 justify-self-start bg-inverse-foreground px-6 text-inverse-surface hover:bg-accent sm:justify-self-end"
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
