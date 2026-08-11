import { ComingSoon } from "@/components/coming-soon";

export default function TasksProgressPage() {
  return (
    <ComingSoon
      eyebrow="Tasks"
      title="My progress"
      description="What you have actually learned, without turning it into a dashboard."
      planned={[
        "Words moved from new to learning to learned",
        "Streak and time spent, kept to one line",
        "Which topics are lagging behind the rest",
      ]}
    />
  );
}
