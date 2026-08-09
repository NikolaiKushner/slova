import { ImportForm } from "@/components/import-form";
import { PageHeader } from "@/components/page-header";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Add words"
        description="Paste a tutor list or type words. Fill translations yourself, or auto-translate the empty ones — then review and import."
      />
      <ImportForm />
    </>
  );
}
