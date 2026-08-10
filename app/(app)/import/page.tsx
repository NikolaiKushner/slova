import { ImportForm } from "@/components/import-form";
import { PageHeader } from "@/components/page-header";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Add words"
        description="English on the left, Russian on the right. Paste a tutor list or type the words — blank translations can be auto-filled before you import."
      />
      <ImportForm />
    </>
  );
}
