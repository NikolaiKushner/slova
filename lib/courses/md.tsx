import type { ReactNode } from "react";

import { Token, TokenMark } from "@/components/slova/token";

/**
 * Course copy is short Markdown: **emphasis**, `a token`, ==an ending==.
 * A library would be a dependency for a split we can see.
 *
 * Tokens wrap forms (`work → work==s==`). Marks light up the ending the rule
 * is about, including inside a token. Nothing else is parsed.
 */

const CHUNK = /(`[^`]+`|\*\*[^*]+\*\*|==[^=]+==)/;

export function mdToNodes(text: string): ReactNode[] {
  return text.split(CHUNK).map((part, index) => {
    if (!part) return null;

    const token = /^`([^`]+)`$/.exec(part);
    if (token?.[1] !== undefined) {
      return <Token key={index}>{mdMarks(token[1], `t${index}`)}</Token>;
    }

    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold?.[1] !== undefined) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {mdMarks(bold[1], `b${index}`)}
        </strong>
      );
    }

    const mark = /^==([^=]+)==$/.exec(part);
    if (mark?.[1] !== undefined) {
      return <TokenMark key={index}>{mark[1]}</TokenMark>;
    }

    return part;
  });
}

function mdMarks(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(==[^=]+==)/).map((part, index) => {
    const mark = /^==([^=]+)==$/.exec(part);
    if (mark?.[1] !== undefined) {
      return <TokenMark key={`${keyPrefix}-${index}`}>{mark[1]}</TokenMark>;
    }
    return part;
  });
}
