import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Page width lives here, not in the app shell.
 *
 * 828.5px is the iPad Air column beside the 287.5px sidebar, after the shell
 * padding (1180 − 287.5 − 64). Every app screen uses it — lessons, the lesson
 * list, the dictionary, Today. Wider screens stay at that; a phone shrinks.
 */
export function Page({ className, children }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-[828.5px]", className)}>
      {children}
    </div>
  );
}

/** Same width as `Page`. Kept so the dictionary import does not have to move. */
export const PageWide = Page;
