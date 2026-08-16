"use client";

import { useState } from "react";

import { AnswerFeedback } from "@/components/slova/answer-feedback";
import { Eyebrow } from "@/components/slova/eyebrow";
import { KeyHints } from "@/components/slova/key-hints";
import { LessonRow } from "@/components/slova/lesson-row";
import { LetterTiles } from "@/components/slova/letter-tiles";
import { OptionButton, OptionList } from "@/components/slova/option-button";
import { PlayButton } from "@/components/slova/play-button";
import { ProgressSteps } from "@/components/slova/progress-steps";
import { StageRail } from "@/components/slova/stage-rail";
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

  return (
    <div className="container-wide px-6 py-12">
      <h1 className="text-h1">Training kit</h1>
      <p className="text-muted-foreground mt-2 text-lead">
        Все состояния компонентов из §14. Страница только для разработки.
      </p>

      <Row title="Вариант ответа">
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
          Наведите на первый — граница зеленеет и строка сдвигается на 2px.
          Пройдите табом — фокусное кольцо одно на весь продукт.
        </p>
      </Row>

      <Row title="Реакция на ответ">
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
          Первая строка пустая: контейнер держит 44px, поэтому появление реакции
          не двигает варианты.
        </p>
      </Row>

      <Row title="Кнопка звука">
        <div className="flex items-end gap-8">
          <PlayButton size="lg" playing={playing} onClick={() => setPlaying((p) => !p)} />
          <PlayButton size="sm" playing={playing} onClick={() => setPlaying((p) => !p)} />
          <PlayButton size="sm" disabled />
          <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Остановить кольца" : "Пустить кольца"}
          </Button>
        </div>
      </Row>

      <Row title="Лестница брейншторма">
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
          Под столбиками только номера и галочка. Ни одного слова сессии — ни в
          подписи, ни в <code className="text-token">aria-label</code>: правильный
          ответ всегда одно из них.
        </p>
      </Row>

      <Row title="Шаги урока">
        <div className="flex flex-col gap-4">
          <ProgressSteps total={6} current={0} label="Шаг 1 из 6" />
          <ProgressSteps total={6} current={3} label="Шаг 4 из 6" />
          <ProgressSteps total={6} current={5} label="Шаг 6 из 6" />
        </div>
      </Row>

      <Row title="Собрать слово">
        <LetterTiles
          word="become"
          verdict={built}
          onComplete={(guess) => setBuilt(guess === "become" ? "correct" : "incorrect")}
        />
        <div className="mt-6 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBuilt(null)}>
            Сбросить
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-caption">
          Буквы набираются с клавиатуры, Backspace возвращает последнюю, проверка
          сама при заполнении последней ячейки.
        </p>
      </Row>

      <Row title="Строка урока">
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
          Следующий урок — фон сайдбара, врезка слева и бейдж. Пройденный несёт
          галочку, не номер.
        </p>
      </Row>

      <Row title="Подсказки клавиш">
        <KeyHints
          hints={[
            { keys: ["1", "4"], label: "выбрать" },
            { keys: ["Пробел"], label: "повторить звук" },
            { keys: ["Enter"], label: "дальше" },
            { keys: ["Backspace"], label: "вернуть букву" },
          ]}
        />
        <p className="text-muted-foreground mt-3 text-caption">
          На сенсорном экране этот блок скрыт целиком.
        </p>
      </Row>
    </div>
  );
}
