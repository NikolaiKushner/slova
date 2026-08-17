"use client";

import { useLocale, useTranslations } from "next-intl";
import { enUS, ru } from "react-day-picker/locale";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { dateFromDayKey } from "@/lib/calendar-date";
import { calendarDay } from "@/lib/timezone";
import { cn } from "@/lib/utils";

export function StudyCalendar({
  studiedDayKeys,
  reviewCountsByDay,
  timeZone,
}: {
  studiedDayKeys: string[];
  reviewCountsByDay: Record<string, number>;
  timeZone: string;
}) {
  const t = useTranslations("progress");
  const locale = useLocale();
  const dayPickerLocale = locale === "ru" ? ru : enUS;
  const studied = studiedDayKeys.map((key) => dateFromDayKey(key, timeZone));

  return (
    <Calendar
      locale={dayPickerLocale}
      timeZone={timeZone}
      noonSafe
      showOutsideDays={false}
      disabled={{ after: new Date() }}
      modifiers={{ studied }}
      className="w-full max-w-full [--cell-size:--spacing(8)] sm:[--cell-size:--spacing(9)]"
      classNames={{
        root: "w-full",
        months: "w-full",
        month: "w-full",
      }}
      components={{
        DayButton: ({ className, modifiers, day, ...props }) => {
          const key = calendarDay(day.date, timeZone);
          const count = reviewCountsByDay[key] ?? 0;
          const isStudied = Boolean(modifiers.studied);
          const label = isStudied
            ? `${formatDay(day.date, locale, timeZone)}. ${
                count > 0 ? t("reviewsOnDay", { count }) : t("lessonOnDay")
              }`
            : undefined;

          const button = (
            <CalendarDayButton
              locale={dayPickerLocale}
              day={day}
              modifiers={modifiers}
              aria-label={label}
              className={cn(
                isStudied &&
                  "bg-data-learning text-foreground hover:bg-data-learning hover:text-foreground",
                className,
              )}
              {...props}
            />
          );

          if (!isStudied) return button;

          return (
            <Tooltip>
              <TooltipTrigger render={button} />
              <TooltipContent className="coarse:hidden">
                {formatDay(day.date, locale, timeZone)}
                {" · "}
                {count > 0 ? t("reviewsOnDay", { count }) : t("lessonOnDay")}
              </TooltipContent>
            </Tooltip>
          );
        },
      }}
    />
  );
}

function formatDay(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
