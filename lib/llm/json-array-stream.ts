/**
 * Turns a JSON document arriving in pieces into finished objects, one at a
 * time.
 *
 * The point is the import table filling in row by row. `JSON.parse` needs the
 * whole document, so waiting for it means a spinner for the length of the
 * response; here each object is handed over the moment its closing brace
 * arrives.
 *
 * It is a brace counter, not a parser. It knows two things — how deep it is in
 * objects, and whether it is inside a string literal — because those are
 * exactly what it takes to find the boundaries of an object without
 * understanding what is in it. A `}` inside `"такой }"` closes nothing, and
 * `\"` inside a string does not end it.
 *
 * Chunk boundaries are meaningless to it: state lives on the instance, so a
 * document cut mid-escape-sequence scans the same as one arriving whole.
 */

type Options = {
  /**
   * The object nesting depth to emit at. Our response is
   * `{"translations": [{…}, {…}]}` — the wrapper is depth 1, the items are
   * depth 2. Arrays do not count; only braces do.
   */
  depth?: number;
};

export class JsonArrayStream<T = unknown> {
  private readonly targetDepth: number;

  private depth = 0;
  private inString = false;
  private escaped = false;
  private buffer: string | null = null;

  constructor(options: Options = {}) {
    this.targetDepth = options.depth ?? 2;
  }

  /** True when an object was opened and the stream ended before it closed. */
  get pending(): boolean {
    return this.buffer !== null;
  }

  /** Feed a chunk; get back every object that became complete inside it. */
  push(chunk: string): T[] {
    const finished: T[] = [];

    for (const char of chunk) {
      if (this.buffer !== null) this.buffer += char;

      if (this.inString) {
        if (this.escaped) {
          // Whatever follows a backslash is literal — including `"` and `\`.
          this.escaped = false;
        } else if (char === "\\") {
          this.escaped = true;
        } else if (char === '"') {
          this.inString = false;
        }
        continue;
      }

      if (char === '"') {
        this.inString = true;
      } else if (char === "{") {
        this.depth++;
        if (this.depth === this.targetDepth && this.buffer === null) {
          this.buffer = "{";
        }
      } else if (char === "}") {
        if (this.depth === this.targetDepth && this.buffer !== null) {
          finished.push(JSON.parse(this.buffer) as T);
          this.buffer = null;
        }
        this.depth--;
      }
    }

    return finished;
  }
}
