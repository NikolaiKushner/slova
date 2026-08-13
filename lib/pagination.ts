/**
 * Which page buttons to show, with gaps collapsed to an ellipsis.
 *
 * Always includes the first and last page, and the current page with one
 * neighbour either side. Seven pages or fewer is short enough to list in full.
 */
export type PaginationItem = number | "ellipsis";

export function paginationItems(
  page: number,
  pages: number,
): PaginationItem[] {
  if (pages <= 0) return [];
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  const include = new Set<number>([1, pages]);
  for (let n = page - 1; n <= page + 1; n++) {
    if (n >= 1 && n <= pages) include.add(n);
  }

  const sorted = [...include].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;
    const previous = sorted[i - 1];
    if (previous !== undefined && current - previous > 1) {
      items.push("ellipsis");
    }
    items.push(current);
  }
  return items;
}
