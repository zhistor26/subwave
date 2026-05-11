'use client';

import { useRef } from 'react';

const MOOD_CHIPS = [
  'late-night driving',
  'more like this',
  'something punjabi',
  'surprise me',
  'rainy day',
];

export default function RequestDrawer({
  requestText, setRequestText,
  requesterName, setRequesterName,
  isSubmitting, onSubmit,
}) {
  const taRef = useRef(null);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 0 }}>
        Describe a mood, a memory, an artist. Ollama parses it, matches the library,
        and the DJ acknowledges you on-air.
      </p>

      <div className="flex flex-wrap" style={{ gap: 6, margin: '18px 0' }}>
        {MOOD_CHIPS.map(m => (
          <button
            key={m}
            onClick={() => { setRequestText(m); taRef.current?.focus(); }}
            className="cursor-pointer v3-focus"
            style={{
              background: 'transparent',
              border: '1px solid var(--ink)',
              color: 'var(--ink)',
              padding: '6px 12px',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontFamily: 'inherit',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={requesterName}
        onChange={e => setRequesterName(e.target.value)}
        placeholder="your name (optional)"
        className="w-full v3-focus"
        style={{
          boxSizing: 'border-box',
          border: '1px solid var(--ink)',
          background: 'transparent',
          padding: 10,
          fontSize: 13,
          fontFamily: 'inherit',
          color: 'var(--ink)',
          marginBottom: 8,
        }}
      />

      <textarea
        ref={taRef}
        value={requestText}
        onChange={e => setRequestText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder='"something for late-night driving"…'
        rows={3}
        className="w-full v3-focus"
        style={{
          resize: 'none',
          boxSizing: 'border-box',
          border: '1px solid var(--ink)',
          background: 'transparent',
          padding: 14,
          fontSize: 16,
          fontFamily: 'inherit',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />

      <button
        onClick={onSubmit}
        disabled={isSubmitting || !requestText.trim()}
        className="w-full v3-eyebrow v3-focus mt-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          padding: '14px 24px',
        }}
      >
        {isSubmitting ? 'Sending…' : 'Send to the booth'}
      </button>
    </div>
  );
}
