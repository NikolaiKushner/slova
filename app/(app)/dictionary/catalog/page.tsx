import { ComingSoon } from "@/components/coming-soon";

export default function DictionaryCatalogPage() {
  return (
    <ComingSoon
      eyebrow="Dictionary"
      title="Ready-made sets"
      description="Sets worth studying that you did not have to type in."
      planned={[
        "Themed sets: phrasal verbs, irregular verbs, travel, work",
        "Preview the words before taking a set",
        "Taking a set never duplicates words you already have",
      ]}
    />
  );
}
