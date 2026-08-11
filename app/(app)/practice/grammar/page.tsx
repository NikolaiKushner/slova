import { ComingSoon } from "@/components/coming-soon";

export default function PracticeGrammarPage() {
  return (
    <ComingSoon
      eyebrow="Practice"
      title="Grammar practice"
      description="Short drills on one rule at a time — tenses, articles, prepositions."
      planned={[
        "Pick a rule, get ten questions on it",
        "Mistakes come back later, the way due words do",
        "Built from the same review schedule as vocabulary",
      ]}
    />
  );
}
