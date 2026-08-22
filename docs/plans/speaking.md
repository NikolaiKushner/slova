# Plan — Speaking, the fourth modality

Status: proposed, not started. Branch: `feat/speaking`.
Source: brainstorm session 2026-08-22, second of four candidate sections.
Siblings: [Reader](reader.md), [Phrases](phrases.md), [Dialogues](dialogues.md).
Prerequisite: [one activity spine for Progress](progress-activity.md).

## 1. Why this one

Six training formats and a Brainstorm ladder, and every one of them ends in
the same two places: a tap or the keyboard. The app can ask you to recognise a
word, recognise it backwards, hear it and choose, assemble it from letters,
hear it and write it, and write it from the meaning. It has never once asked
you to say it. A learner who has cleared four hundred words through Slova has
produced none of them out loud.

The asymmetry is already half-solved. `lib/practice/speech.ts` is 423 lines of
hard-won knowledge about the browser's speech *synthesiser* — dropped
utterances, gesture requirements, Chrome's wedged queue, asynchronous voice
lists. The app speaks. The other half of the same API is the one it does not
use.

And it is the only candidate of the four that costs **nothing** per use.
`SpeechRecognition` is the browser's, not a provider's: no key, no budget line
in `docs/provider-spend.md`, no reservation to reconcile.

## 2. What this is not, and the plan depends on being honest about it

**This does not score pronunciation.** The browser hands back a transcript and,
at best, a confidence number. Actual pronunciation assessment is a different
technology: Goodness-of-Pronunciation posteriors over a phoneme aligner, or a
transformer trained on annotated non-native speech
([review](https://arxiv.org/html/2310.13974),
[GOPT](https://arxiv.org/pdf/2204.03863),
[speechocean762](https://arxiv.org/pdf/2104.01378)). None of that is reachable
from a web page without a paid provider, which is the entire cost advantage
gone.

So the drill grades **production**, not accent: *did the recogniser hear the
word you were asked for?* That is a real and unmet exercise — it is the spoken
sibling of the existing `typing` format, where the answer comes from your
mouth instead of your fingers — and it is a promise the technology can keep.
Any copy that implies a score out of ten, or "your `th` is weak", is a lie the
implementation cannot back. **The word "оценка" does not appear in this
feature.**

## 3. Scope

**In:** a microphone-answered training format; a permission-and-capability
gate that keeps it invisible where it cannot work; a Speaking shelf with the
word drill and read-aloud; the same FSRS grading path the other formats use.

**Out:**

- **Pronunciation scores, phoneme feedback, accent comparison.** §2.
- **A server-side recogniser** (Whisper, provider ASR). It would work
  everywhere, and it would put a per-utterance bill and a stream of the user's
  voice through this app's infrastructure. If the browser path fails the spike,
  this feature is dropped, not re-plumbed.
- **Storing audio.** Nothing recorded is ever kept: the API is consumed as a
  transcript and the audio never reaches Slova at all. This is a privacy
  property worth protecting deliberately.
- **Conversation.** That is [Dialogues](dialogues.md).
- **Speaking as a source of new words.** The drill asks about words already in
  the dictionary.

## 4. Success criteria

- [ ] On a device where recognition works, saying the target word for 20
      dictionary words is graded correctly in at least 18 of them — measured by
      hand, once, and written into this file as the number that was actually
      observed.
- [ ] A recogniser that returns nothing, errors, or is denied the microphone
      **never** records a failed review. It skips.
- [ ] The format is hidden — not shown-and-broken — wherever
      `SpeechRecognition` is absent, mirroring `lib/practice/audio-capability.ts`.
- [ ] The microphone is requested on an explicit tap, after a screen that says
      where the audio goes, and never on page load.
- [ ] Verified by hand on: desktop Chrome, iOS Safari as a tab, **and iOS
      Safari installed to the home screen** — see §6, risk 1.
- [ ] `npm test`, lint, typecheck green; no new runtime dependency.

## 5. Design

**Chosen: a client-only recognition adapter behind a capability gate, feeding
the existing session engine.**

A new `lib/practice/recognition.ts` wraps `webkitSpeechRecognition` /
`SpeechRecognition` the way `lib/practice/speech.ts` wraps the synthesiser —
same file, same defensive posture, same reason. It exposes a promise-shaped
`listenOnce(...)` that resolves to `{ transcripts: string[] }` or a typed
failure, never a throw. `maxAlternatives` is raised so grading sees the
recogniser's runner-up guesses, not only its first.

Grading reuses `lib/practice/answer.ts`: the transcripts are normalised the
same way a typed answer is (articles dropped, case folded) and any one of them
matching is a pass. A spoken answer then goes through the ordinary
`/api/study/review` path with the ordinary FSRS grade, because a word produced
out loud is at least as good evidence as a word typed.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| **A (chosen)** — browser recogniser, transcript match | `SpeechRecognition` in the client, `answer.ts` grades | Free, no audio leaves the page, but availability varies by browser and the recogniser is the judge | The only version whose running cost is zero, which is the reason to build it at all |
| B — record audio, transcribe server-side | MediaRecorder → provider ASR | Works on every device, uniform quality | Rejected: a bill per utterance, and the user's voice through our servers, for a drill |
| C — provider pronunciation assessment | Azure/Speechace-style scoring | Actually delivers what §2 refuses to promise | Rejected for this batch: it makes the feature a paid one, and the plan is deliberately the free version |

**What would change this decision:** if the spike shows recognition unusable
on iOS specifically — the platform this app has been fixing keyboard and
viewport bugs for — then the honest move is to **drop the section**, not to
fall back to B. Written here so that outcome reads as a result, not a failure.

**Section or format?** As one drill this belongs in `TRAININGS` and needs no
section at all. It earns a section at two drills, and gets one only when the
second lands. Steps 1–3 ship a format; step 5 promotes it. If step 5 never
happens, the feature is still complete and the sidebar is still honest.

**Touches:** no schema change, no migration, no new dependency, no API route.
Two new client modules, one entry in `lib/practice/catalog.ts`, one capability
predicate, i18n, and a privacy line.

## 6. Steps

### 1. Spike: does it work on the devices this app is used on — S · `[ ]`

- **Why first:** everything else is conditional on the answer, and the answer
  is a property of Apple's browser, not of any code written here.
- **Files:** `app/dev/mic/page.tsx` (new, alongside `app/dev/viewport` and
  `app/dev/kit`) — a throwaway page: press, speak, see the transcripts and
  the error codes.
- **Does:** nothing product-facing. Answers four questions, on hardware:
  1. Chrome desktop — does it recognise 20 single words reliably?
  2. iOS Safari **as a tab** — since 14.5 the prefixed interface exists
     ([WebKit](https://developer.apple.com/forums/thread/775699)), but
     `interimResults` behaves inconsistently and recognition can throttle.
  3. iOS Safari **installed to the home screen** — this is the one that can
     kill the feature. Reports of the API erroring immediately inside WebView
     and PWA contexts are common
     ([addpipe deep dive](https://blog.addpipe.com/a-deep-dive-into-the-web-speech-api/),
     [iOS notes](https://www.xjavascript.com/blog/add-ios-speech-recognition-support-for-web-app/)),
     and this app actively invites installation via `lib/install-hint.ts`.
  4. Does a second recognition in the same session need a fresh gesture, the
     way `lib/practice/speech.ts` records that iOS speech does?
- **Verify:** the findings written into §8 of this file as observed
  behaviour per platform, before step 2 starts. **If (3) fails, stop and
  reconsider — a drill that breaks for anyone who installed the app is worse
  than no drill.**

### 2. The recognition adapter — M · `[ ]`

- **Files:** `lib/practice/recognition.ts` (new),
  `tests/unit/practice-recognition.test.ts` (new).
- **Does:** capability detection, `listenOnce` with a start timeout and a
  silence timeout, `maxAlternatives`, a typed failure union
  (`unsupported` | `denied` | `no-speech` | `aborted` | `network` | `timeout`),
  and a module-level reference to keep the recogniser alive — the same class of
  bug `speech.ts` documents for utterances.
- **Verify:** unit tests against a fake recogniser object for each failure
  branch and for the alternatives path. The real API is exercised by hand at
  step 3; do not try to fake the browser in CI.

### 3. The word drill — M · `[ ]`

- **Files:** `lib/practice/catalog.ts` (a `speaking` entry, and `audio` grows a
  sibling `mic` flag), `lib/practice/audio-capability.ts` (a `micAvailable`
  beside `audioAvailable`), `lib/practice/question.ts` (the new
  `ExerciseKind`), `components/practice/question-view.tsx`,
  `components/practice/mic-prompt.tsx` (new, modelled on
  `components/practice/audio-prompt.tsx`), `components/practice/practice-page.tsx`.
- **Does:** shows the Russian meaning, one big press-and-speak control, and
  grades the transcript through `lib/practice/answer.ts`. **A recognition
  failure surfaces as "не расслышал" with a retry, and never as a wrong
  answer** — a false negative here would both demoralise and corrupt the FSRS
  state, which is the one damage this feature can actually do.
- **Verify:** `npm test` for the grading and capability units; then the drill
  run by hand on all three platforms from step 1, 20 words, and the hit rate
  recorded against the §4 criterion.

### 4. Permission, privacy, and the gate — S · `[ ]`

- **Files:** `components/practice/mic-prompt.tsx`, `app/(public)/privacy`,
  `docs/security.md`, i18n messages.
- **Does:** the first tap opens a short explanation — the browser sends the
  audio to its own vendor's servers for recognition, Slova never receives or
  stores it — and only then requests the microphone. Denial is remembered for
  the session and the format falls back to being hidden rather than broken.
- **Verify:** deny the permission in the browser and confirm the app degrades
  quietly; read the privacy page and check it says what the code does.

### 5. Promote to a section — S · `[ ]`

- **Why last:** the shelf is only honest once there are two things on it.
- **Files:** `components/practice/read-aloud.tsx` (new),
  `app/(app)/speaking/page.tsx` (new), `lib/nav.ts`, `tests/unit/nav.test.ts`,
  i18n.
- **Does:** adds read-aloud — a sentence from a Story paragraph
  (`lib/stories/load.ts`) shown, spoken back, matched leniently by word
  overlap rather than exactly, since a recogniser will not return a full
  sentence cleanly. Puts both drills under **Говорение** in Study.
- **Verify:** browser, both drills, phone width. Nav test updated.

Steps 1→2→3 are strictly sequential. 4 can overlap 3. 5 depends on 3.

## 7. Risks

| Risk | Noticed by | Cheapest resolution |
|---|---|---|
| **iOS home-screen install has no recogniser** | Step 1, question 3 | Step 1 exists entirely for this. It is the first thing tested and the reason the section is promoted last |
| Recogniser mishears a correctly said word → false "wrong" | Hit-rate measurement in step 3 | Failure is never a wrong answer, only a retry; alternatives are all accepted; hit rate is measured, not assumed |
| Background noise makes the drill unusable in the situations people actually study in | Hand testing | Nothing to fix in code — if it is bad, it is recorded here as a known limit |
| A person is embarrassed to speak, and a drill they avoid drags the streak | — | It is one format among seven, never on the default path, and never required by Brainstorm |
| Homophones: "their" recognised for "there" | Grading review | Accept the alternatives list; for a genuinely ambiguous pair the format is simply weak evidence, which is acceptable for a rating, not for a gate |
| Copy overpromises a pronunciation score | Review of the i18n strings | §2 is the standard; the reviewer checks the strings against it |

**Rollback:** remove the `TRAININGS` entry — one line, no data to unwind,
nothing else references the kind. Nothing is stored, so there is nothing to
migrate back.

## 8. Spike findings

*(Fill in during step 1 — platform, browser version, works / fails, error
codes seen, gesture behaviour. This section is the deliverable of step 1 and
the input to the go/no-go on the rest.)*

## 9. Progress

**This section is the cheap one, and the reason is worth stating.** Speaking is
a training format, not a parallel world: it runs through the existing session
engine, so it writes a `StudySitting` and `ReviewLog` rows like every other
format, and it therefore lands on the calendar, in the streak, in minutes and
in retention **with no work at all**. Contrast [Reader](reader.md) and
[Dialogues](dialogues.md), which touch neither table and have to earn their
square.

Two things do need deciding:

- **A per-format split** — "which of the seven formats do you actually use" —
  becomes worth showing once there are seven. `StudySitting.label` already
  stores the format slug, so this is an aggregate, not a schema change. It
  belongs to [progress-activity.md](progress-activity.md) step 4, not here.
- **A recognition rate must not be shown as a score.** The share of attempts
  the recogniser accepted is a property of the microphone, the room and the
  browser at least as much as of the speaker. Putting it on Progress as a
  number that goes up and down would be the pronunciation score §2 refuses to
  promise, wearing a different hat. If it is shown at all, it is shown inside
  the drill as a diagnostic ("плохо слышно?"), never on Progress.

No step. Verification is the one line in step 3: after a speaking session,
Progress shows the sitting and its minutes like any other format's.

## 10. Deferred, captured on purpose

- **Read-aloud over a user's own text**, once [Reader](reader.md) ships — the
  sentence source becomes `UserText` instead of a Story paragraph, and the two
  features multiply.
- **Minimal pairs** (`ship`/`sheep`) as a third drill. Attractive, and exactly
  the thing a transcript-matching recogniser is worst at; needs the step 1
  numbers before it is worth trying.
- **Provider pronunciation assessment** as a paid, opt-in upgrade — the
  version that could honestly say "your `th` is weak". A different plan, with
  a budget section.
