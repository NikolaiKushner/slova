import type { ExerciseKind } from "@/lib/practice/question";

/**
 * The trainings, as the person choosing one sees them.
 *
 * Kept beside the engine rather than in the page, because two things need the
 * same list: the grid that offers them and the route that runs one. A URL is a
 * slug here, not an internal kind — `word-to-translation` is a fine name for a
 * type and a poor one for an address.
 */

export type TrainingId = ExerciseKind | "brainstorm";

export type Training = {
  id: TrainingId;
  slug: string;
  /** Needs a voice on the device. */
  audio: boolean;
};

export const TRAININGS: Training[] = [
  {
    id: "brainstorm",
    slug: "brainstorm",
    audio: false,
  },
  {
    id: "word-to-translation",
    slug: "word-translation",
    audio: false,
  },
  {
    id: "translation-to-word",
    slug: "translation-word",
    audio: false,
  },
  {
    id: "audio-choice",
    slug: "audio-challenge",
    audio: true,
  },
  {
    id: "builder",
    slug: "builder",
    audio: false,
  },
  {
    id: "listening",
    slug: "dictation",
    audio: true,
  },
  {
    id: "typing",
    slug: "typing",
    audio: false,
  },
];

export function trainingBySlug(slug: string): Training | undefined {
  return TRAININGS.find((training) => training.slug === slug);
}
