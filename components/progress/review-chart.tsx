"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
  const hasPractice = data.some((row) => row.count > 0);

  if (!hasPractice) {
    return (
      <p className="text-muted-foreground text-caption">{t("wordsPractisedEmpty")}</p>
    );
  }

  return (
    <ChartContainer
      config={{
        ...chartConfig,
        count: { ...chartConfig.count, label: t("wordsPractised") },
      }}
      className="aspect-auto h-[200px] w-full"
    >
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={48}
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
