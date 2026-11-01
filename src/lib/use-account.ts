import { useEffect, useState } from "react";
import type { Account } from "@/lib/data/types";

// The session cookie itself, not the short-lived ones a sign-in leaves on its way out.
const SESSION_COOKIE = /(?:^|; )sb-[^=]+-auth-token(?:\.0)?=/;

/** Who is signed in. Visitors with no session cookie cost no request. */
export function useAccount(enabled = true) {
  const state = useState<Account | null>(null);
  const setAccount = state[1];
  useEffect(() => {
    if (!enabled || !SESSION_COOKIE.test(document.cookie)) return;
    const request = new AbortController();
    fetch("/api/account", { signal: request.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { account: Account | null } | null) => setAccount(body?.account ?? null))
      .catch(() => {});
    return () => request.abort();
  }, [enabled, setAccount]);
  return state;
}
