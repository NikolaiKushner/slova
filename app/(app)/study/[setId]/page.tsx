import Link from "next/link";
import { getOwnedSet } from "@/lib/ownership";
import { notFound } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";

type Props = { params: Promise<{ setId: string }> };

export default async function StudySetPage({ params }: Props) {
  const { setId } = await params;
  const set = await getOwnedSet(setId);
  if (!set) notFound();

  return (
    <Page>
      <PageHeader
        eyebrow="Study"
        title={set.title}
        description="Study due words from this set. Flip the card, then mark Again or Know it."
        actions={
          <Link
            href={`/dictionary/sets/${set.id}`}
            className="text-sm text-teal-800 hover:underline"
          >
            Open set
          </Link>
        }
      />
      <StudySession setId={set.id} />
    </Page>
  );
}
