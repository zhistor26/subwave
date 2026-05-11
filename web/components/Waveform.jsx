'use client';

import { useEffect, useRef, useState } from 'react';
import { useAnalyser, useSpectrum } from '../lib/hooks';

const BARS = 120;

export default function Waveform({ audioRef, tunedIn, progress }) {
  const { ready, read } = useAnalyser(audioRef, tunedIn);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const fallback = useSpectrum(BARS, tunedIn && !ready, 60);
  const [, force] = useState(0);

  // Drive real-analyser bars via rAF when available, otherwise pseudo-random
  // via the fallback (which re-renders on its own interval).
  useEffect(() => {
    if (!ready || !tunedIn) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const bins = read();
      const container = containerRef.current;
      if (bins && container) {
        const spans = container.querySelectorAll('[data-bar]');
        const step = Math.max(1, Math.floor(bins.length / BARS));
        for (let i = 0; i < spans.length; i++) {
          const v = bins[Math.min(bins.length - 1, i * step)] / 255;
          spans[i].style.height = `${10 + Math.pow(v, 0.7) * 95}%`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready, tunedIn, read]);

  // When the real analyser is in charge, suppress the fallback array influence;
  // we still need a single re-render to flip data attributes on mount.
  useEffect(() => { force(x => x + 1); }, [ready, tunedIn]);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none flex items-center"
      style={{
        left: 0,
        right: 96,
        bottom: 100,
        height: 160,
        padding: '0 32px',
        gap: 2,
        opacity: 0.18,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const past = i / BARS < progress;
        const usingReal = ready && tunedIn;
        const height = usingReal ? '10%' : `${10 + Math.pow(fallback[i] ?? 0.1, 0.7) * 95}%`;
        return (
          <span
            key={i}
            data-bar
            style={{
              flex: 1,
              height,
              background: past ? 'var(--accent)' : 'var(--ink)',
              transition: usingReal ? 'height 60ms linear' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
