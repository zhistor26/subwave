/* V3 / FREQUENCY — minimal big-type. Huge artist/title centered on a
   full-bleed live waveform. Dot rail at right reveals slide-in drawers. */

function V3Frequency() {
  const [tunedIn, setTunedIn] = React.useState(true);
  const [vol, setVol] = React.useState(0.62);
  const [drawer, setDrawer] = React.useState(null); // 'queue'|'history'|'booth'|'request'
  const [reqText, setReqText] = React.useState('');
  const elapsed = useElapsed(MOCK_NOW.elapsedSec, MOCK_NOW.durationSec, tunedIn);
  const spec = useSpectrum(120, tunedIn, 60);
  const clock = useClock();

  // newsprint cream background, hot accent in oklch
  const bg = '#f3efe6';
  const ink = '#161412';
  const muted = '#7a736a';
  const accent = 'oklch(0.62 0.22 25)'; // hot vermilion

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: bg, color: ink,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      overflow: 'hidden',
    }}>
      {/* paper grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4, mixBlendMode: 'multiply',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0.4 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        pointerEvents: 'none',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '24px 32px',
        borderBottom: `1px solid ${ink}`,
        zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 700 }}>SUB/WAVE</span>
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: muted, textTransform: 'uppercase' }}>vol. 1 · transmission 0241</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, fontSize: 10, letterSpacing: '0.3em', color: muted, textTransform: 'uppercase' }}>
          <span><span style={{ color: accent }}>●</span> on air</span>
          <span>{MOCK_CTX.city} · {MOCK_CTX.temp}°C · {MOCK_CTX.condition}</span>
          <span style={{ color: ink, fontWeight: 600 }}>{clock.toLocaleTimeString('en-GB', { hour12: false })}</span>
        </div>
      </div>

      {/* Center stage — huge typography */}
      <div style={{
        position: 'absolute', top: '50%', left: 32, right: 96,
        transform: 'translateY(-58%)',
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', color: muted, marginBottom: 14 }}>
          Now playing — {fmtTime(elapsed)} / {fmtTime(MOCK_NOW.durationSec)}
        </div>
        <h1 style={{
          fontSize: 'clamp(64px, 10vw, 144px)',
          lineHeight: 0.86, letterSpacing: '-0.04em',
          fontWeight: 800,
          margin: 0,
          textWrap: 'balance',
        }}>
          {MOCK_NOW.title}
        </h1>
        <div style={{
          fontSize: 'clamp(20px, 2.4vw, 36px)',
          marginTop: 18, color: muted, letterSpacing: '-0.01em',
        }}>
          <span style={{ color: ink }}>{MOCK_NOW.artist}</span>
          <span style={{ marginLeft: 14, color: muted }}>· {MOCK_NOW.album} · {MOCK_NOW.year}</span>
        </div>
      </div>

      {/* Waveform behind, low contrast */}
      <div style={{
        position: 'absolute', left: 0, right: 96, bottom: 100, height: 160,
        display: 'flex', alignItems: 'center', gap: 2, padding: '0 32px',
        opacity: 0.18, pointerEvents: 'none',
      }}>
        {spec.map((v, i) => (
          <span key={i} style={{
            flex: 1, height: `${10 + Math.pow(v, 0.7) * 95}%`,
            background: i / spec.length < elapsed / MOCK_NOW.durationSec ? accent : ink,
          }} />
        ))}
      </div>

      {/* Bottom transport row */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 32px',
        borderTop: `1px solid ${ink}`,
        display: 'flex', alignItems: 'center', gap: 24,
        background: bg,
        zIndex: 2,
      }}>
        <button onClick={() => setTunedIn(t => !t)} style={{
          background: ink, color: bg, border: 'none',
          padding: '14px 28px',
          fontSize: 11, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: tunedIn ? accent : '#5a5048' }} />
          {tunedIn ? 'Tune Out' : 'Tune In'}
        </button>

        {/* Inline progress */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: muted }}>
            <span>{fmtTime(elapsed)}</span>
            <span>{MOCK_NOW.title} · {MOCK_NOW.artist}</span>
            <span>−{fmtTime(MOCK_NOW.durationSec - elapsed)}</span>
          </div>
          <div style={{ height: 1, background: muted, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, height: 3, top: -1, width: `${(elapsed / MOCK_NOW.durationSec) * 100}%`, background: accent }} />
          </div>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: muted }}>Vol</span>
          <div style={{ width: 80, height: 18, position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{
                flex: 1, height: '100%',
                background: i < Math.round(vol * 12) ? ink : 'transparent',
                border: '1px solid ' + ink,
              }} />
            ))}
            <input type="range" min={0} max={1} step={0.01} value={vol}
              onChange={e => setVol(parseFloat(e.target.value))}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Right-edge dot rail */}
      <div style={{
        position: 'absolute', top: 80, right: 0, bottom: 80, width: 96,
        borderLeft: `1px solid ${ink}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4,
        zIndex: 2,
      }}>
        {[
          { k: 'queue', l: 'Queue', n: MOCK_UPCOMING.length },
          { k: 'history', l: 'Played', n: MOCK_HISTORY.length },
          { k: 'booth', l: 'Booth', n: MOCK_BOOTH.length },
          { k: 'request', l: 'Request', n: '+' },
        ].map(item => (
          <button key={item.k} onClick={() => setDrawer(d => d === item.k ? null : item.k)} style={{
            background: drawer === item.k ? ink : 'transparent',
            color: drawer === item.k ? bg : ink,
            border: 'none',
            padding: '14px 8px',
            width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            <span style={{
              fontSize: 22, fontWeight: 200, lineHeight: 1,
              color: drawer === item.k ? accent : ink,
            }}>{item.n}</span>
            <span style={{
              fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase',
              writingMode: 'horizontal-tb',
            }}>{item.l}</span>
          </button>
        ))}
      </div>

      {/* Slide-in drawer */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.05)', zIndex: 5,
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 96, bottom: 0, width: 460,
            background: bg, borderLeft: `1px solid ${ink}`, borderRight: `1px solid ${ink}`,
            boxShadow: '-30px 0 60px -20px rgba(0,0,0,0.15)',
            padding: 28, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            zIndex: 6,
            animation: 'v3-slide 220ms cubic-bezier(.2,.7,.2,1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 14, letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 700 }}>
                {drawer === 'queue' && 'Up next'}
                {drawer === 'history' && 'Played'}
                {drawer === 'booth' && 'Booth feed'}
                {drawer === 'request' && 'Make a request'}
              </h2>
              <span onClick={() => setDrawer(null)} style={{ cursor: 'pointer', fontSize: 20 }}>×</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {drawer === 'queue' && <V3Queue ink={ink} accent={accent} muted={muted} />}
              {drawer === 'history' && <V3History ink={ink} muted={muted} />}
              {drawer === 'booth' && <V3Booth ink={ink} accent={accent} muted={muted} />}
              {drawer === 'request' && <V3Request ink={ink} accent={accent} muted={muted} reqText={reqText} setReqText={setReqText} />}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes v3-slide {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function V3Queue({ ink, accent, muted }) {
  return (
    <div>
      {MOCK_UPCOMING.map((t, i) => (
        <div key={i} style={{
          padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.1)',
          display: 'flex', gap: 14, alignItems: 'baseline',
        }}>
          <span style={{ fontSize: 28, fontWeight: 200, color: muted, width: 36, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{t.artist}</div>
            {t.requestedBy && (
              <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, marginTop: 4 }}>
                ↳ requested by {t.requestedBy}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function V3History({ ink, muted }) {
  return (
    <div>
      {MOCK_HISTORY.map((t, i) => (
        <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, color: ink }}>{t.title}</div>
            <div style={{ fontSize: 11, color: muted }}>{t.artist}</div>
          </div>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: muted, textTransform: 'uppercase' }}>{t.t} ago</span>
        </div>
      ))}
    </div>
  );
}

function V3Booth({ ink, accent, muted }) {
  return (
    <div>
      {MOCK_BOOTH.map((e, i) => {
        const isSpeak = e.kind === 'dj-speak' || e.kind === 'station-id';
        return (
          <div key={i} style={{
            padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', gap: 10,
          }}>
            <span style={{ fontSize: 10, color: muted, width: 56, fontVariantNumeric: 'tabular-nums' }}>{e.t}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: isSpeak ? accent : muted, marginBottom: 2 }}>{e.kind}</div>
              <div style={{ fontSize: isSpeak ? 14 : 12, color: isSpeak ? ink : muted, fontStyle: isSpeak ? 'italic' : 'normal', lineHeight: 1.4 }}>
                {isSpeak ? `"${e.msg}"` : e.msg}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function V3Request({ ink, accent, muted, reqText, setReqText }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: muted, lineHeight: 1.5, marginTop: 0 }}>
        Describe a mood, a memory, an artist. Ollama parses it, matches the library, and the DJ acknowledges you on-air.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '18px 0' }}>
        {MOOD_CHIPS.map(m => (
          <button key={m} onClick={() => setReqText(m)} style={{
            background: 'transparent', border: `1px solid ${ink}`, color: ink,
            padding: '6px 12px', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{m}</button>
        ))}
      </div>
      <textarea value={reqText} onChange={e => setReqText(e.target.value)}
        placeholder='"something for late-night driving"…'
        rows={3}
        style={{
          width: '100%', resize: 'none', boxSizing: 'border-box',
          border: `1px solid ${ink}`, background: 'transparent',
          padding: 14, fontSize: 16, fontFamily: 'inherit', color: ink, outline: 'none',
        }} />
      <button style={{
        background: accent, color: '#fff', border: 'none',
        padding: '14px 24px', marginTop: 12,
        fontSize: 11, letterSpacing: '0.4em', fontWeight: 700, textTransform: 'uppercase',
        cursor: 'pointer', width: '100%',
      }}>Send to the booth</button>
    </div>
  );
}

window.V3Frequency = V3Frequency;
