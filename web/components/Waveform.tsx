'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useAnalyser } from '@/lib/hooks';
import { cn } from '@/lib/cn';

const BARS = 120;

export interface WaveformProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  tunedIn: boolean;
  progress: number;
}

export default function Waveform({ audioRef, tunedIn, progress }: WaveformProps) {
  const { ready, read } = useAnalyser(audioRef, tunedIn);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Drive bars via rAF when the real analyser is attached. When it isn't —
  // notably iOS Safari, where createMediaElementSource on a streaming MP3
  // returns silence — bars stay at their default static height rather than
  // running a pseudo-random animation that misleads listeners into thinking
  // the visualisation tracks the music.
  useEffect(() => {
    const clearHeights = () => {
      const container = containerRef.current;
      if (!container) return;
      const spans = container.querySelectorAll<HTMLSpanElement>('[data-bar]');
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        if (span) span.style.height = '';
      }
    };
    if (!ready || !tunedIn) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearHeights();
      return;
    }
    const tick = () => {
      const bins = read();
      const container = containerRef.current;
      if (bins && container) {
        const spans = container.querySelectorAll<HTMLSpanElement>('[data-bar]');
        const step = Math.max(1, Math.floor(bins.length / BARS));
        for (let i = 0; i < spans.length; i++) {
          const v = (bins[Math.min(bins.length - 1, i * step)] ?? 0) / 255;
          const span = spans[i];
          if (span) span.style.height = `${10 + Math.pow(v, 0.7) * 95}%`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready, tunedIn, read]);

  const usingReal = ready && tunedIn;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-3 bottom-20 flex h-[110px] items-center gap-px px-1 opacity-[0.22] sm:right-24 sm:bottom-[100px] sm:left-0 sm:h-40 sm:gap-0.5 sm:px-8"
      aria-hidden="true"
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const past = i / BARS < progress;
        return (
          <span
            key={i}
            data-bar
            className={cn(
              'h-[10%] flex-1',
              past ? 'bg-vermilion' : 'bg-ink',
              usingReal && '[transition:height_60ms_linear]',
            )}
          />
        );
      })}
    </div>
  );
}
