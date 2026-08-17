import catalogJson from "@/content/courses/catalog.json";
import irregularVerbsBank from "@/content/courses/irregular-verbs/bank.json";
import irregularVerbsCourse from "@/content/courses/irregular-verbs/course.json";
import irregularVerbsSame from "@/content/courses/irregular-verbs/01-same.json";
import irregularVerbsTwoAlike from "@/content/courses/irregular-verbs/02-two-alike.json";
import irregularVerbsVowel from "@/content/courses/irregular-verbs/03-vowel.json";
import irregularVerbsEn from "@/content/courses/irregular-verbs/04-en.json";
import irregularVerbsSpecial from "@/content/courses/irregular-verbs/05-special.json";
import irregularVerbsTest from "@/content/courses/irregular-verbs/99-test.json";
import irregularVerbsRules from "@/content/courses/irregular-verbs/rules.json";
import presentSimpleBank from "@/content/courses/present-simple/bank.json";
import presentSimpleCourse from "@/content/courses/present-simple/course.json";
import presentSimpleForms from "@/content/courses/present-simple/01-forms.json";
import presentSimpleUse from "@/content/courses/present-simple/02-use.json";
import presentSimpleSpelling from "@/content/courses/present-simple/03-spelling.json";
import presentSimpleNegatives from "@/content/courses/present-simple/04-negatives.json";
import presentSimpleQuestions from "@/content/courses/present-simple/05-questions.json";
import presentSimpleTest from "@/content/courses/present-simple/99-test.json";
import presentSimpleRules from "@/content/courses/present-simple/rules.json";
import toBePresentBank from "@/content/courses/to-be-present/bank.json";
import toBePresentCourse from "@/content/courses/to-be-present/course.json";
import toBePresentForms from "@/content/courses/to-be-present/01-forms.json";
import toBePresentUse from "@/content/courses/to-be-present/02-use.json";
import toBePresentNegatives from "@/content/courses/to-be-present/03-negatives.json";
import toBePresentQuestions from "@/content/courses/to-be-present/04-questions.json";
import toBePresentTest from "@/content/courses/to-be-present/99-test.json";
import toBePresentRules from "@/content/courses/to-be-present/rules.json";
import {
  acceptedAnswers,
  bankSchema,
  catalogSchema,
  courseSchema,
  isExerciseBlock,
  lessonSchema,
  rulesFileSchema,
  type Catalog,
  type CourseMeta,
  type Exercise,
  type Lesson,
  type Rule,
} from "@/content/courses/schema";
import { LESSON_PRACTICE_POOL_MIN, TEST_SITTING_SIZE } from "@/lib/courses/practice";

/**
 * Courses on disk, parsed and checked.
 *
 * JSON is imported rather than read from the filesystem so the files travel
 * with the serverless bundle — the same reason the lexicon seed is a file
 * in the repo, not a URL. Adding a course means adding an import here.
 */

const BANK_PER_RULE = 2;

type CoursePackJson = {
  course: unknown;
  rules: unknown;
  lessons: Record<string, unknown>;
  bank: unknown;
};

const PACKS: Record<string, CoursePackJson> = {
  "present-simple": {
    course: presentSimpleCourse,
    rules: presentSimpleRules,
    lessons: {
      forms: presentSimpleForms,
      use: presentSimpleUse,
      spelling: presentSimpleSpelling,
      negatives: presentSimpleNegatives,
      questions: presentSimpleQuestions,
      test: presentSimpleTest,
    },
    bank: presentSimpleBank,
  },
  "to-be-present": {
    course: toBePresentCourse,
    rules: toBePresentRules,
    lessons: {
      forms: toBePresentForms,
      use: toBePresentUse,
      negatives: toBePresentNegatives,
      questions: toBePresentQuestions,
      test: toBePresentTest,
    },
    bank: toBePresentBank,
  },
  "irregular-verbs": {
    course: irregularVerbsCourse,
    rules: irregularVerbsRules,
    lessons: {
      same: irregularVerbsSame,
      "two-alike": irregularVerbsTwoAlike,
      vowel: irregularVerbsVowel,
      en: irregularVerbsEn,
      special: irregularVerbsSpecial,
      test: irregularVerbsTest,
    },
    bank: irregularVerbsBank,
  },
};

export type LoadedCourse = {
  course: CourseMeta;
  rules: Rule[];
  lessons: Lesson[];
  bank: Exercise[];
};

export class CourseContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseContentError";
  }
}

export function loadCatalog(): Catalog {
  const parsed = catalogSchema.safeParse(catalogJson);
  if (!parsed.success) {
    throw new CourseContentError(
      `catalog.json: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return parsed.data;
}

export function loadCourse(slug: string): LoadedCourse {
  const pack = PACKS[slug];
  if (!pack) {
    throw new CourseContentError(`No course pack for slug "${slug}".`);
  }
  return parsePack(slug, pack);
}

export function listedAvailableSlugs(catalog: Catalog = loadCatalog()): string[] {
  return catalog.groups.flatMap((group) =>
    group.courses
      .filter((entry) => entry.status === "available")
      .map((entry) => entry.slug),
  );
}

export function parsePack(slug: string, pack: CoursePackJson): LoadedCourse {
  const course = parseOrThrow(courseSchema, pack.course, `${slug}/course.json`);
  if (course.slug !== slug) {
    throw new CourseContentError(
      `${slug}/course.json slug is "${course.slug}", expected "${slug}".`,
    );
  }

  const rules = parseOrThrow(rulesFileSchema, pack.rules, `${slug}/rules.json`);
  const bank = parseOrThrow(bankSchema, pack.bank, `${slug}/bank.json`);

  const lessons: Lesson[] = [];
  for (const lessonSlug of course.lessons) {
    const raw = pack.lessons[lessonSlug];
    if (raw === undefined) {
      throw new CourseContentError(
        `${slug}: course lists lesson "${lessonSlug}" but no file is registered.`,
      );
    }
    const lesson = parseOrThrow(
      lessonSchema,
      raw,
      `${slug}/${lessonSlug}.json`,
    );
    if (lesson.slug !== lessonSlug) {
      throw new CourseContentError(
        `${slug}/${lessonSlug}.json slug is "${lesson.slug}".`,
      );
    }
    lessons.push(lesson);
  }

  assertCourse(slug, { course, rules, lessons, bank });
  return { course, rules, lessons, bank };
}

function parseOrThrow<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } },
  data: unknown,
  label: string,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new CourseContentError(
      `${label}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return parsed.data;
}

function assertCourse(slug: string, loaded: LoadedCourse): void {
  const ruleIds = new Set(loaded.rules.map((rule) => rule.id));
  if (ruleIds.size !== loaded.rules.length) {
    throw new CourseContentError(`${slug}: duplicate rule id.`);
  }

  const exercises: Exercise[] = [
    ...loaded.lessons.flatMap((lesson) =>
      lesson.blocks.filter(isExerciseBlock),
    ),
    ...loaded.bank,
  ];

  const seen = new Set<string>();
  const usedRuleIds = new Set<string>();

  for (const exercise of exercises) {
    if (seen.has(exercise.id)) {
      throw new CourseContentError(
        `${slug}: duplicate exercise id "${exercise.id}".`,
      );
    }
    seen.add(exercise.id);

    if (!ruleIds.has(exercise.ruleId)) {
      throw new CourseContentError(
        `${slug}: exercise "${exercise.id}" names unknown rule "${exercise.ruleId}".`,
      );
    }
    usedRuleIds.add(exercise.ruleId);

    if (
      (exercise.kind === "choice" || exercise.kind === "pick-sentence") &&
      !exercise.options.includes(exercise.answer)
    ) {
      throw new CourseContentError(
        `${slug}: exercise "${exercise.id}" answer is not in options.`,
      );
    }

    const answers = acceptedAnswers(exercise).map(normalizeAnswer);
    if (new Set(answers).size !== answers.length) {
      throw new CourseContentError(
        `${slug}: exercise "${exercise.id}" lists the same accepted answer twice.`,
      );
    }
  }

  const lessonRuleIds = new Set(
    loaded.lessons.flatMap((lesson) =>
      lesson.blocks.filter(isExerciseBlock).map((block) => block.ruleId),
    ),
  );

  for (const ruleId of lessonRuleIds) {
    const inBank = loaded.bank.filter((item) => item.ruleId === ruleId).length;
    if (inBank < BANK_PER_RULE) {
      throw new CourseContentError(
        `${slug}: rule "${ruleId}" needs at least ${BANK_PER_RULE} bank exercises, has ${inBank}.`,
      );
    }
  }

  for (const lesson of loaded.lessons) {
    const inLesson = lesson.blocks.filter(isExerciseBlock).length;
    if (lesson.slug === "test") {
      if (inLesson < TEST_SITTING_SIZE) {
        throw new CourseContentError(
          `${slug}: test needs at least ${TEST_SITTING_SIZE} exercises, has ${inLesson}.`,
        );
      }
      continue;
    }
    if (inLesson < LESSON_PRACTICE_POOL_MIN) {
      throw new CourseContentError(
        `${slug}: lesson "${lesson.slug}" needs at least ${LESSON_PRACTICE_POOL_MIN} exercises to deal a sitting, has ${inLesson}.`,
      );
    }
  }
}

function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase();
}
