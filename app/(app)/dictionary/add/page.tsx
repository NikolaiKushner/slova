import { ImportForm } from "@/components/import-form";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";

export default function AddWordsPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Dictionary"
        title="Add words"
        description="English on the left, Russian on the right. Paste a tutor list or type the words — blank translations can be auto-filled before you import."
      />
      <ImportForm />
    </Page>
  );
}
