import { useTranslations } from "next-intl";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import type en from "@/messages/en.json";

type ComingSoonPage = keyof typeof en.comingSoon;

/**
 * The placeholder every unbuilt page uses.
 *
 * There is one of these rather than a dozen hand-written empty states, because
 * a dozen would drift and the four sections would stop reading as one app. It
 * is built from `PageHeader` + `Section` like any real page, so when a page
 * gets its content the frame around it does not change.
 */
export function ComingSoon({ page }: { page: ComingSoonPage }) {
  const t = useTranslations(`comingSoon.${page}`);
  const common = useTranslations("common");
  const planned = t.raw("planned") as string[];

  return (
    <Page>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <Section title={common("planned")}>
        <ul className="space-y-2 rounded-2xl border border-dashed border-border bg-white/50 px-5 py-6 text-muted-foreground">
          {planned.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="text-brand-soft">
                &bull;
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
