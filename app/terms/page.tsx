import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  LegalItem,
  LegalList,
  LegalPage,
  LegalSection,
  legalRich,
} from "@/components/legal-page";
import { MailLink, ProseLink } from "@/components/prose-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("termsMetaTitle"),
    description: t("termsMetaDescription"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");
  const rich = {
    ...legalRich(),
    email: () => <MailLink />,
    privacy: (chunks: ReactNode) => (
      <ProseLink href="/privacy">{chunks}</ProseLink>
    ),
  };

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={t("termsTitle")}
      description={t("termsDescription")}
      updated={t("updated")}
      effective={t("effective")}
      footer={
        <>
          <ProseLink href="/privacy">← {t("privacyTitle")}</ProseLink>
          <MailLink />
        </>
      }
    >
      <LegalSection title={t("theAppTitle")}>
        <p>{t("theAppBody")}</p>
      </LegalSection>

      <LegalSection title={t("accountsTitle")}>
        <LegalList>
          <LegalItem>{t("account1")}</LegalItem>
          <LegalItem>{t("account2")}</LegalItem>
          <LegalItem>{t.rich("account3", rich)}</LegalItem>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("yourWordsTitle")}>
        <p>{t("yourWordsBody")}</p>
        <p>{t.rich("yourWordsException", rich)}</p>
      </LegalSection>

      <LegalSection title={t("forbiddenTitle")}>
        <LegalList>
          <LegalItem>{t("forbidden1")}</LegalItem>
          <LegalItem>{t("forbidden2")}</LegalItem>
          <LegalItem>{t("forbidden3")}</LegalItem>
          <LegalItem>{t("forbidden4")}</LegalItem>
        </LegalList>
        <p>{t("forbiddenOutro")}</p>
      </LegalSection>

      <LegalSection title={t("translationsTitle")}>
        <p>{t.rich("translationsBody", rich)}</p>
      </LegalSection>

      <LegalSection title={t("availabilityTitle")}>
        <p>{t("availabilityBody")}</p>
      </LegalSection>

      <LegalSection title={t("liabilityTitle")}>
        <p>{t.rich("liabilityBody", rich)}</p>
      </LegalSection>

      <LegalSection title={t("sourcesTitle")}>
        <p>{t.rich("sourcesBody", rich)}</p>
      </LegalSection>

      <LegalSection title={t("changesTitle")}>
        <p>{t("termsChanges")}</p>
      </LegalSection>
    </LegalPage>
  );
}
