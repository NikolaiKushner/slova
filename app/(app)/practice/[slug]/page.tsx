import { notFound } from "next/navigation";

import { TrainingRunner } from "@/components/practice/training-runner";
import { trainingBySlug } from "@/lib/practice/catalog";
import { toSourceState } from "@/lib/practice/source";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * One training. The slug decides which — an unknown one is a 404 rather than
 * a page that quietly runs something else.
 *
 * What to practise arrives in the query string, chosen on the trainings page.
 * That is what removed the second screen: the session no longer has to ask,
 * and the address is now sharable and survives a reload. An absent or
 * nonsense state falls back to "due" rather than erroring — a bad query string
 * is not worth a broken page.
 *
 * No PageContainer here on purpose. A training is focus mode (§15.2), and the
 * focus shell owns its own width: the question column is 540, not one of the
 * page containers.
 */
export default async function TrainingPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const training = trainingBySlug(slug);
  if (!training) notFound();

  const query = await searchParams;
  const raw = query.set;
  const setIds = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);

  return (
    <TrainingRunner
      training={training}
      source={{ state: toSourceState(query.state), setIds }}
    />
  );
}
