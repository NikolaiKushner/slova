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
import { Callout } from "@/components/slova/callout";
import { MailLink, ProseLink } from "@/components/prose-link";
import { SITE_ORIGIN } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("privacyMetaTitle"),
    description: t("privacyMetaDescription"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  const rich = {
    ...legalRich(),
    email: () => <MailLink />,
    site: (chunks: ReactNode) => (
      <ProseLink href={SITE_ORIGIN}>{chunks}</ProseLink>
    ),
  };

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={t("privacyTitle")}
      description={t("privacyDescription")}
      updated={t("updated")}
      effective={t("effective")}
      footer={
        <>
          <ProseLink href="/terms">{t("termsOfUse")} →</ProseLink>
          <MailLink />
        </>
      }
    >
      <LegalSection title={t("whoTitle")}>
        <p>{t.rich("whoBody", rich)}</p>
      </LegalSection>

      <LegalSection title={t("storeTitle")}>
        <LegalList>
          <LegalItem>{t.rich("store1", rich)}</LegalItem>
          <LegalItem>{t.rich("store2", rich)}</LegalItem>
          <LegalItem>{t.rich("store3", rich)}</LegalItem>
          <LegalItem>{t.rich("store4", rich)}</LegalItem>
        </LegalList>
        <p>{t("storeElse")}</p>
      </LegalSection>

      <LegalSection title={t("elseTitle")}>
        <p>{t("elseIntro")}</p>
        <LegalList>
          <LegalItem>{t.rich("else1", rich)}</LegalItem>
          <LegalItem>{t.rich("else2", rich)}</LegalItem>
          <LegalItem>{t.rich("else3", rich)}</LegalItem>
          <LegalItem>{t.rich("else4", rich)}</LegalItem>
          <LegalItem>{t.rich("else5", rich)}</LegalItem>
          <LegalItem>{t.rich("else6", rich)}</LegalItem>
        </LegalList>
        <p>{t("elseOutro")}</p>
      </LegalSection>

      <LegalSection title={t("whereTitle")}>
        <p>{t("whereBody")}</p>
      </LegalSection>

      <LegalSection title={t("rightsTitle")}>
        <LegalList>
          <LegalItem>{t.rich("rights1", rich)}</LegalItem>
          <LegalItem>{t.rich("rights2", rich)}</LegalItem>
          <LegalItem>{t.rich("rights3", rich)}</LegalItem>
          <LegalItem>{t.rich("rights4", rich)}</LegalItem>
        </LegalList>
        <Callout variant="note" title={t("sharedNoteTitle")}>
          <p>{t.rich("sharedNote", rich)}</p>
        </Callout>
      </LegalSection>

      <LegalSection title={t("howLongTitle")}>
        <p>{t.rich("howLongBody", rich)}</p>
      </LegalSection>

      <LegalSection title={t("cookiesTitle")}>
        <p>{t("cookiesBody")}</p>
      </LegalSection>

      <LegalSection title={t("childrenTitle")}>
        <p>{t("childrenBody")}</p>
      </LegalSection>

      <LegalSection title={t("changesTitle")}>
        <p>{t("privacyChanges")}</p>
      </LegalSection>
    </LegalPage>
  );
}
