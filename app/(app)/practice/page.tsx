import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { getProgress, progressLine } from "@/lib/progress";
import { requestTimeZone } from "@/lib/request-timezone";
import { PracticePage } from "@/components/practice/practice-page";

export default async function PracticeRoute() {
  const session = await auth();
  const t = await getTranslations("practice");

  let line: string | null = null;
  if (session?.user?.id) {
    const tz = await requestTimeZone();
    const progress = await getProgress(session.user.id, new Date(), tz);
    line = progressLine(progress.today, progress.streak, {
      reviewed: (count) => t("reviewedToday", { count }),
      streak: (count) => t("dayStreak", { count }),
    });
  }

  return <PracticePage progressLine={line} />;
}
