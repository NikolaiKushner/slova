import type { ReactNode } from "react";

import type { Block } from "@/content/courses/schema";
import { mdToNodes } from "@/lib/courses/md";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TheoryBlock = Exclude<Block, { type: "exercise" }>;

/** A new explanation starts a new band on the card; examples stay with it. */
export function groupTheoryBlocks(blocks: TheoryBlock[]): TheoryBlock[][] {
  const groups: TheoryBlock[][] = [];
  let current: TheoryBlock[] = [];

  for (const block of blocks) {
    if (block.type === "explanation" && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(block);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

export function TheoryView({
  blocks,
  framed = true,
}: {
  blocks: TheoryBlock[];
  /** False inside a drawer, which is already a surface. */
  framed?: boolean;
}) {
  const groups = groupTheoryBlocks(blocks);
  const body = groups.map((group, index) => (
    <div key={group.map((block) => block.type).join("-") + index}>
      {index > 0 ? <Separator /> : null}
      {framed ? (
        <CardContent className="py-4">
          <TheoryGroup blocks={group} />
        </CardContent>
      ) : (
        <div className="py-4">
          <TheoryGroup blocks={group} />
        </div>
      )}
    </div>
  ));

  if (!framed) return <div>{body}</div>;
  return <Card className="gap-0 py-0">{body}</Card>;
}

function TheoryGroup({ blocks }: { blocks: TheoryBlock[] }) {
  const nodes: ReactNode[] = [];
  let examples: Extract<TheoryBlock, { type: "example" }>[] = [];

  function flushExamples() {
    if (examples.length === 0) return;
    const batch = examples;
    examples = [];
    nodes.push(
      <ul key={`examples-${batch[0]?.en}`} className="space-y-2.5">
        {batch.map((block) => (
          <li key={block.en}>
            <BlockView block={block} />
          </li>
        ))}
      </ul>,
    );
  }

  for (const [index, block] of blocks.entries()) {
    if (block.type === "example") {
      examples.push(block);
      continue;
    }
    flushExamples();
    nodes.push(<BlockView key={`${block.type}-${index}`} block={block} />);
  }
  flushExamples();

  return <div className="space-y-3">{nodes}</div>;
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

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "explanation":
      return (
        <div className="space-y-3">
          <MdParagraphs
            md={block.md}
            className="text-foreground text-base leading-relaxed"
          />
        </div>
      );
    case "pitfall":
      return (
        <div className="bg-accent text-foreground space-y-2 rounded-lg px-3 py-2.5 text-sm leading-relaxed">
          <MdParagraphs md={block.md} className="leading-relaxed" />
        </div>
      );
    case "example":
      return (
        <p className="flex flex-col gap-0.5">
          <span className="font-display text-lg leading-snug">{block.en}</span>
          <span className="text-muted-foreground text-sm">{block.ru}</span>
        </p>
      );
    case "table":
      return (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {block.headers.map((header) => (
                <TableHead key={header} className="text-muted-foreground h-8">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row) => (
              <TableRow key={row.join("|")} className="hover:bg-transparent">
                {row.map((cell, index) => (
                  <TableCell
                    key={`${row.join("|")}-${index}`}
                    className="font-display py-1.5 text-base"
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    case "exercise":
      return null;
  }
}
