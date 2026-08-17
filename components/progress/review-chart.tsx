"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { EmptyState } from "@/components/empty-state";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { dateFromDayKey } from "@/lib/calendar-date";

const chartConfig = {
  count: {
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ReviewChart({
  data,
  timeZone,
}: {
  data: { day: string; count: number }[];
  timeZone: string;
}) {
  const t = useTranslations("progress");
  const locale = useLocale();
  const hasReviews = data.some((row) => row.count > 0);

  if (!hasReviews) {
    return (
      <EmptyState
        variant="panel"
        title={t("reviewsEmptyTitle")}
        description={t("reviewsEmptyBody")}
        className="border-0 bg-transparent py-8"
      />
    );
  }

  return (
    <ChartContainer
      config={{
        ...chartConfig,
        count: { ...chartConfig.count, label: t("reviews") },
      }}
      className="aspect-[16/7] w-full"
    >
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(value) => formatTick(String(value), locale, timeZone)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const day = payload?.[0]?.payload?.day;
                return typeof day === "string"
                  ? formatDay(day, locale, timeZone)
                  : "";
              }}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

function formatTick(day: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(dateFromDayKey(day, timeZone));
}

function formatDay(day: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateFromDayKey(day, timeZone));
}
