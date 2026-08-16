import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/app-shell";
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

  return (
    <PageContainer>
      <TrainingRunner training={training} />
    </PageContainer>
  );
}
