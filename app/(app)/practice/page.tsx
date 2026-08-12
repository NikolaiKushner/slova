import Link from "next/link";

import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Card, CardContent } from "@/components/ui/card";
import { TRAININGS } from "@/lib/practice/catalog";

/**
 * The trainings, offered as a list rather than a wall of tiles.
 *
 * Brainstorm sits on its own above the rest because it is a different kind of
 * thing: the others practise words you have met, and it takes words you have
 * not and does not stop until they are learned.
 */
export default function PracticePage() {
  const [brainstorm, ...rest] = TRAININGS;

  return (
    <Page>
      <PageHeader
        eyebrow="Practice"
        title="Trainings"
        description="Every format asks the same words a different way — recognising one is easy, writing it from memory is not."
      />

      <div className="space-y-10">
        <Section title="Learn new words">
          <TrainingLink training={brainstorm} />
        </Section>

        <Section title="Practise what you know">
          <div className="space-y-2">
            {rest.map((training) => (
              <TrainingLink key={training.id} training={training} />
            ))}
          </div>
        </Section>
      </div>
    </Page>
  );
}

function TrainingLink({ training }: { training: (typeof TRAININGS)[number] }) {
  return (
    <Link href={`/practice/${training.slug}`} className="block">
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-1 py-4">
          <span className="font-display text-lg">{training.title}</span>
          <span className="text-muted-foreground text-sm">
            {training.description}
          </span>
          {training.audio && (
            <span className="text-brand-soft text-xs tracking-widest uppercase">
              Needs sound
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
