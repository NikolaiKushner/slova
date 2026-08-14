import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Ghost control at the bottom of a nested page, back to the list it came from. */
export function PageBack({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-10">
      <Button variant="ghost" size="lg" render={<Link href={href} />}>
        <ArrowLeft data-icon="inline-start" />
        {label}
      </Button>
    </div>
  );
}
