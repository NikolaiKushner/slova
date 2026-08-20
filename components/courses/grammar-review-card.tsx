import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reviewEstimateMinutes } from "@/lib/courses/review";

/**
 * The one way into Grammar Review, and only when something is due.
 *
 * Not a dashboard tile and not a second product surface: one compact card at
 * the catalog's own width, above the level bar. When nothing is due it is not
 * rendered at all — a disabled or caught-up card would be a permanent piece
 * of furniture reminding a person of a job they have already done.
 */
export async function GrammarReviewCard({
  dueCount,
  courseCount,
}: {
  dueCount: number;
  courseCount: number;
}) {
  const t = await getTranslations("grammarReview");
  if (dueCount <= 0) return null;

  return (
    <Card className="mt-6.5 gap-0 py-0 shadow-none">
      <div className="flex flex-wrap items-center gap-4 px-4.5 py-4">
        <RotateCcw
          className="text-primary size-5 shrink-0"
          strokeWidth={1.8}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-overline text-muted-foreground">{t("eyebrow")}</p>
          <h2 className="text-h4 mt-0.5">{t("cardTitle")}</h2>
          <p className="text-muted-foreground text-caption mt-1">
            {t("cardBody", {
              rules: dueCount,
              courses: courseCount,
              minutes: reviewEstimateMinutes(dueCount),
            })}
          </p>
        </div>
        <Button
          size="lg"
          render={<Link href="/courses/grammar/review" />}
          className="shrink-0"
        >
          {t("start")}
        </Button>
      </div>
    </Card>
  );
}
