"use client";

import { useLocale, useTranslations } from "next-intl";
import { enUS, ru } from "react-day-picker/locale";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calendarDay } from "@/lib/timezone";
import { cn } from "@/lib/utils";

export function StudyCalendar({
  studiedDayKeys,
  reviewCountsByDay,
  lessonDayKeys,
  storyDayKeys,
  timeZone,
}: {
  studiedDayKeys: string[];
  reviewCountsByDay: Record<string, number>;
  lessonDayKeys: string[];
  storyDayKeys: string[];
  timeZone: string;
}) {
  const t = useTranslations("progress");
  const locale = useLocale();
  const dayPickerLocale = locale === "ru" ? ru : enUS;
  const studiedKeys = new Set(studiedDayKeys);
  const lessonDays = new Set(lessonDayKeys);
  const storyDays = new Set(storyDayKeys);

  return (
    <Calendar
      locale={dayPickerLocale}
      timeZone={timeZone}
      noonSafe
      showOutsideDays={false}
      disabled={{ after: new Date() }}
      onDayClick={() => {}}
      className="w-full [--cell-size:--spacing(8)] @min-[960px]:[--cell-size:--spacing(9)]"
      classNames={{
        root: "w-full",
        months: "relative w-full",
        month: "flex w-full flex-col gap-4",
        month_grid: "flex w-full flex-col",
        weekdays: "flex w-full justify-between",
        weekday:
          "flex size-(--cell-size) items-center justify-center text-[0.8rem] font-normal text-muted-foreground select-none",
        week: "mt-2 flex w-full justify-between",
        day: "group/day relative flex size-(--cell-size) items-center justify-center p-0 text-center select-none",
      }}
      components={{
        DayButton: ({ className, day, children, ...props }) => {
          const key = calendarDay(day.date, timeZone);
          const count = reviewCountsByDay[key] ?? 0;
          const hadLesson = lessonDays.has(key);
          const hadStory = storyDays.has(key);
          const isStudied = studiedKeys.has(key);
          const summary = daySummary(t, count, hadLesson, hadStory);
          const label = isStudied
            ? `${formatDay(day.date, locale, timeZone)}. ${summary}`
            : undefined;

          const button = (
            <CalendarDayButton
              locale={dayPickerLocale}
              day={day}
              {...props}
              {...(label ? { "aria-label": label } : {})}
              className={cn(
                "relative overflow-visible",
                // Explicit rounding, not inherited: CalendarDayButton only
                // rounds a corner for day-picker's own range/selected data
                // attributes, none of which this manual "studied" paint
                // sets — without it, consecutive studied days read as one
                // merged bar instead of separate days.
                isStudied &&
                  "rounded-(--cell-radius) bg-data-learning text-primary-foreground hover:bg-data-learning hover:text-primary-foreground",
                className,
              )}
            >
              {children}
            </CalendarDayButton>
          );

          if (!isStudied || !summary) return button;

          return (
            <Tooltip>
              <TooltipTrigger render={button} />
              <TooltipContent className="coarse:hidden">
                {formatDay(day.date, locale, timeZone)}
                {" · "}
                {summary}
              </TooltipContent>
            </Tooltip>
          );
        },
      }}
    />
  );
}

function daySummary(
  t: (
    key: "wordsPractisedOnDay" | "lessonCompleted" | "storyRead",
    values?: { count: number },
  ) => string,
  count: number,
  hadLesson: boolean,
  hadStory: boolean,
): string {
  const parts: string[] = [];
  if (count > 0) parts.push(t("wordsPractisedOnDay", { count }));
  if (hadLesson) parts.push(t("lessonCompleted"));
  if (hadStory) parts.push(t("storyRead"));
  return parts.join(" · ");
}

function formatDay(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
