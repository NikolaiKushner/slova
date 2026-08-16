"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Check,
  ChevronRight,
  Search,
  SearchX,
} from "lucide-react";

import {
  CEFR_LEVELS,
  isCefrLevel,
  persistLevelPref,
  type CefrLevel,
  type LevelSource,
} from "@/lib/courses/cefr";
import type { ComingCourse } from "@/lib/courses/catalog";
import {
  catalogRowHref,
  defaultOpenLevels,
  filterAvailable,
  filterComing,
  firstLevelWithCourses,
  groupCourses,
  isAboveLevel,
  shouldShowCatalogChrome,
  smallCatalogList,
  sortFlat,
  useFlatList,
  type CatalogCourseView,
  type CatalogScope,
  type CatalogSort,
  type LevelGroup,
} from "@/lib/courses/catalog-view";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function GrammarCatalog({
  courses,
  coming,
  initialLevel,
  initialSource,
}: {
  courses: CatalogCourseView[];
  coming: ComingCourse[];
  initialLevel: CefrLevel;
  initialSource: LevelSource;
}) {
  const t = useTranslations("courses");
  const [level, setLevel] = useState(initialLevel);
  const [source, setSource] = useState(initialSource);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSort>("rec");
  const [scope, setScope] = useState<CatalogScope>("all");

  const chrome = shouldShowCatalogChrome(courses);
  const filtered = useMemo(
    () =>
      chrome
        ? filterAvailable(courses, query, scope, level)
        : smallCatalogList(courses, level),
    [chrome, courses, query, scope, level],
  );
  const soon = useMemo(
    () => filterComing(coming, chrome ? query : "", level),
    [coming, query, level, chrome],
  );
  const searching = chrome && query.trim() !== "";
  const flatFromChrome = useFlatList(sort, query, scope);
  const flat = !chrome || flatFromChrome;
  const groups = flat ? [] : groupCourses(filtered, sort, level);
  const sorted = flat
    ? chrome
      ? sortFlat(filtered, sort)
      : filtered
    : [];
  const nothingStarted = courses.every((course) => course.doneCount === 0);
  const fallbackLevel = firstLevelWithCourses(courses);

  function chooseLevel(next: string | undefined) {
    if (!isCefrLevel(next) || next === level) return;
    setLevel(next);
    setSource("chosen");
    persistLevelPref(next, "chosen");
  }

  function resetFilters() {
    setQuery("");
    setScope("all");
  }

  const countLabel =
    searching || scope === "mine"
      ? t("courseCount", { count: filtered.length })
      : t("courseCountTotal", { count: courses.length });

  const emptyLevel =
    filtered.length === 0 && !searching ? (
      <EmptyState
        title={t("emptyLevelTitle", { level })}
        description={
          fallbackLevel && fallbackLevel !== level
            ? t("emptyLevelDescription", { level: fallbackLevel })
            : t("emptyLevelNone")
        }
        action={
          fallbackLevel && fallbackLevel !== level ? (
            <Button variant="outline" onClick={() => chooseLevel(fallbackLevel)}>
              {t("showLevel", { level: fallbackLevel })}
            </Button>
          ) : undefined
        }
        className="mt-5.5"
      />
    ) : null;

  return (
    <div>
      <LevelBar
        level={level}
        source={source}
        onLevel={chooseLevel}
      />

      {chrome && nothingStarted && !searching ? (
        <Card className="mt-5.5 gap-1.5 px-6 py-5.5 shadow-none">
          <h2 className="text-h3">{t("whatIsACourse")}</h2>
          <p className="text-muted-foreground text-body-sm">
            {t("whatIsACourseBody")}
          </p>
        </Card>
      ) : null}

      {chrome ? (
        <div className="mt-5.5 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-48 max-w-xs flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchCourses")}
              aria-label={t("searchCourses")}
              className="pl-9"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(value) => {
              if (
                value === "rec" ||
                value === "level" ||
                value === "name" ||
                value === "started"
              ) {
                setSort(value);
              }
            }}
          >
            <SelectTrigger className="min-w-44" aria-label={t("sortLabel")}>
              <SelectValue>{t(`sort.${sort}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rec">{t("sort.rec")}</SelectItem>
              <SelectItem value="level">{t("sort.level")}</SelectItem>
              <SelectItem value="name">{t("sort.name")}</SelectItem>
              <SelectItem value="started">{t("sort.started")}</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup
            value={[scope]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "all" || next === "mine") setScope(next);
            }}
            aria-label={t("scope")}
            spacing={1}
            className="bg-muted border-border rounded-lg border p-0.75"
          >
            <ToggleGroupItem
              value="all"
              className="coarse:h-11 h-9 rounded-md px-3.5 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
            >
              {t("scopeAll")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="mine"
              className="coarse:h-11 h-9 rounded-md px-3.5 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
            >
              {t("scopeMine")}
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-muted-foreground text-caption ms-auto whitespace-nowrap tabular-nums">
            {countLabel}
          </span>
        </div>
      ) : null}

      {filtered.length === 0 && searching && soon.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" onClick={resetFilters}>
              {t("resetFilters")}
            </Button>
          }
          className="mt-2.5"
        />
      ) : filtered.length === 0 && searching ? null : filtered.length === 0 ? (
        emptyLevel
      ) : flat ? (
        <>
          {chrome ? (
            <CatalogHeading>
              {searching ? t("found") : t("coursesHeading")}
            </CatalogHeading>
          ) : null}
          <CourseList
            courses={sorted}
            userLevel={level}
            className={chrome ? undefined : "mt-5.5"}
          />
        </>
      ) : (
        <Accordion
          key={`${level}-${sort}`}
          multiple
          defaultValue={defaultOpenLevels(groups)}
          className="mt-10 gap-8"
        >
          {groups.map((group) => (
            <LevelShelf key={group.level} group={group} userLevel={level} />
          ))}
        </Accordion>
      )}

      {soon.length > 0 ? <SoonSection courses={soon} /> : null}
    </div>
  );
}

function LevelBar({
  level,
  source,
  onLevel,
}: {
  level: CefrLevel;
  source: LevelSource;
  onLevel: (value: string | undefined) => void;
}) {
  const t = useTranslations("courses");

  return (
    <Card className="mt-6.5 py-0 shadow-none">
      <div className="flex flex-wrap items-center gap-4 px-4.5 py-4">
        <span className="text-overline text-muted-foreground">
          {t("yourLevel")}
        </span>
        <ToggleGroup
          value={[level]}
          onValueChange={(value) => onLevel(value[0])}
          aria-label={t("yourLevel")}
          spacing={1}
          className="bg-muted border-border rounded-lg border p-0.75"
        >
          {CEFR_LEVELS.map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              className="coarse:h-11 h-9 min-w-11 rounded-md px-4 font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {source === "assumed" ? (
          <p className="text-muted-foreground text-caption min-w-56 flex-1">
            {t("levelNote.assumed", { level })}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function CatalogHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-9 mb-3.5 flex items-center gap-3">
      <h2 className="text-overline text-eyebrow">{children}</h2>
      <Separator className="flex-1" />
    </div>
  );
}

function LevelShelf({
  group,
  userLevel,
}: {
  group: LevelGroup;
  userLevel: CefrLevel;
}) {
  const t = useTranslations("courses");
  const name =
    group.kind === "mine"
      ? t("groupMine")
      : group.kind === "below"
        ? t("groupBelow")
        : t("groupAbove");
  const note = group.doneCount
    ? t("groupNoteDone", {
        courses: t("courseCount", { count: group.courses.length }),
        done: group.doneCount,
      })
    : t("courseCount", { count: group.courses.length });

  return (
    <AccordionItem value={group.level} className="border-0">
      <AccordionTrigger className="hover:bg-muted coarse:min-h-11 items-center gap-3 rounded-lg px-4 py-3 hover:no-underline">
        <Badge
          variant={group.kind === "mine" ? "secondary" : "outline"}
          className="rounded-sm tracking-[0.08em]"
        >
          {group.level}
        </Badge>
        <span className="text-body-sm font-medium">{name}</span>
        <span className="text-muted-foreground text-caption font-normal">
          {note}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-4 pb-0 [&_a]:no-underline">
        <CourseList courses={group.courses} userLevel={userLevel} />
      </AccordionContent>
    </AccordionItem>
  );
}

function CourseList({
  courses,
  userLevel,
  className,
}: {
  courses: CatalogCourseView[];
  userLevel: CefrLevel;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <ul className="divide-border-subtle divide-y">
        {courses.map((course) => (
          <li key={course.slug}>
            <CourseRow course={course} userLevel={userLevel} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CourseRow({
  course,
  userLevel,
}: {
  course: CatalogCourseView;
  userLevel: CefrLevel;
}) {
  const t = useTranslations("courses");
  const common = useTranslations("common");
  const above = isAboveLevel(course.level, userLevel);
  const pct = course.lessonCount
    ? Math.round((course.doneCount / course.lessonCount) * 100)
    : 0;
  const action = course.completed
    ? t("passed")
    : course.doneCount > 0
      ? common("continue")
      : common("start");

  return (
    <Link
      href={catalogRowHref(course)}
      className={cn(
        "focus-ring coarse:min-h-13 flex items-center gap-4 px-4.5 py-3.5 transition-colors hover:bg-muted/80",
        above && "opacity-70",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-h4" lang="en">
            {course.title}
          </span>
          <Badge
            variant={course.level === userLevel ? "secondary" : "outline"}
            className="rounded-xs px-1.5 tracking-[0.08em]"
          >
            {course.level}
          </Badge>
          {above ? (
            <span className="text-muted-foreground text-caption rounded-xs border border-border px-1.5 py-px">
              {t("aboveYourLevel")}
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground text-caption block">
          {course.titleRu}
        </span>
      </span>
      <span className="w-36 shrink-0 text-right">
        {course.completed ? (
          <span className="text-success text-caption inline-flex items-center justify-end gap-1">
            <Check className="size-3.5" aria-hidden />
            {t("passed")}
          </span>
        ) : course.doneCount > 0 ? (
          <span className="block">
            <Progress value={pct} className="mb-1.5 w-full gap-0" />
            <span className="text-muted-foreground text-caption tabular-nums">
              {t("lessonsProgress", {
                done: course.doneCount,
                total: course.lessonCount,
              })}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground text-caption">
            {t("lessonsCount", { count: course.lessonCount })}
          </span>
        )}
      </span>
      <span className="text-muted-foreground text-caption hidden w-16 shrink-0 text-right whitespace-nowrap sm:block">
        {t("minutesShort", { minutes: course.estMinutes })}
      </span>
      {course.completed ? null : (
        <span className="text-body-sm shrink-0 font-medium">{action}</span>
      )}
      <ChevronRight className="text-border size-4 shrink-0" aria-hidden />
    </Link>
  );
}

function SoonSection({ courses }: { courses: ComingCourse[] }) {
  const t = useTranslations("courses");

  return (
    <Accordion className="mt-9">
      <AccordionItem value="soon" className="border-0">
        <AccordionTrigger className="hover:bg-muted coarse:min-h-11 items-center gap-3 rounded-lg px-4 py-3 hover:no-underline">
          <span className="text-overline text-eyebrow">{t("soon")}</span>
          <span className="text-muted-foreground text-caption font-normal">
            {t("courseCount", { count: courses.length })}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-0">
          <SoonGrid courses={courses} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function SoonGrid({ courses }: { courses: ComingCourse[] }) {
  return (
    <ul className="bg-border grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border sm:grid-cols-2">
      {courses.map((course) => (
        <li
          key={course.slug}
          className="bg-muted flex items-baseline justify-between gap-3.5 px-4.5 py-3.5 last:odd:col-span-full"
        >
          <span className="text-h4 text-muted-foreground" lang="en">
            {course.title}
          </span>
          <span className="text-muted-foreground text-caption text-right">
            {course.titleRu}
          </span>
        </li>
      ))}
    </ul>
  );
}
