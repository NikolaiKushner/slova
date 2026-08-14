import type { ReactNode } from "react";

/**
 * Course copy is short Markdown: emphasis with **double asterisks**, nothing
 * else. A library would be a dependency for a split we can see.
 */
export function mdToNodes(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={index} className="font-medium text-foreground">
          {bold[1]}
        </strong>
      );
    }
    return part;
  });
}
