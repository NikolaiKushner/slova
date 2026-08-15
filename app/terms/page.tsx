import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/legal-page";
import { MailLink, ProseLink } from "@/components/prose-link";
import { Section } from "@/components/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("termsMetaTitle"),
    description: t("termsMetaDescription"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={t("termsTitle")}
      description={t("termsDescription")}
      updated={t("updated")}
      footer={<ProseLink href="/privacy">{t("privacyTitle")}</ProseLink>}
    >
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
    </LegalPage>
  );
}
