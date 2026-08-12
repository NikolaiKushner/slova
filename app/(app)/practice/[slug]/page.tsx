import { notFound } from "next/navigation";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { BrainstormSession } from "@/components/practice/brainstorm-session";
import { PracticeSession } from "@/components/practice/practice-session";
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
    <Page>
      <PageHeader
        eyebrow="Practice"
        title={training.title}
        description={training.description}
      />

      {training.id === "brainstorm" ? (
        <BrainstormSession />
      ) : (
        <PracticeSession kind={training.id} title={training.title} />
      )}
    </Page>
  );
}
