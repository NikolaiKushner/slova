import { ComingSoon } from "@/components/coming-soon";

export default function CoursesGrammarPage() {
  return (
    <ComingSoon
      eyebrow="Courses"
      title="Grammar courses"
      description="Longer than a drill, shorter than a textbook. A rule explained, then used."
      planned={[
        "Tenses, articles, conditionals, reported speech",
        "Explanation, examples, then practice on the same page",
        "Progress saved per lesson, resumable",
      ]}
    />
  );
}
