import { notFound } from "next/navigation";

import { TrainingRunner } from "@/components/practice/training-runner";
import { trainingBySlug } from "@/lib/practice/catalog";

type Params = { params: Promise<{ slug: string }> };

/**
 * One training. The slug decides which — an unknown one is a 404 rather than
 * a page that quietly runs something else.
 *
 * No PageContainer here on purpose. A training is focus mode (§15.2), and the
 * focus shell owns its own width: the question column is 540, not one of the
 * page containers. Wrapping it in one centred the shell inside a narrower box
 * and kept the sticky bar from reaching the edges.
 */
export default async function TrainingPage({ params }: Params) {
  const { slug } = await params;
  const training = trainingBySlug(slug);
  if (!training) notFound();

  return <TrainingRunner training={training} />;
}
