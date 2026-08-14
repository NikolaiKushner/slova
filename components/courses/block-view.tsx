import type { Block } from "@/content/courses/schema";
import { mdToNodes } from "@/lib/courses/md";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "explanation":
      return <p className="text-foreground leading-relaxed">{mdToNodes(block.md)}</p>;
    case "pitfall":
      return (
        <p className="text-muted-foreground leading-relaxed">
          {mdToNodes(block.md)}
        </p>
      );
    case "example":
      return (
        <p className="flex flex-col gap-1">
          <span className="font-display text-xl leading-snug">{block.en}</span>
          <span className="text-muted-foreground text-sm">{block.ru}</span>
        </p>
      );
    case "table":
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {block.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row) => (
              <TableRow key={row.join("|")}>
                {row.map((cell, index) => (
                  <TableCell key={`${row.join("|")}-${index}`}>{cell}</TableCell>
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
