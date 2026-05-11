'use client';

function shortTime(t) {
  try {
    return new Date(t).toLocaleTimeString('en-GB', { hour12: false });
  } catch {
    return String(t || '');
  }
}

export default function BoothDrawer({ items }) {
  if (!items?.length) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
        Booth is quiet.
      </div>
    );
  }
  return (
    <div>
      {items.map((e, i) => {
        const isSpeak = e.kind === 'dj-speak' || e.kind === 'station-id';
        return (
          <div
            key={i}
            className="flex gap-[10px]"
            style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
          >
            <span
              className="v3-tab-num"
              style={{ fontSize: 10, color: 'var(--muted)', width: 56 }}
            >
              {shortTime(e.t)}
            </span>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: isSpeak ? 'var(--accent)' : 'var(--muted)',
                  marginBottom: 2,
                }}
              >
                {e.kind}
              </div>
              <div
                style={{
                  fontSize: isSpeak ? 14 : 12,
                  color: isSpeak ? 'var(--ink)' : 'var(--muted)',
                  fontStyle: isSpeak ? 'italic' : 'normal',
                  lineHeight: 1.4,
                }}
              >
                {isSpeak ? `"${e.msg}"` : e.msg}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
