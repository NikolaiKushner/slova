export type ParsedCard = {
  front: string;
  back: string;
};

function normalizeLine(line: string): string {
  return line.replace(/^\uFEFF/, "").trim();
}

function splitPair(line: string): [string, string] | null {
  const separators = ["\t", " — ", " – ", " - ", " —", "–", "—", ";", ","];
  for (const sep of separators) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + sep.length).trim();
      if (front && back) return [front, back];
    }
  }
  return null;
}

/** Parse tutor-style word lists into flashcards.
 *  Supports pairs (`word — translation`) and single words (back empty). */
export function parseImportText(text: string): {
  cards: { front: string; back: string }[];
  skipped: number;
} {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const cards: { front: string; back: string }[] = [];
  let skipped = 0;

  for (const line of lines) {
    const header =
      /^(front|term|word)\s*[,;\t]\s*(back|translation|definition)$/i;
    if (header.test(line)) {
      continue;
    }
    const pair = splitPair(line);
    if (pair) {
      cards.push({ front: pair[0], back: pair[1] });
      continue;
    }
    // Single word / phrase → front only (translation filled later)
    if (line.length > 0) {
      cards.push({ front: line, back: "" });
      continue;
    }
    skipped += 1;
  }

  return { cards, skipped };
}
