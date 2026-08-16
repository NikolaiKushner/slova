import { loadCatalog, loadCourse } from "@/lib/courses/load";
import {
  isCefrLevel,
  type CefrLevel,
} from "@/lib/courses/cefr";

export type CatalogCourse = {
  slug: string;
  title: string;
  titleRu: string;
  status: "available";
  href: string;
  level: CefrLevel;
  lessonCount: number;
  estMinutes: number;
  outcomes: string[];
  lessons: string[];
};

export type ComingCourse = {
  slug: string;
  title: string;
  titleRu: string;
  status: "coming";
  level: CefrLevel;
};

export type GrammarCatalog = {
  available: CatalogCourse[];
  coming: ComingCourse[];
};

/**
 * What the Grammar page lists. Available courses take titles and length from
 * the pack; coming ones keep the titles written in catalog.json.
 */
export function grammarCatalog(): GrammarCatalog {
  const available: CatalogCourse[] = [];
  const coming: ComingCourse[] = [];

  for (const group of loadCatalog().groups) {
    const groupLevel = isCefrLevel(group.title) ? group.title : null;

    for (const entry of group.courses) {
      if (entry.status === "coming") {
        coming.push({
          slug: entry.slug,
          title: entry.title,
          titleRu: entry.titleRu,
          status: "coming",
          level: groupLevel ?? "A1",
        });
        continue;
      }

      const loaded = loadCourse(entry.slug);
      available.push({
        slug: entry.slug,
        title: loaded.course.title,
        titleRu: loaded.course.titleRu,
        status: "available",
        href: `/courses/grammar/${entry.slug}`,
        level: loaded.course.level,
        lessonCount: loaded.course.lessons.length,
        estMinutes: loaded.course.estMinutes,
        outcomes: loaded.course.outcomes ?? [],
        lessons: loaded.course.lessons,
      });
    }
  }

  return { available, coming };
}
