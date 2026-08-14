# Plan: грамматические курсы — времена

**Date:** 2026-08-14 · **Branch:** `feat/courses-grammar` · **Status:** ready
**Source:** `research/brainstorm-courses-2026-08-14.md` + Essential RU 2017 + EGIU 5th 2019 + разборы механики

Документ — трекер. Галочки ставятся по мере срезов. Код не начинается, пока владелец не сказал идти.

## Problem

Словарь и шесть тренировок учат **слово**. Человек знает `go → идти` на пять точек и пишет *She go*. Courses / Grammar и Practice / Grammar — заглушки. Нужна линейка, которая учит **конструкцию**, с единицей `ruleId`, иначе позже нечего класть в due-очередь правил.

## Outcome

Можно открыть **Courses → Grammar**, пройти Present Simple (теория + упражнения на предложении + тест) и найти его в **My courses**. Остальные времена стоят в каталоге как следующие, без замков. Practice / Grammar пока заглушка, но банк заданий уже привязан к правилам.

## Success criteria

- [ ] `/courses/grammar` — каталог из файлов, не `ComingSoon`. Живой курс один: Present Simple.
- [ ] Урок — одна страница: блоки теории, затем задания. Ошибка подсвечивает блок с тем же `ruleId`.
- [ ] Урок пройден при ≥80%; тест открывается после всех уроков; курс завершён при ≥90% на тесте; хранится лучшая попытка.
- [ ] Zod + юнит-тест: каждый `ruleId` резолвится; у задания один канонический ответ (+ `accept[]`); на каждое правило ≥2 задания **вне** урока.
- [ ] В репозитории нет фраз из PDF. `content/courses/SOURCE.md` называет книги (название, ISBN) как силлабус.
- [ ] `npm test` зелёный, `npx tsc --noEmit` чисто. Dev-сервер и e2e не гоняем.

## Non-goals (этот заход, шаги 1–4)

- Таблица `UserRule` и живой `/practice/grammar` — фаза 2, после мержа Present Simple.
- Topics, Learning map, кубки, сертификаты, замок урока или курса.
- Автосвалка слов в словарь и кнопка «Add these phrases».
- Типы `order` (чипсы) и `audio-gap`.
- LLM / `courses:build`. Первый курс руками.
- JSON остальных одиннадцати курсов времён.
- PDF в git.

## Locked decisions

Сводка всего разговора. Менять только явно.

| Решение | Как |
|---|---|
| Две работы | **Courses / Grammar** — пройти тему один раз, здесь теория. **Practice / Grammar** — due-правила, другое упражнение из банка. **Learning map** — стык, не в этом заходе. |
| Единица | Правило (`ruleId`), не упражнение и не слово. Ошибка в уроке двигает правило (фаза 2); в фазе 1 пишем `missedRuleIds` на `UserLesson`, чтобы не потерять сигнал. |
| Контент | Файлы в `content/courses/`, как лексикон. Postgres — только прогресс. Ревью в PR, без админки. |
| Плеер | Рендерер массива блоков, не «страница грамматики». Topics потом подключаются новым типом блока. |
| Задания фазы 1 | `choice`, `gap`, `transform`, `pick-sentence`. Оболочка клавиатуры как в тренировках; тип вопроса **не** из `lib/practice/question.ts`. |
| Банк | 2–3 задания на правило сверх урока. Иначе фаза 2 учит ответ, не конструкцию. |
| Слова | Примеры из частотного лексикона. Не медицина. В словарь — не молча. |
| Гейтинг | Нет замка. Порядок — рекомендация. Ошибка не запрещает идти дальше. |
| Пороги | Урок ≥80%, тест ≥90%, пересдача, `bestScore`. |
| Подписи | Как карточки Лео: английский title + русская строка (`Forms` / `Форма`). |
| FSRS | Второй планировщик не пишем. `lib/srs.ts` (`ScheduledWord`) уже только поля карточки; в фазе 2 переименовать тип и повесить `UserRule`. |
| Учебники | Essential RU — нарезка A1–A2. EGIU 5th — контрасты B1 и модель смешанного теста. Чужой текст не копируем. |

```
Courses/Grammar          Practice/Grammar         Dictionary
 линейка уроков           due UserRule              UserWord + FSRS
 теория живёт здесь       банк[ruleId] ≠ урок       не кормится автоматом
```

## Context found in the codebase

Аналог каталога и плеера — Trainings: `lib/practice/catalog.ts`, `app/(app)/practice/page.tsx` (`Page` + `Section` + ряды в `Card`), `components/practice/practice-session.tsx` + `question-view.tsx` (`1`–`4`, Enter). Курсы копируют оболочку. `Question` завязан на `PracticeWord` (`front`/`back`) — для грамматики неверная единица; новый раннер в `lib/courses/` и `components/courses/`.

Контент-файлы: `content/lexicon/` + `SOURCE.md`. Zod уже в `package.json`. `/courses` → `/courses/grammar` в `next.config.ts`. `/courses` в `PROTECTED_PREFIXES`. Три заглушки — `ComingSoon`.

`lib/srs.ts` в шагах 1–4 не трогаем.

## Design

**Chosen: файлы курса + плеер блоков + `UserCourse`/`UserLesson`.** Каталог времён — порядок Essential; первый живой курс Present Simple, потому что на `-s` и `do/does` проявляются все четыре типа заданий. *to be* в каталоге раньше, но это отдельный курс (Essential юниты 1–2), не урок внутри Present Simple.

**Why over the alternatives:**

| Approach | How | Trade-off | Verdict |
|---|---|---|---|
| A (chosen) | JSON в git, прогресс в Neon | нет админки | |
| B | уроки в Postgres | нужна админка | отвергнут: лексикон уже файловый |
| C | курс = абзац + Word → translation | не проверяет конструкцию | отвергнут |

**What would change this decision:** урок Forms слишком тонкий — дробим Use, хранение не меняем.

**Touches:** `content/courses/`, `lib/courses/`, страницы grammar/my, миграция двух таблиц, без новых зависимостей.

### Учебники

| Книга | Роль |
|---|---|
| *Essential Grammar in Use*, RU, Murphy / Sands, 2017, ISBN 978-1-316-62996-3 | Силлабус A1–A2. Present Simple = юниты 6 форма, 7 отрицание, 8 вопрос. |
| *English Grammar in Use*, 5th, Murphy, 2019, ISBN 978-1-108-45765-1 | Не для новичка. Контрасты и Additional exercises как модель теста. Юнит 2C — тема урока Spelling, не текст. |

PDF на диске владельца, не в репо.

### Схема файлов и JSON

```
content/courses/
  SOURCE.md
  schema.ts                         # zod, импортируется из lib/courses/load.ts
  catalog.json                      # порядок курсов, status: available | coming
  present-simple/
    course.json
    rules.json
    01-forms.json
    02-use.json
    03-spelling.json
    04-negatives.json
    05-questions.json
    99-test.json
    bank.json
```

```jsonc
// course.json
{
  "slug": "present-simple",
  "title": "Present Simple",
  "titleRu": "Простое настоящее",
  "level": "A1",
  "order": 3,
  "estMinutes": 40,
  "lessons": ["forms", "use", "spelling", "negatives", "questions", "test"]
}

// rules.json — item
{ "id": "ps-third-person-s", "title": "he / she / it + -s", "anchorMd": "В 3-м лице единственного числа к глаголу добавляется **-s**." }

// lesson block
{ "type": "explanation", "ruleId": "ps-third-person-s", "md": "…" }
{ "type": "table", "headers": ["I / you / we / they", "he / she / it"], "rows": [["work", "works"]] }
{ "type": "example", "en": "She works here.", "ru": "Она здесь работает." }
{ "type": "pitfall", "ruleId": "ps-third-person-s", "md": "Русскоязычные часто забывают **-s**." }
{ "type": "exercise", "id": "ps-forms-03", "ruleId": "ps-third-person-s", "kind": "choice",
  "prompt": "She ___ in London.", "options": ["live", "lives"], "answer": "lives" }
```

`gap` / `transform`: `answer` + `accept[]` (`doesn't` / `does not`).  
`pick-sentence`: два целых предложения, одно верное.  
Проверка в `lib/courses/answer.ts`: регистр и пробелы, **без** `judge()` словаря — `likes` vs `like` не «almost».

Правила Present Simple (id нельзя терять; схлопнуть можно при написании):  
`ps-base-form`, `ps-third-person-s`, `ps-use-habits`, `ps-use-facts`, `ps-spelling-es`, `ps-negative-dont`, `ps-negative-doesnt`, `ps-question-do`, `ps-question-does`.

### Каталог времён

Порядок владельца (2026-08-14). В фазе 1 живёт №1; 2–4 в каталоге как Next.

1. **`present-simple`** ← шаги 1–4  
2. `to-be-present` — am / is / are  
3. `present-continuous`  
4. `past-simple`  

Дальше, не в этом заходе: past continuous, present perfect, контрасты, going to / will.

### Прогресс (Prisma)

```
UserCourse  userId + courseSlug
            startedAt, completedAt, lastLessonSlug

UserLesson  userId + courseSlug + lessonSlug
            status, score, bestScore, attempts, missedRuleIds[], completedAt
```

Нет FK на `UserWord`. `missedRuleIds` — мост в фазу 2.

## Steps

Фаза 1 — работающий раздел. Фаза 2 — то, ради чего `ruleId`. Не мешать в один PR.

### Фаза 1 — Present Simple

#### 1. Схема + урок Forms в JSON — M · `[x]`

- **Why first:** если `ruleId`, банк и четыре `kind` не выражаются в файлах, плеер рано.
- **Files:** `content/courses/SOURCE.md`, `content/courses/schema.ts`, `content/courses/present-simple/{course,rules,01-forms,bank}.json`, `lib/courses/load.ts`, `tests/unit/courses-schema.test.ts`.
- **Does:** `01-forms` — explanation, table, 6–8 упражнений на `ps-base-form` / `ps-third-person-s`. `bank.json` — ≥2 задания на каждое из этих правил, id не пересекаются с уроком.
- **Verify:** `npm test -- tests/unit/courses-schema.test.ts` — ruleId резолвится, один canonical answer, банк не пуст, опечатка в `kind` падает.
- **Depends on:** —

#### 2. Плеер урока на Forms — M · `[x]`

- **Why:** скучная петля убивает модель; это видно на одном уроке.
- **Files:** `lib/courses/answer.ts`, `lib/courses/question.ts`, `components/courses/lesson-player.tsx`, `components/courses/exercise-view.tsx`, `components/courses/block-view.tsx`, `app/(app)/courses/grammar/[course]/[lesson]/page.tsx`, `tests/unit/courses-answer.test.ts`.
- **Does:** `/courses/grammar/present-simple/forms` — блоки + ответы. Ошибка → `rules[id].anchorMd`. Прогресс сессии в памяти. Не импортировать `Question` из practice.
- **Verify:** `doesn't` проходит через `accept`; `likes`/`like` не almost. `npx tsc --noEmit`.
- **Depends on:** 1

#### 3. Остальные уроки + каталог + карта курса — M · `[x]`

- **Why:** один урок не курс.
- **Files:** `02-use`, `03-spelling`, `04-negatives`, `05-questions`, `99-test.json`, дописать bank/rules, `content/courses/catalog.json`, `lib/courses/catalog.ts`, `app/(app)/courses/grammar/page.tsx`, `app/(app)/courses/grammar/[course]/page.tsx`, `tests/unit/courses-catalog.test.ts`, `tests/unit/nav.test.ts`.
- **Does:** каталог как Trainings. Карта курса — нумерованные шаги с `title` + `titleRu`, без lock. Test — смесь правил, без новой теории. Next в каталоге: to-be, continuous, past-simple.
- **Verify:** схема на всём `present-simple/`. Каталог: Present Simple `available`, `to-be-present` `coming`. Nav: вложенный путь подсвечивает Grammar.
- **Depends on:** 1 и 2

#### 4. Прогресс и My courses — M · `[x]`

- **Why:** иначе нет «где остановился».
- **Files:** `prisma/schema.prisma`, миграция, `lib/courses/progress.ts`, `app/api/courses/progress/route.ts`, `app/(app)/courses/my/page.tsx`, дописать `lesson-player.tsx`, `tests/unit/courses-progress.test.ts`.
- **Does:** upsert. ≥80% → lesson completed; тест ≥90% → `UserCourse.completedAt`. Писать `missedRuleIds`. Auth: только свой userId (`lib/ownership.ts` как у слов).
- **Verify:** 80% completed; 79% нет, attempts+1; лучший score растёт; тест 89% не завершает курс. `npm test`. Миграция аддитивная.
- **Depends on:** 3

Мерж фазы 1 в `main` после шага 4, когда петля Present Simple проходит руками. Спросить перед мержем (`CLAUDE.md`).

### Фаза 2 — после мержа фазы 1

Не начинать, пока фаза 1 не на `main` и банк не проверен на живом курсе.

#### 5. `UserRule` + очередь due — M · `[ ]`

- **Why:** заглушка Practice / Grammar обещает «ошибки возвращаются как due-слова»; единица уже есть.
- **Files:** `prisma/schema.prisma` (`UserRule`: `userId+ruleId`, те же FSRS-колонки что у `UserWord`), миграция, переименовать `ScheduledWord` → нейтральное в `lib/srs.ts`, `lib/courses/schedule-rule.ts`, сид из `missedRuleIds` при завершении урока.
- **Does:** ошибка в курсе создаёт/сдвигает `UserRule`. Повтор того же упражнения не создаёт вторую карточку.
- **Verify:** два промаха по одному `ruleId` — одна строка; `scheduleReview` на правиле даёт тот же shape, что на слове.
- **Depends on:** 4 на `main`

#### 6. `/practice/grammar` тянет банк — M · `[ ]`

- **Why:** due без вопроса — таблица в вакууме.
- **Files:** `lib/courses/drill.ts` (для due-правила взять exercise из `bank.json`, которого нет в последнем уроке), `app/(app)/practice/grammar/page.tsx`, `app/api/practice/grammar/route.ts`, переиспользовать `exercise-view.tsx`.
- **Does:** сессия как Trainings, единица — правило. Верный/неверный → `scheduleReview`. Пустой банк на правило — не предлагать это правило.
- **Verify:** после промаха в Forms due через день достаёт item из bank, не `ps-forms-03`.
- **Depends on:** 5

### Фаза 3 — остальные времена

По одному курсу JSON на ту же схему, без нового кода плеера. Порядок — каталог выше. Первый после Present Simple: `to-be-present` (он в Essential раньше и короткий) **или** `present-continuous`, как решит владелец по живому ощущению фазы 1.

## Risks

| Risk | Early signal | Что делать |
|---|---|---|
| Схема не тянет transform / bank | шаг 1 | чинить схему до плеера |
| Петля скучная | шаг 2 | короче explanation, не новые типы |
| Копируем Murphy | дифф JSON | SOURCE.md, PDF не в git |
| `judge()` словаря прощает `-s` | шаг 2 | свой `answer.ts` |
| 12 Coming пустят каталог | шаг 3 | один живой + 3–4 Next |
| Банк слишком похож на урок | шаг 1 / 6 | разные предложения, тот же ruleId |

## Rollback

- Шаги 1–3: revert ветки.
- Шаг 4: drop `UserCourse` / `UserLesson`. Слова не задеты.
- Шаг 5: drop `UserRule`. Переименование в `lib/srs.ts` обратимо.

## Test plan

- Unit: схема, ответы (`accept[]`), пороги, nav, позже schedule-rule.
- Не гоняем: e2e, браузер, `npm run dev`.
- CI как сейчас. Ветка на Vercel не деплоится.

## Rollout

Ветка `feat/courses-grammar` от `main`, копить коммиты. `npm test` перед мержем. Без флага: заглушки уже были. Миграция шага 4 только вместе с записью прогресса.

После мержа фазы 1: залогиниться → Forms → закрыть вкладку → My courses показывает last lesson.

## Open questions

- [x] Медицина? нет.
- [x] Пороги? 80 / 90.
- [x] Подписи уроков? EN + RU строка.
- [x] Фаза 3 порядок: Present Simple → to be → Present Continuous → Past Simple. Владелец, 2026-08-14.

## Deferred

- Topics (`dialogue` / `text` в том же плеере) и Ready-made sets.
- Кнопка «Add these phrases» (`source = "course:present-simple"`).
- Learning map. Когда дойдём — сменить копи заглушки (`Locked steps…`), замок не строить.
- `order`, `audio-gap`, LLM-генерация упражнений.
- Кубки, сертификаты, 227 уроков.
