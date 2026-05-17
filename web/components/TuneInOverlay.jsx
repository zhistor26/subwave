'use client';

import { Play } from 'lucide-react';

// Full-bleed first-paint gate. A new listener lands on a player that shows
// live track info but isn't actually playing — the small "Tune In" button in
// the footer is easy to miss. This overlay makes the call-to-action
// unmissable, and the tap doubles as the browser gesture that unblocks audio,
// so the stream starts on the first interaction with no second click.
export default function TuneInOverlay({ onTune, nowPlaying }) {
  const track = nowPlaying?.title
    ? `${nowPlaying.title}${nowPlaying.artist ? ` — ${nowPlaying.artist}` : ''}`
    : null;

  return (
    <button
      type="button"
      onClick={onTune}
      aria-label="Tune in to the live stream"
      className="absolute inset-0 z-50 v3-focus v3-fade-in flex flex-col items-center justify-center gap-7 cursor-pointer text-center px-6"
      style={{
        background: 'color-mix(in oklab, var(--bg) 6%, transparent)',
        color: 'var(--ink)',
        backdropFilter: 'blur(1.5px) saturate(1.9) brightness(1.07)',
        WebkitBackdropFilter: 'blur(1.5px) saturate(1.9) brightness(1.07)',
      }}
    >
      <span className="v3-eyebrow flex items-center gap-2" style={{ color: 'var(--accent)' }}>
        <span className="bs-live-dot" />
        on air now
      </span>

      <span
        className="v3-tunein-pulse flex items-center justify-center rounded-full"
        style={{ width: 92, height: 92, background: 'var(--ink)', color: 'var(--bg)' }}
      >
        <Play size={34} strokeWidth={1.5} fill="currentColor" style={{ marginLeft: 4 }} />
      </span>

      <span className="flex flex-col items-center gap-2 max-w-[34ch]">
        <span className="v3-title">Tap to tune in</span>
        <span className="v3-caption" style={{ color: 'var(--muted)' }}>
          audio is paused — tap anywhere to start listening
        </span>
        {track && (
          <span className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
            now playing · <span style={{ color: 'var(--ink)' }}>{track}</span>
          </span>
        )}
      </span>
    </button>
  );
}
