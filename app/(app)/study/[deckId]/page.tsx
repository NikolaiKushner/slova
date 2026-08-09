import Link from "next/link";
import { getOwnedDeck } from "@/lib/ownership";
import { notFound } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { PageHeader } from "@/components/page-header";

type Props = { params: Promise<{ deckId: string }> };

export default async function StudyDeckPage({ params }: Props) {
  const { deckId } = await params;
  const deck = await getOwnedDeck(deckId);
  if (!deck) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Study"
        title={deck.title}
        description="Study due words from this list. Flip the card, then mark Again or Know it."
        actions={
          <Link
            href={`/decks/${deck.id}`}
            className="text-sm text-teal-800 hover:underline"
          >
            Open list
          </Link>
        }
      />
      <StudySession deckId={deck.id} />
    </>
  );
}
