import { getTranslations } from "next-intl/server";
import { StudySession } from "@/components/study-session";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";

export default async function StudyAllPage() {
  const t = await getTranslations("study");

  return (
    <Page>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("dueTitle")}
        description={t("dueDescription")}
      />
      <StudySession />
    </Page>
  );
}
