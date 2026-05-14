'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const STORAGE_KEY = 'subwave_admin_auth';

// Shared admin auth state. The controller protects /settings, /debug, and the
// admin POST endpoints with HTTP Basic; we cache a base64 token in
// localStorage so the user only signs in once per browser.
export function useAdminAuth() {
  const [auth, setAuth] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAuth(stored);
    } catch {}
    setHydrated(true);
  }, []);

  const signIn = useCallback((user, pass) => {
    const token = (typeof window !== 'undefined' ? window.btoa : (s => Buffer.from(s).toString('base64')))(`${user}:${pass}`);
    try { localStorage.setItem(STORAGE_KEY, token); } catch {}
    setAuth(token);
    setNeedsAuth(false);
  }, []);

  const signOut = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setAuth(null);
    setNeedsAuth(true);
  }, []);

  // Wraps fetch so every admin call carries the Authorization header and
  // flips us into the sign-in flow on 401.
  const adminFetch = useCallback(async (path, init = {}) => {
    const headers = { ...(init.headers || {}) };
    if (auth) headers.Authorization = `Basic ${auth}`;
    const r = await fetch(`${API_URL}${path}`, { ...init, headers });
    if (r.status === 401) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setAuth(null);
      setNeedsAuth(true);
    } else if (needsAuth) {
      setNeedsAuth(false);
    }
    return r;
  }, [auth, needsAuth]);

  return { auth, needsAuth, hydrated, signIn, signOut, adminFetch };
}

export { API_URL as ADMIN_API_URL, STORAGE_KEY as ADMIN_STORAGE_KEY };
