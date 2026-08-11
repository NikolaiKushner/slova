import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";

type Props = {
  /** The section this page belongs to — Tasks, Practice, Courses. */
  eyebrow: string;
  title: string;
  description: string;
  /** What this page will hold. Concrete beats "coming soon". */
  planned: readonly string[];
};

/**
 * The placeholder every unbuilt page uses.
 *
 * There is one of these rather than a dozen hand-written empty states, because
 * a dozen would drift and the four sections would stop reading as one app. It
 * is built from `PageHeader` + `Section` like any real page, so when a page
 * gets its content the frame around it does not change.
 */
export function ComingSoon({ eyebrow, title, description, planned }: Props) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Section title="Planned">
        <ul className="space-y-2 rounded-2xl border border-dashed border-border bg-white/50 px-5 py-6 text-muted-foreground">
          {planned.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="text-brand-soft">
                &bull;
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
