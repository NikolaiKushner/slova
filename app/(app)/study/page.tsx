import { getTranslations } from "next-intl/server";
import { StudySession } from "@/components/study-session";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";

export default async function StudyAllPage() {
  const t = await getTranslations("study");

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("dueTitle")}
        description={t("dueDescription")}
      />
      <StudySession />
    </PageContainer>
  );
}
