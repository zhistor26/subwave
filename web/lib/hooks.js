'use client';

import { useEffect, useRef, useState } from 'react';

export function useClock() {
  const [t, setT] = useState(null);
  useEffect(() => {
    setT(new Date());
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// Pseudo-random animated spectrum used as fallback when the real analyser
// can't attach (CORS, paused, no AudioContext, etc.). Values in [0, 1].
export function useSpectrum(bins = 120, active = true, speed = 60) {
  const [arr, setArr] = useState(() => Array(bins).fill(0.1));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setArr(prev => prev.map((v, i) => {
        const target = Math.pow(Math.random(), 1.4) * (1 - i / (bins * 2.2));
        return v + (target - v) * 0.45;
      }));
    }, speed);
    return () => clearInterval(id);
  }, [active, bins, speed]);
  return arr;
}

// Web Audio analyser hook — wires an AnalyserNode to the given <audio> ref
// the first time `active` flips true, then writes per-frame frequency bytes
// into an internal ref read via `read()`. Returns `{ ready, read }`. If CORS
// or anything else blocks attachment, `ready` stays false and `read()` returns
// null — callers should fall back to `useSpectrum`.
export function useAnalyser(audioRef, active) {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const binsRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active || !audioRef?.current) return;
    let cancelled = false;
    (async () => {
      try {
        if (!ctxRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctxRef.current = new AC();
        }
        if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
        if (!sourceRef.current) {
          sourceRef.current = ctxRef.current.createMediaElementSource(audioRef.current);
          analyserRef.current = ctxRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.78;
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(ctxRef.current.destination);
          binsRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }
        if (!cancelled) setReady(true);
      } catch {
        // CORS or other failure — stay not-ready
      }
    })();
    return () => { cancelled = true; };
  }, [active, audioRef]);

  const read = () => {
    if (!ready || !analyserRef.current || !binsRef.current) return null;
    analyserRef.current.getByteFrequencyData(binsRef.current);
    return binsRef.current;
  };

  return { ready, read };
}
