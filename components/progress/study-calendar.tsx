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
  timeZone,
}: {
  studiedDayKeys: string[];
  reviewCountsByDay: Record<string, number>;
  lessonDayKeys: string[];
  timeZone: string;
}) {
  const t = useTranslations("progress");
  const locale = useLocale();
  const dayPickerLocale = locale === "ru" ? ru : enUS;
  const studiedKeys = new Set(studiedDayKeys);
  const lessonDays = new Set(lessonDayKeys);

  return (
    <Calendar
      locale={dayPickerLocale}
      timeZone={timeZone}
      noonSafe
      showOutsideDays={false}
      disabled={{ after: new Date() }}
      onDayClick={() => {}}
      className="mx-auto w-fit [--cell-size:--spacing(8)] @min-[960px]:[--cell-size:--spacing(9)]"
      classNames={{
        root: "w-fit",
        months: "relative w-fit",
        month: "flex w-fit flex-col gap-4",
        month_grid: "flex w-fit flex-col",
        weekdays: "flex w-fit gap-1",
        weekday:
          "flex size-(--cell-size) items-center justify-center text-[0.8rem] font-normal text-muted-foreground select-none",
        week: "mt-2 flex w-fit gap-1",
        day: "group/day relative flex size-(--cell-size) items-center justify-center p-0 text-center select-none",
      }}
      components={{
        DayButton: ({ className, day, children, ...props }) => {
          const key = calendarDay(day.date, timeZone);
          const count = reviewCountsByDay[key] ?? 0;
          const hadLesson = lessonDays.has(key);
          const isStudied = studiedKeys.has(key);
          const summary = daySummary(t, count, hadLesson);
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
                isStudied &&
                  "bg-data-learning text-primary-foreground hover:bg-data-learning hover:text-primary-foreground",
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
  t: (key: "wordsPractisedOnDay" | "lessonCompleted", values?: { count: number }) => string,
  count: number,
  hadLesson: boolean,
): string {
  const parts: string[] = [];
  if (count > 0) parts.push(t("wordsPractisedOnDay", { count }));
  if (hadLesson) parts.push(t("lessonCompleted"));
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
