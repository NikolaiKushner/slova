import { z } from "zod";

import manifestJson from "@/content/courses/audio-manifest.json";
import { TTS_SOURCE } from "@/lib/audio/profile";
import { speakText } from "@/lib/courses/speak-text";

const manifestEntrySchema = z
  .object({
    text: z.string().trim().min(1),
    normalUrl: z.string().url(),
    slowUrl: z.string().url().optional(),
  })
  .strict();

export const courseAudioManifestSchema = z
  .object({
    version: z.literal(1),
    source: z.literal(TTS_SOURCE),
    entries: z.record(z.string(), manifestEntrySchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    for (const [key, entry] of Object.entries(manifest.entries)) {
      if (key !== speakText(key) || entry.text !== key) {
        context.addIssue({
          code: "custom",
          path: ["entries", key],
          message: "Manifest keys and entry text must be normalized plain text.",
        });
      }
    }
  });

export type CourseAudioManifest = z.infer<typeof courseAudioManifestSchema>;
export type CourseAudioEntry = z.infer<typeof manifestEntrySchema>;

export function parseCourseAudioManifest(value: unknown): CourseAudioManifest {
  return courseAudioManifestSchema.parse(value);
}

export const courseAudioManifest = parseCourseAudioManifest(manifestJson);

export function resolveCourseAudio(text: string): CourseAudioEntry | null {
  return courseAudioManifest.entries[speakText(text)] ?? null;
}


