"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteDeckButton({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this list and all its words?")) return;
    setLoading(true);
    await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
    router.push("/home");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={loading}
      onClick={onDelete}
    >
      Delete
    </Button>
  );
}
