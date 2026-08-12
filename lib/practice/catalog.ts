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
  title: string;
  /** One line, saying what you actually do — not what it is called. */
  description: string;
  /** Needs a voice on the device. */
  audio: boolean;
};

export const TRAININGS: Training[] = [
  {
    id: "brainstorm",
    slug: "brainstorm",
    title: "Brainstorm",
    description:
      "New words, drilled through every format until each one is right. Nothing leaves the session unlearned.",
    audio: false,
  },
  {
    id: "word-to-translation",
    slug: "word-translation",
    title: "Word → translation",
    description: "See the English word, pick what it means.",
    audio: false,
  },
  {
    id: "translation-to-word",
    slug: "translation-word",
    title: "Translation → word",
    description: "See the meaning, pick the English word. Harder than it sounds.",
    audio: false,
  },
  {
    id: "audio-choice",
    slug: "audio-challenge",
    title: "Audio challenge",
    description: "Hear a word with nothing on screen, pick what it means.",
    audio: true,
  },
  {
    id: "builder",
    slug: "builder",
    title: "Word builder",
    description: "Assemble the English word letter by letter from its meaning.",
    audio: false,
  },
  {
    id: "listening",
    slug: "dictation",
    title: "Dictation",
    description: "Hear a word and write it. Spelling counts, near misses do not.",
    audio: true,
  },
  {
    id: "typing",
    slug: "typing",
    title: "Type the word",
    description: "See the meaning and write the English word from memory.",
    audio: false,
  },
];

export function trainingBySlug(slug: string): Training | undefined {
  return TRAININGS.find((training) => training.slug === slug);
}
