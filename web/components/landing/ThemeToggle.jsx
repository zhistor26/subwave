'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStoredTheme, setTheme as persistTheme } from '../../lib/theme';

// Light/dark toggle for the landing-page masthead. Resolves the *applied*
// theme on mount (a stored manual choice, else prefers-color-scheme), then
// flips between explicit 'light'/'dark' modes on click.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="cursor-pointer inline-flex items-center justify-center"
      style={{ color: 'var(--muted)', background: 'none', border: 'none', padding: 2 }}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark'
        ? <Sun style={{ width: 13, height: 13 }} aria-hidden="true" />
        : <Moon style={{ width: 13, height: 13 }} aria-hidden="true" />}
    </button>
  );
}
