'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface OperatorAccess {
  /** True when /api/settings accepts the current session (LazyCat inject or Basic). */
  isOperator: boolean;
  /** null until probed; true while first-run wizard is still required. */
  needsSetup: boolean | null;
  ready: boolean;
}

// Lightweight probe for operator-only chrome on the public player. Mirrors the
// lazycat-aware path in adminAuth (credentials: 'include' + ingress inject).
export function useOperatorAccess(): OperatorAccess {
  const [isOperator, setIsOperator] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/settings`, { credentials: 'include' });
        if (cancelled) return;
        if (!r.ok) return;

        setIsOperator(true);
        try {
          const st = await fetch(`${API_URL}/onboarding/status`, { credentials: 'include' });
          if (!cancelled && st.ok) {
            const j = (await st.json()) as { needsSetup?: boolean };
            setNeedsSetup(!!j.needsSetup);
          }
        } catch {
          /* onboarding status is best-effort */
        }
      } catch {
        /* public listener — no operator chrome */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isOperator, needsSetup, ready };
}
