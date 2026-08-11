import { ComingSoon } from "@/components/coming-soon";

export default function PracticeListeningPage() {
  return (
    <ComingSoon
      eyebrow="Practice"
      title="Listening practice"
      description="Hear a word or a line, type what you heard."
      planned={[
        "Words from your own dictionary, spoken",
        "Short phrases before whole sentences",
        "Replay is free; the answer is not",
      ]}
    />
  );
}
