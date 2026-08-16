"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { TheoryBlock } from "@/content/courses/schema";
import { Callout } from "@/components/slova/callout";
import { RuleExample } from "@/components/slova/rule-example";
import { resolveCourseAudio } from "@/lib/courses/audio";
import { mdToNodes } from "@/lib/courses/md";
import { speakText } from "@/lib/courses/speak-text";
import { cn } from "@/lib/utils";

/**
 * Theory on the lesson page. A heading or a pitfall starts a new section;
 * examples, tables, rules and the recap stay with the heading above them.
 * The first explanation before any heading is the lead — it has no overline.
 */
export function groupTheoryBlocks(blocks: TheoryBlock[]): TheoryBlock[][] {
  const groups: TheoryBlock[][] = [];
  let current: TheoryBlock[] = [];

  function flush() {
    if (current.length === 0) return;
    groups.push(current);
    current = [];
  }

  for (const block of blocks) {
    if (block.type === "heading" || block.type === "pitfall") {
      flush();
    }
    current.push(block);
  }
  flush();
  return groups;
}

export function TheoryView({ blocks }: { blocks: TheoryBlock[] }) {
  const groups = groupTheoryBlocks(blocks);

  return (
    <div>
      {groups.map((group, index) => (
        <TheorySection
          key={group.map((block) => block.type).join("-") + index}
          blocks={group}
          lead={index === 0 && group[0]?.type !== "heading"}
        />
      ))}
    </div>
  );
}

function TheorySection({
  blocks,
  lead,
}: {
  blocks: TheoryBlock[];
  lead: boolean;
}) {
  const heading = blocks.find((block) => block.type === "heading");
  const rest = blocks.filter((block) => block.type !== "heading");

  return (
    <section className={lead ? "mt-6.5" : "mt-11"}>
      {heading ? (
        <h2 className="text-overline text-eyebrow border-border mb-3.5 border-b pb-2.5">
          {heading.title}
        </h2>
      ) : null}
      <TheoryBody blocks={rest} lead={lead} />
    </section>
  );
}

function TheoryBody({
  blocks,
  lead,
}: {
  blocks: TheoryBlock[];
  lead: boolean;
}) {
  const nodes: ReactNode[] = [];
  let examples: Extract<TheoryBlock, { type: "example" }>[] = [];

  function flushExamples() {
    if (examples.length === 0) return;
    const batch = examples;
    examples = [];
    nodes.push(
      <div key={`examples-${batch[0]?.en}`} className="space-y-3.5">
        {batch.map((block) => (
          <CourseRuleExample key={block.en} block={block} />
        ))}
      </div>,
    );
  }

  for (const [index, block] of blocks.entries()) {
    if (block.type === "example") {
      examples.push(block);
      continue;
    }
    flushExamples();
    nodes.push(
      <BlockView
        key={`${block.type}-${index}`}
        block={block}
        lead={lead && block.type === "explanation"}
      />,
    );
  }
  flushExamples();

  return <div className="space-y-3.5">{nodes}</div>;
}

function MdParagraphs({
  md,
  className,
}: {
  md: string;
  className: string;
}) {
  const parts = md.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => (
        <p key={index} className={className}>
          {mdToNodes(part)}
        </p>
      ))}
    </>
  );
}

export function BlockView({
  block,
  lead = false,
}: {
  block: TheoryBlock;
  lead?: boolean;
}) {
  const t = useTranslations("courses");

  switch (block.type) {
    case "heading":
      return null;
    case "explanation":
      return (
        <div className="space-y-3.5">
          <MdParagraphs
            md={block.md}
            className={lead ? "text-lead text-pretty" : "text-body text-pretty"}
          />
        </div>
      );
    case "pitfall":
      return (
        <Callout variant="warning" title={t("pitfallTitle")}>
          <MdParagraphs md={block.md} className="last:mb-0" />
        </Callout>
      );
    case "example":
      return <CourseRuleExample block={block} />;
    case "table":
      return <FormsTable headers={block.headers} rows={block.rows} />;
    case "rules":
      return (
        <ul className="flex flex-col gap-2.5">
          {block.items.map((item) => (
            <li key={item.tag + item.md} className="flex items-baseline gap-3">
              <span className="text-token text-accent-foreground bg-accent min-w-[62px] shrink-0 rounded-sm px-2 py-0.5 text-center">
                {item.tag}
              </span>
              <span className="text-body">{mdToNodes(item.md)}</span>
            </li>
          ))}
        </ul>
      );
    case "recap":
      return (
        <div className="bg-card border-border flex flex-wrap gap-x-5.5 gap-y-4 rounded-lg border px-5 py-[18px]">
          {block.items.map((item) => (
            <div key={item.k} className="min-w-[180px] flex-1">
              <p className="text-overline text-muted-foreground mb-1.5">
                {item.k}
              </p>
              <p className="text-body-sm">{mdToNodes(item.v)}</p>
            </div>
          ))}
        </div>
      );
  }
}

function CourseRuleExample({
  block,
}: {
  block: Extract<TheoryBlock, { type: "example" }>;
}) {
  const text = speakText(block.en);
  const audio = resolveCourseAudio(text);

  return (
    <RuleExample
      en={mdToNodes(block.en)}
      ru={mdToNodes(block.ru)}
      speakText={text}
      normalUrl={audio?.normalUrl}
      slowUrl={audio?.slowUrl}
    />
  );
}

function FormsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const columns = headers.length;

  return (
    <div
      className="bg-card border-border my-1 inline-grid overflow-hidden rounded-lg border"
      style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}
    >
      {headers.map((header, columnIndex) => (
        <div
          key={header}
          className={cn(
            "bg-muted text-overline text-muted-foreground px-5 py-2",
            columnIndex < columns - 1 && "border-border-subtle border-r",
            "border-border-subtle border-b",
          )}
        >
          {mdToNodes(header)}
        </div>
      ))}
      {rows.flatMap((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            className={cn(
              "text-token border-border-subtle px-5 py-2.5",
              columnIndex < columns - 1 && "border-r",
              rowIndex < rows.length - 1 && "border-b",
            )}
          >
            {mdToNodes(cell)}
          </div>
        )),
      )}
    </div>
  );
}
