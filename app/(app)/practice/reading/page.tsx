import { ComingSoon } from "@/components/coming-soon";

export default function PracticeReadingPage() {
  return (
    <ComingSoon
      eyebrow="Practice"
      title="Reading practice"
      description="Short texts built from words you already know, plus a few you don't."
      planned={[
        "Texts sized to your current vocabulary",
        "Tap an unknown word to add it to your dictionary",
        "New words are introduced a few at a time",
      ]}
    />
  );
}
