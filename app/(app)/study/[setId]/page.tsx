import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOwnedSet } from "@/lib/ownership";
import { notFound } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";

type Props = { params: Promise<{ setId: string }> };

export default async function StudySetPage({ params }: Props) {
  const { setId } = await params;
  const t = await getTranslations("study");
  const set = await getOwnedSet(setId);
  if (!set) notFound();

  return (
    <Page>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={set.title}
        description={t("setDescription")}
        actions={
          <Link
            href={`/dictionary/sets/${set.id}`}
            className="text-sm text-primary hover:underline"
          >
            {t("openSet")}
          </Link>
        }
      />
      <StudySession setId={set.id} />
    </Page>
  );
}
