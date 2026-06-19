'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function isLazyCatHost(): boolean {
  return typeof window !== 'undefined' && /\.heiyu\.space$/i.test(window.location.hostname);
}

export interface OperatorAccess {
  /** True when /api/settings accepts the current session (LazyCat ingress or Basic). */
  isOperator: boolean;
  /** null until probed; true while first-run wizard is still required. */
  needsSetup: boolean | null;
  ready: boolean;
}

// Lightweight probe for operator-only chrome on the public player.
export function useOperatorAccess(): OperatorAccess {
  const [isOperator, setIsOperator] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // On LazyCat, show operator nav without probing protected APIs — bare
      // fetch('/api/settings') can trigger the browser's HTTP Basic dialog.
      // /onboarding/status is public in the LPK, so it is safe to use for
      // deciding whether "Setup" should open the wizard or the live settings.
      if (isLazyCatHost()) {
        if (!cancelled) {
          setIsOperator(true);
        }
        try {
          const st = await fetch(`${API_URL}/onboarding/status`, { credentials: 'include' });
          if (!cancelled && st.ok) {
            const j = (await st.json()) as { needsSetup?: boolean };
            setNeedsSetup(!!j.needsSetup);
          }
        } catch {
          /* best-effort */
        } finally {
          if (!cancelled) setReady(true);
        }
        return;
      }

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
          /* best-effort */
        }
      } catch {
        /* public listener */
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
