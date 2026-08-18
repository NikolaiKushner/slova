"use client";

import { useEffect } from "react";

import { BrandWordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { inter, literata } from "@/app/fonts";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("root_render_failed", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full items-center justify-center px-5 py-16 font-sans">
        <main className="relative z-[1] w-full max-w-lg text-center">
          <BrandWordmark className="text-2xl" />
          <h1 className="text-h1 mt-8">Something went wrong</h1>
          <p className="text-muted-foreground mt-3 text-body">
            The page could not be opened. Try loading it again.
          </p>
          <Button className="mt-8" size="lg" onClick={retry}>
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
