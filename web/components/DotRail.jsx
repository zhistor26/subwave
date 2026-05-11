'use client';

const ITEMS = [
  { k: 'queue',   l: 'Queue' },
  { k: 'history', l: 'Played' },
  { k: 'booth',   l: 'Booth' },
  { k: 'request', l: 'Request' },
];

export default function DotRail({ counts, active, onSelect }) {
  return (
    <div
      className="absolute z-20 flex flex-col items-center justify-center"
      style={{
        top: 80,
        right: 0,
        bottom: 80,
        width: 96,
        borderLeft: '1px solid var(--ink)',
        gap: 4,
      }}
    >
      {ITEMS.map(item => {
        const isActive = active === item.k;
        const n = item.k === 'request' ? '+' : (counts?.[item.k] ?? 0);
        return (
          <button
            key={item.k}
            onClick={() => onSelect(isActive ? null : item.k)}
            className="w-full flex flex-col items-center gap-[6px] cursor-pointer v3-focus"
            style={{
              background: isActive ? 'var(--ink)' : 'transparent',
              color: isActive ? 'var(--bg)' : 'var(--ink)',
              border: 'none',
              padding: '14px 8px',
              fontFamily: 'inherit',
            }}
            aria-pressed={isActive}
          >
            <span
              className="v3-tab-num"
              style={{
                fontSize: 22,
                fontWeight: 200,
                lineHeight: 1,
                color: isActive ? 'var(--accent)' : 'var(--ink)',
              }}
            >
              {n}
            </span>
            <span style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              {item.l}
            </span>
          </button>
        );
      })}
    </div>
  );
}
