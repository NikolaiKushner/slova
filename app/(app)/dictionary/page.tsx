import { ComingSoon } from "@/components/coming-soon";

export default function DictionaryPage() {
  return (
    <ComingSoon
      eyebrow="Dictionary"
      title="My words"
      description="Every word you have added, in one list — searchable, filterable, editable in place."
      planned={[
        "One row per word, however many sets it belongs to",
        "Filter by status: new, learning, learned",
        "Search across words and translations",
        "Select several rows to delete them or add them to a set",
      ]}
    />
  );
}
