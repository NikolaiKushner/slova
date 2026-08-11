"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteSetButton({ setId }: { setId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this set? The words stay in your dictionary.")) return;
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
      Delete
    </Button>
  );
}
