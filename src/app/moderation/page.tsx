import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data";
import { REPORT_REASONS } from "@/lib/data/types";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

/** Looks with reports nobody has reviewed. Each opens on the look, where Keep and Delete are. */
export default async function ModerationPage() {
  const account = await repository.getAccount();
  if (!account?.moderator) notFound();
  const reported = await repository.listReports();

  return (
    <main id="main" className="wrap flex flex-col gap-5 py-10">
      <h1 className="text-2xl">Reports</h1>
      <p className="text-sm text-ink-dim">
        Open a look to keep it, which shows it again and clears its reports, or to delete it.
      </p>
      {reported.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-md border border-line bg-surface">
          {reported.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
              <Link href={`/wardrobe/${r.id}`} className="flex-1 text-ink underline-offset-2 hover:underline">
                {r.title}
              </Link>
              {r.hidden && <span className="text-xs text-bad">Hidden</span>}
              <span className="nums text-xs text-ink-dim">
                {r.reports} {r.reports === 1 ? "report" : "reports"}
              </span>
              <span className="w-full text-xs text-ink-faint">{r.reasons.map((k) => REPORT_REASONS[k]).join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-ink-dim">
          No reports waiting.
        </p>
      )}
    </main>
  );
}
