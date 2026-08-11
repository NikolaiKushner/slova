import { ComingSoon } from "@/components/coming-soon";

export default function CoursesMyPage() {
  return (
    <ComingSoon
      eyebrow="Courses"
      title="My courses"
      description="Courses you have started, and where you left off."
      planned={[
        "Resume from the last finished lesson",
        "Courses you finished, kept for review",
        "Nothing here until you start one",
      ]}
    />
  );
}
