'use client';

import { Settings, Radio, Headphones } from 'lucide-react';

// Compact, mood-flavored subtitle for the header: festival > show + vibe + weather.
// Examples: "late · late hours · 6° clear" · "diwali · festival · 18° clear".
function buildTagline(context) {
  if (!context) return null;
  const parts = [];

  if (context.festival?.name) {
    parts.push(context.festival.name.toLowerCase());
    if (context.festival.mood) parts.push(context.festival.mood);
  } else {
    if (context.time?.show) parts.push(context.time.show);
    if (context.time?.vibe && context.time.vibe !== context.time?.show) {
      parts.push(context.time.vibe);
    }
  }

  if (context.weather && context.weather.condition && context.weather.condition !== 'unknown') {
    const t = context.weather.temp;
    const cond = context.weather.condition;
    parts.push(Number.isFinite(t) ? `${t}° ${cond}` : cond);
  }

  return parts.length ? parts.join(' · ') : null;
}

export default function TopBar({ tunedIn, context, djName, listeners, onOpenSettings, tickerOn, onToggleTicker }) {
  const tagline = buildTagline(context);
  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-baseline justify-between gap-3 z-20 px-4 py-4 sm:px-8 sm:py-6"
      style={{ borderBottom: '1px solid var(--ink)' }}
    >
      <div className="flex items-baseline gap-2 sm:gap-[14px] min-w-0">
        <span className="v3-eyebrow shrink-0">SUB/WAVE</span>
        {djName && (
          <span className="v3-caption truncate" style={{ color: 'var(--accent)' }}>
            with {djName}
          </span>
        )}
        {tagline && (
          <span
            className="hidden md:inline v3-caption truncate"
            style={{ color: 'var(--muted)' }}
            title={tagline}
          >
            {tagline}
          </span>
        )}
      </div>
      <div
        className="flex items-baseline gap-3 sm:gap-[18px] v3-caption shrink-0"
        style={{ color: 'var(--muted)' }}
      >
        <span className="whitespace-nowrap">
          <span style={{ color: tunedIn ? 'var(--accent)' : 'var(--muted)' }}>●</span>
          <span className="hidden sm:inline">{' '}{tunedIn ? 'listening' : 'not tuned'}</span>
        </span>
        {listeners?.current != null && (
          <span
            className="whitespace-nowrap v3-tab-num inline-flex items-center gap-1.5"
            style={{ color: listeners.current > 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: 600 }}
            title={`${listeners.current} listening · peak ${listeners.peak ?? 0}`}
            aria-label={`${listeners.current} listening`}
          >
            <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
            {listeners.current}
          </span>
        )}
        {onToggleTicker && (
          <button
            onClick={onToggleTicker}
            className="v3-focus cursor-pointer"
            style={{ color: tickerOn ? 'var(--accent)' : 'var(--muted)' }}
            aria-label={tickerOn ? 'Hide booth feed ticker' : 'Show booth feed ticker'}
            title={tickerOn ? 'Hide booth ticker' : 'Show booth ticker'}
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onOpenSettings}
          className="v3-focus cursor-pointer"
          style={{ color: 'var(--ink)' }}
          aria-label="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
