import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("termsMetaTitle"),
    description: t("termsMetaDescription"),
  };
}

function MailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="text-foreground underline-offset-4 hover:underline"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Page className="flex-1 px-6 pb-16">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("termsTitle")}
          description={t("termsDescription")}
        />

        <div className="space-y-10 text-base leading-relaxed">
          <Section title={t("theAppTitle")}>
            <p className="text-muted-foreground">{t("theAppBody")}</p>
          </Section>

          <Section title={t("yourWordsTitle")}>
            <p className="text-muted-foreground">{t("yourWordsBody")}</p>
          </Section>

          <Section title={t("accountsTitle")}>
            <p className="text-muted-foreground">
              {t.rich("accountsBody", { email: () => <MailLink /> })}
            </p>
          </Section>

          <Section title={t("warrantyTitle")}>
            <p className="text-muted-foreground">{t("warrantyBody")}</p>
          </Section>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            {t("privacyTitle")}
          </Link>
        </p>
      </Page>
      <SiteFooter />
    </div>
  );
}
