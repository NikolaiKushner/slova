import { StudySession } from "@/components/study-session";
import { PageHeader } from "@/components/page-header";

export default function StudyAllPage() {
  return (
    <>
      <PageHeader
        eyebrow="Study"
        title="Due words"
        description="Review words that are due today. Flip the card, then mark Again or Know it."
      />
      <StudySession />
    </>
  );
}
