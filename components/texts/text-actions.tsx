"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";

export function DeleteTextButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const t = useTranslations("texts");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/texts/${id}`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <ConfirmDelete
      title={t("deleteTitle")}
      description={t("deleteBody")}
      onConfirm={remove}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        aria-label={t("deleteText", { title })}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 strokeWidth={1.75} />
      </Button>
    </ConfirmDelete>
  );
}
