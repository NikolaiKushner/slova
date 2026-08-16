/**
 * Builds immutable course recordings without putting provider URLs in lesson
 * JSON. Each successful upload is persisted immediately with an atomic rename,
 * so a later provider failure cannot make the next run pay for it again.
 */
import { config } from "dotenv";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  AUDIO_PROFILES,
  TTS_SOURCE,
  type AudioProfileName,
} from "@/lib/audio/profile";
import { createR2Storage } from "@/lib/audio/r2";
import { synthesizeSpeech } from "@/lib/audio/tts";
import {
  parseCourseAudioManifest,
  type CourseAudioManifest,
} from "@/lib/courses/audio";
import { courseAudioObjectKey } from "@/lib/courses/audio-key";
import {
  listedAvailableSlugs,
  loadCatalog,
  loadCourse,
  type LoadedCourse,
} from "@/lib/courses/load";
import { speakText } from "@/lib/courses/speak-text";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "content/courses/audio-manifest.json",
);
const PRICE_PER_MILLION_CHARACTERS = 15;
const SAMPLE_SIZE = 5;

type Options = {
  dryRun: boolean;
  slow: boolean;
};

type PendingRecording = {
  text: string;
  profile: AudioProfileName;
};

export function collectCourseAudioTexts(
  courses: readonly Pick<LoadedCourse, "lessons" | "bank">[],
): string[] {
  const texts = new Set<string>();

  for (const course of courses) {
    for (const lesson of course.lessons) {
      for (const block of lesson.blocks) {
        if (block.type === "example") texts.add(speakText(block.en));
        if (block.type === "exercise" && block.kind === "transform") {
          texts.add(speakText(block.source));
        }
      }
    }

    for (const exercise of course.bank) {
      if (exercise.kind === "transform") texts.add(speakText(exercise.source));
    }
  }

  return [...texts].filter(Boolean).sort((a, b) => a.localeCompare(b, "en"));
}

export function pendingCourseAudio(
  texts: readonly string[],
  manifest: CourseAudioManifest,
  includeSlow: boolean,
): PendingRecording[] {
  return texts.flatMap((text) => {
    const entry = manifest.entries[text];
    const pending: PendingRecording[] = [];
    if (!entry?.normalUrl) pending.push({ text, profile: "normal" });
    if (includeSlow && !entry?.slowUrl) pending.push({ text, profile: "slow" });
    return pending;
  });
}

function parseOptions(argv: readonly string[]): Options {
  const allowed = new Set(["--dry-run", "--slow"]);
  const unknown = argv.filter((argument) => !allowed.has(argument));
  if (unknown.length > 0) {
    throw new Error(`Unknown option: ${unknown.join(", ")}`);
  }
  return {
    dryRun: argv.includes("--dry-run"),
    slow: argv.includes("--slow"),
  };
}

function printEstimate(
  texts: readonly string[],
  pending: readonly PendingRecording[],
  options: Options,
): void {
  const normalCount = pending.filter((item) => item.profile === "normal").length;
  const slowCount = pending.filter((item) => item.profile === "slow").length;
  const characters = pending.reduce((sum, item) => sum + item.text.length, 0);
  const cost =
    (characters / 1_000_000) * PRICE_PER_MILLION_CHARACTERS;

  console.log(`${texts.length} unique course phrases.`);
  console.log(
    `${pending.length} recordings pending: ${normalCount} normal, ${slowCount} slow.`,
  );
  console.log(
    `${characters} characters — roughly $${cost.toFixed(2)} at $${PRICE_PER_MILLION_CHARACTERS}/million.`,
  );
  if (options.dryRun && texts.length > 0) {
    console.log("Sample:");
    for (const text of texts.slice(0, SAMPLE_SIZE)) console.log(`- ${text}`);
  }
}

async function readManifest(): Promise<CourseAudioManifest> {
  return parseCourseAudioManifest(
    JSON.parse(await readFile(MANIFEST_PATH, "utf8")),
  );
}

async function writeManifestAtomically(
  manifest: CourseAudioManifest,
): Promise<void> {
  const temporaryPath = `${MANIFEST_PATH}.${process.pid}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, MANIFEST_PATH);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const courses = listedAvailableSlugs(loadCatalog()).map(loadCourse);
  const texts = collectCourseAudioTexts(courses);
  const manifest = await readManifest();
  const pending = pendingCourseAudio(texts, manifest, options.slow);

  printEstimate(texts, pending, options);
  if (options.dryRun || pending.length === 0) return;

  config({ path: [".env.local", ".env"] });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  // Storage is validated before the first paid provider call.
  const storage = createR2Storage();
  const nextManifest: CourseAudioManifest = {
    version: 1,
    source: TTS_SOURCE,
    entries: { ...manifest.entries },
  };

  for (const text of texts) {
    const current = nextManifest.entries[text];
    let normalUrl = current?.normalUrl;
    let slowUrl = current?.slowUrl;

    if (!normalUrl) {
      const audio = await synthesizeSpeech(text, {
        apiKey,
        profile: AUDIO_PROFILES.normal,
      });
      normalUrl = await storage.putAudio(
        courseAudioObjectKey(text, "normal"),
        audio,
      );
      nextManifest.entries[text] = {
        text,
        normalUrl,
        ...(slowUrl ? { slowUrl } : {}),
      };
      parseCourseAudioManifest(nextManifest);
      await writeManifestAtomically(nextManifest);
    }

    if (options.slow && !slowUrl) {
      const audio = await synthesizeSpeech(text, {
        apiKey,
        profile: AUDIO_PROFILES.slow,
      });
      slowUrl = await storage.putAudio(
        courseAudioObjectKey(text, "slow"),
        audio,
      );
      nextManifest.entries[text] = { text, normalUrl, slowUrl };
      parseCourseAudioManifest(nextManifest);
      await writeManifestAtomically(nextManifest);
    }
  }

  console.log(`Updated ${MANIFEST_PATH}.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

