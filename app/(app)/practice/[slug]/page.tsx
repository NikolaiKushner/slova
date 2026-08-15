import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { TrainingRunner } from "@/components/practice/training-runner";
import { trainingBySlug } from "@/lib/practice/catalog";

type Params = { params: Promise<{ slug: string }> };

/**
 * One training. The slug decides which — an unknown one is a 404 rather than
 * a page that quietly runs something else.
 */
export default async function TrainingPage({ params }: Params) {
  const { slug } = await params;
  const training = trainingBySlug(slug);
  if (!training) notFound();

  const t = await getTranslations("practice");
  const copy = await getTranslations("trainings");

  return (
    <Page>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={copy(`${training.id}.title`)}
        description={copy(`${training.id}.description`)}
      />

      <TrainingRunner training={training} />
    </Page>
  );
}
