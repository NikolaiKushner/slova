"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJsonWithRetry } from "@/lib/client-mutation";
import { MAX_TEXT_CHARS, titleFrom } from "@/lib/texts/draft";

/** Paste something to read — docs/plans/reader.md §6.2. */
export function TextComposer({ atLimit }: { atLimit: boolean }) {
  const t = useTranslations("texts");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooLong = body.length > MAX_TEXT_CHARS;
  const canSave = body.trim().length > 0 && !tooLong && !saving && !atLimit;
  const notice = atLimit
    ? t("atLimit")
    : tooLong
      ? t("tooLong", { max: MAX_TEXT_CHARS })
      : error;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await postJsonWithRetry("/api/texts", {
        body: body.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      setBody("");
      setTitle("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("couldNotSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("bodyPlaceholder")}
          disabled={atLimit}
          lang="en"
          className="min-h-40"
          aria-label={t("bodyLabel")}
        />

        {body.trim() ? (
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={titleFrom(body) || t("titlePlaceholder")}
            aria-label={t("titleLabel")}
          />
        ) : null}

        {notice ? (
          <Alert variant="destructive">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="justify-between gap-4">
        <span className="text-caption text-muted-foreground tabular-nums">
          {body.length > 0
            ? t("charCount", { count: body.length, max: MAX_TEXT_CHARS })
            : null}
        </span>
        <Button onClick={save} disabled={!canSave}>
          {saving ? t("saving") : t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
