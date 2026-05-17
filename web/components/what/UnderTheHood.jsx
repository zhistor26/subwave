import { Fragment } from 'react';

const BOXES = [
  { label: 'CONTROLLER', tone: 'default', note: 'node.js' },
  { label: 'DJ BRAIN', tone: 'accent', note: 'llm' },
  { label: 'LIQUIDSOAP', tone: 'default', note: 'mixer' },
  { label: 'ICECAST', tone: 'default', note: 'one stream' },
];

export default function UnderTheHood() {
  return (
    <section className="bs-section">
      <p className="bs-eyebrow">PART FIVE · UNDER THE HOOD</p>
      <h2>Four processes, one box, one stream out.</h2>

      <div
        className="bs-drop-cap"
        style={{ fontSize: 15, lineHeight: 1.6, maxWidth: '64ch' }}
      >
        SUB/WAVE is not a cloud service. The whole stack — Icecast, Liquidsoap,
        the Controller, the LLM, the voice engines, and a Caddy edge — runs on a
        single machine in someone’s home, behind Cloudflare. The Controller is a
        small Node.js process that decides what plays and what gets said.
        Liquidsoap mixes the music, crossfades the tracks, ducks the DJ’s voice
        over the bed, and rotates the jingles. Icecast pushes the one stream out
        to every browser. The pieces talk through plain files in a shared folder
        — no socket, no message queue, the Unix way.
      </div>

      <div className="bs-flow">
        {BOXES.map((b, i) => (
          <Fragment key={b.label}>
            <div
              className="bs-box"
              data-tone={b.tone === 'accent' ? 'accent' : undefined}
            >
              {b.label}
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  color: 'var(--muted)',
                  marginTop: 4,
                  fontWeight: 500,
                  textTransform: 'lowercase',
                }}
              >
                {b.note}
              </div>
            </div>
            {i < BOXES.length - 1 && <div className="bs-arrow">⟶</div>}
          </Fragment>
        ))}
      </div>

      <p
        style={{
          marginTop: 24,
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--muted)',
          maxWidth: '64ch',
        }}
      >
        No subscriptions, no round-trip to a data center, no algorithm tuned to
        keep you scrolling. The whole source is open — so you can run your own
        with a different DJ persona, a different library, and a different city
        on the dateline.
      </p>

      <div style={{ marginTop: 32 }}>
        <div
          className="bs-dj-glyph"
          aria-hidden="true"
          style={{
            float: 'right',
            width: 190,
            margin: '2px 0 8px 14px',
          }}
        >
          <div className="bs-dj-vinyl" />
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Streaming apps gave everyone their own private channel. A playlist tuned
          to you, shuffled for you, paused the second you look away. SUB/WAVE goes
          the other direction entirely. It is one Icecast stream — a single
          broadcast every listener hears at the same moment — picked, announced,
          and mixed by software running on a single box in someone&apos;s home.
          There is no skip button. There is no &ldquo;for you.&rdquo; You tune in,
          and you hear whatever is on the air right now, the same as everyone else.
        </p>
      </div>
    </section>
  );
}
