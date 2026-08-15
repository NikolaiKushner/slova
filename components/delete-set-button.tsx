"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function DeleteSetButton({ setId }: { setId: string }) {
  const t = useTranslations("dictionary");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm(t("deleteSetConfirm"))) return;
    setLoading(true);
    await fetch(`/api/sets/${setId}`, { method: "DELETE" });
    router.push("/dictionary/sets");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className="text-muted-foreground hover:text-destructive"
      disabled={loading}
      onClick={onDelete}
    >
      {t("deleteSet")}
    </Button>
  );
}
