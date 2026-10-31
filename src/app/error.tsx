"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="wrap flex flex-col items-start gap-3 py-20">
      <h1 className="text-3xl">That page broke</h1>
      <p className="text-sm text-ink-dim">Your clipboard and the codes you copied are fine. Try the page again.</p>
      <Button size="sm" onClick={reset}>Try again</Button>
    </main>
  );
}
