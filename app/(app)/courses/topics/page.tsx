import { ComingSoon } from "@/components/coming-soon";

export default function CoursesTopicsPage() {
  return (
    <ComingSoon
      eyebrow="Courses"
      title="Topic courses"
      description="Language for a situation — a clinic, an airport, a standup."
      planned={[
        "Vocabulary, phrases and dialogue for one setting",
        "Words land in your dictionary as you go",
        "Built on the same sets the catalog offers",
      ]}
    />
  );
}
