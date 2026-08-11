import { ComingSoon } from "@/components/coming-soon";

export default function TasksPage() {
  return (
    <ComingSoon
      eyebrow="Tasks"
      title="Learning map"
      description="A path through the language, one short step at a time. Steps unlock as you go, so there is always exactly one obvious thing to do next."
      planned={[
        "Steps grouped by level, from Beginner upward",
        "Each step mixes words, grammar and listening on one topic",
        "Locked steps open as the ones before them are finished",
        "Your current level and how far the next one is",
      ]}
    />
  );
}
