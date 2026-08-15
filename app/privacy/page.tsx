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
    title: t("privacyMetaTitle"),
    description: t("privacyMetaDescription"),
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

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Page className="flex-1 px-6 pb-16">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("privacyTitle")}
          description={t("privacyDescription")}
        />

        <div className="space-y-10 text-base leading-relaxed text-foreground">
          <Section title={t("whoTitle")}>
            <p className="text-muted-foreground">
              {t.rich("whoBody", { email: () => <MailLink /> })}
            </p>
          </Section>

          <Section title={t("storeTitle")}>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>{t("store1")}</li>
              <li>{t("store2")}</li>
              <li>{t("store3")}</li>
              <li>{t("store4")}</li>
            </ul>
          </Section>

          <Section title={t("elseTitle")}>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>{t("else1")}</li>
              <li>{t("else2")}</li>
              <li>{t("else3")}</li>
              <li>{t("else4")}</li>
              <li>{t("else5")}</li>
            </ul>
          </Section>

          <Section title={t("cookiesTitle")}>
            <p className="text-muted-foreground">{t("cookiesBody")}</p>
          </Section>

          <Section title={t("howLongTitle")}>
            <p className="text-muted-foreground">
              {t.rich("howLongBody", { email: () => <MailLink /> })}
            </p>
          </Section>

          <Section title={t("childrenTitle")}>
            <p className="text-muted-foreground">{t("childrenBody")}</p>
          </Section>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/terms" className="underline-offset-4 hover:underline">
            {t("termsOfUse")}
          </Link>
        </p>
      </Page>
      <SiteFooter />
    </div>
  );
}
