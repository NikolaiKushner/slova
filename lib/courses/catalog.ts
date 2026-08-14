import { loadCatalog, loadCourse } from "@/lib/courses/load";

export type CatalogCourse = {
  slug: string;
  title: string;
  titleRu: string;
  status: "available" | "coming";
  href: string | null;
};

export type CatalogGroup = {
  id: string;
  title: string;
  titleRu: string;
  courses: CatalogCourse[];
};

/**
 * What the Grammar page lists. Available courses take their titles from the
 * pack; coming ones keep the titles written in catalog.json, and have no href.
 */
export function grammarCatalog(): CatalogGroup[] {
  return loadCatalog().groups.map((group) => ({
    id: group.id,
    title: group.title,
    titleRu: group.titleRu,
    courses: group.courses.map((entry) => {
      if (entry.status === "coming") {
        return {
          slug: entry.slug,
          title: entry.title,
          titleRu: entry.titleRu,
          status: "coming",
          href: null,
        };
      }

      const loaded = loadCourse(entry.slug);
      return {
        slug: entry.slug,
        title: loaded.course.title,
        titleRu: loaded.course.titleRu,
        status: "available",
        href: `/courses/grammar/${entry.slug}`,
      };
    }),
  }));
}
