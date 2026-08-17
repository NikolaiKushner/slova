"use client";

import { useState } from "react";

import { AnswerFeedback } from "@/components/slova/answer-feedback";
import { Callout } from "@/components/slova/callout";
import { Eyebrow } from "@/components/slova/eyebrow";
import { KeyHints } from "@/components/slova/key-hints";
import { LessonRow } from "@/components/slova/lesson-row";
import { LetterTiles } from "@/components/slova/letter-tiles";
import { OptionButton, OptionList } from "@/components/slova/option-button";
import { PlayButton } from "@/components/slova/play-button";
import { ProgressSteps } from "@/components/slova/progress-steps";
import { RuleExample } from "@/components/slova/rule-example";
import { SpeakButton } from "@/components/slova/speak-button";
import { StageRail } from "@/components/slova/stage-rail";
import { Token, TokenMark } from "@/components/slova/token";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Every state of the training kit on one page (§14, step 4 of the migration).
 *
 * It exists so a state can be looked at without playing a session into it —
 * `incorrect` used to require deliberately getting a word wrong at the right
 * moment. Development only; there is no link to it from the app.
 */

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border border-t py-10 first:border-t-0">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function KitPage() {
  const [playing, setPlaying] = useState(false);
  const [built, setBuilt] = useState<"correct" | "incorrect" | null>(null);
  const [builtPhrase, setBuiltPhrase] = useState<"correct" | "incorrect" | null>(null);

  return (
    <div className="container-wide px-6 py-12">
      <h1 className="text-h1">Training kit</h1>
      <p className="text-muted-foreground mt-2 text-lead">
        All §14 component states. Development only.
      </p>

      <Row title="Answer option">
        <OptionList>
          <li>
            <OptionButton index={0}>по умолчанию</OptionButton>
          </li>
          <li>
            <OptionButton index={1} state="selected">
              выбран
            </OptionButton>
          </li>
          <li>
            <OptionButton index={2} state="correct" disabled>
              верно
            </OptionButton>
          </li>
          <li>
            <OptionButton index={3} state="incorrect" disabled>
              неверно
            </OptionButton>
          </li>
          <li>
            <OptionButton index={0} state="dimmed" disabled>
              погашен после ответа
            </OptionButton>
          </li>
        </OptionList>
        <p className="text-muted-foreground mt-3 text-caption">
          Hover the first — the border turns green and the row shifts 2px.
          Tab to it — the focus ring is the same one the rest of the product uses.
        </p>
      </Row>

      <Row title="Answer reaction">
        <div className="divide-border divide-y">
          <AnswerFeedback verdict={null} />
          <AnswerFeedback verdict="correct" note="ступень 2 → 3" />
          <AnswerFeedback verdict="almost" answer="become" note="ступень 2 → 3" />
          <AnswerFeedback
            verdict="incorrect"
            answer="become"
            note="остаётся на первой ступени"
          />
        </div>
        <p className="text-muted-foreground mt-3 text-caption">
          The first row is empty: the container holds 44px, so a verdict does
          not move the options.
        </p>
      </Row>

      <Row title="Sound button">
        <div className="flex items-end gap-8">
          <PlayButton size="lg" playing={playing} onClick={() => setPlaying((p) => !p)} />
          <PlayButton size="sm" playing={playing} onClick={() => setPlaying((p) => !p)} />
          <PlayButton size="sm" disabled />
          <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Stop the rings" : "Start the rings"}
          </Button>
        </div>
      </Row>

      <Row title="Compact pronunciation">
        <div className="flex flex-wrap items-center gap-8">
          <SpeakButton text="She works here." />
          <SpeakButton text="She works here." disabled />
        </div>
        <p className="text-muted-foreground mt-3 text-caption">
          Normal and slow buttons use Web Speech when the manifest is empty.
          On the right — disabled.
        </p>
      </Row>

      <Row title="Brainstorm ladder">
        <StageRail
          currentId="c"
          words={[
            { id: "a", stage: 5, total: 5 },
            { id: "b", stage: 2, total: 5 },
            { id: "c", stage: 4, total: 5 },
            { id: "d", stage: 0, total: 5 },
            { id: "e", stage: 1, total: 5 },
            { id: "f", stage: 3, total: 5 },
          ]}
        />
        <p className="text-muted-foreground mt-4 text-caption">
          Under the columns, only numbers and a tick. No session word — not in
          the caption, not in <code className="text-token">aria-label</code>:
          the right answer is always one of them.
        </p>
      </Row>

      <Row title="Lesson steps">
        <div className="flex flex-col gap-4">
          <ProgressSteps total={6} current={0} label="Step 1 of 6" />
          <ProgressSteps total={6} current={3} label="Step 4 of 6" />
          <ProgressSteps total={6} current={5} label="Step 6 of 6" />
        </div>
      </Row>

      <Row title="Assemble the word">
        <LetterTiles
          word="become"
          verdict={built}
          onComplete={(guess) => setBuilt(guess === "become" ? "correct" : "incorrect")}
        />
        <div className="mt-6 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBuilt(null)}>
            Reset
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-caption">
          Letters type from the keyboard, Backspace returns the last one,
          checking happens when the last cell fills.
        </p>
      </Row>

      <Row title="Assemble a phrase">
        <LetterTiles
          word="give up"
          letters={["up", "give"]}
          verdict={builtPhrase}
          onComplete={(guess) =>
            setBuiltPhrase(guess === "give up" ? "correct" : "incorrect")
          }
        />
        <p className="text-muted-foreground mt-3 text-caption">
          A phrase deals word tiles. The first letter still types from the
          keyboard.
        </p>
      </Row>

      <Row title="Lesson row">
        <Card className="gap-0 py-0">
          <ul className="divide-border-subtle divide-y">
            <li>
              <LessonRow
                index={1}
                title="Forms"
                titleRu="Форма"
                href="#forms"
                minutesLabel="~4 мин"
                kind="done"
                statusLabel="Готово"
              />
            </li>
            <li>
              <LessonRow
                index={2}
                title="Use"
                titleRu="Употребление"
                href="#use"
                minutesLabel="~5 мин"
                kind="next"
                badgeLabel="Продолжить"
              />
            </li>
            <li>
              <LessonRow
                index={3}
                title="Questions"
                titleRu="Вопросы"
                href="#questions"
                minutesLabel="~4 мин"
              />
            </li>
          </ul>
        </Card>
        <p className="text-muted-foreground mt-3 text-caption">
          The next lesson — sidebar background, a left inset, and a badge.
          A finished one carries a tick, not a number.
        </p>
      </Row>

      <Row title="Key hints">
        <KeyHints
          hints={[
            { keys: ["1", "4"], label: "выбрать" },
            { keys: ["Пробел"], label: "повторить звук" },
            { keys: ["Enter"], label: "дальше" },
            { keys: ["Backspace"], label: "вернуть букву" },
            { keys: ["R"], label: "правило" },
          ]}
        />
        <p className="text-muted-foreground mt-3 text-caption">
          Hidden entirely on a touch screen.
        </p>
      </Row>

      <Row title="Lesson example">
        <RuleExample
          en={
            <>
              She work<TokenMark>s</TokenMark> here.
            </>
          }
          ru="Она здесь работает."
          speakText="She works here."
        />
        <p className="text-muted-foreground mt-3 text-caption">
          A left rule, English in Literata, translation below.
        </p>
      </Row>

      <Row title="Word form">
        <p className="text-body">
          After he / she / it:{" "}
          <Token>
            work<TokenMark>s</TokenMark>
          </Token>
          ,{" "}
          <Token>
            go<TokenMark>es</TokenMark>
          </Token>
          ,{" "}
          <Token>
            stud<TokenMark>ies</TokenMark>
          </Token>
          .
        </p>
      </Row>

      <Row title="Callout">
        <Callout variant="warning" title="Где обычно ошибаются">
          <p>
            После <strong>he / she / it</strong> глагол не оставляют как в словаре:{" "}
            <Token>she work</Token> →{" "}
            <Token>
              she work<TokenMark>s</TokenMark>
            </Token>
            .
          </p>
        </Callout>
      </Row>
    </div>
  );
}
