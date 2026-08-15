import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/legal-page";
import { MailLink, ProseLink } from "@/components/prose-link";
import { Section } from "@/components/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("privacyMetaTitle"),
    description: t("privacyMetaDescription"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={t("privacyTitle")}
      description={t("privacyDescription")}
      updated={t("updated")}
      footer={<ProseLink href="/terms">{t("termsOfUse")}</ProseLink>}
    >
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

      <Section title={t("whereTitle")}>
        <p className="text-muted-foreground">{t("whereBody")}</p>
      </Section>

      <Section title={t("rightsTitle")}>
        <p className="text-muted-foreground">
          {t.rich("rightsIntro", { email: () => <MailLink /> })}
        </p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>{t("rights1")}</li>
          <li>{t("rights2")}</li>
          <li>{t("rights3")}</li>
          <li>{t("rights4")}</li>
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
    </LegalPage>
  );
}
