import { cn } from "@/lib/utils";

/**
 * A word form in a grammar lesson — §14.
 *
 * Mono, muted chip. The ending that the rule is about sits in `<TokenMark>`
 * inside it, so `work` + `s` reads as one token and the `s` still lights up.
 */
export function Token({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      data-slot="token"
      className={cn(
        "text-token bg-secondary rounded-sm px-1.5 py-px whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The highlighted ending inside a Token (`-s`, `es`, `ies`). */
export function TokenMark({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <mark className={cn("token-mark", className)}>{children}</mark>;
}
