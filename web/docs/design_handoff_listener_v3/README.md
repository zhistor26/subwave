# Handoff: SUB/WAVE listener page — V3 "Frequency" redesign

## Overview

Redesign of the SUB/WAVE listener page (`web/app/page.js` in the existing Next.js codebase) into a **single-screen, no-scroll** layout in the spirit of a modern skinned media player. Secondary panes (Up Next, Played, Booth Feed, Request) move into slide-in drawers triggered from a right-edge rail.

## About the design files

The HTML/JSX in `reference/` is a **design reference**, not production code. It runs standalone (open `preview.html`) so you can see the target visual and interaction precisely.

Recreate this design in the **existing Next.js codebase** (`web/`):
- React 19 + Next.js 15 (App Router, `'use client'` pages)
- Tailwind CSS 3 (`tailwind.config.js`)
- `lucide-react` for icons
- Components in `web/components/*.jsx`, pages in `web/app/*/page.js`

Keep the API integration, polling, and audio handling from the existing `web/app/page.js` (`/api/now-playing`, `/api/state`, `/api/request`, `/stream.mp3`, the `<audio>` element + Web Audio analyser wiring in `EQVisualizer.jsx`). **Replace only the listener-page presentation layer.**

## Fidelity

**High-fidelity.** Colors, type, spacing, and interaction timings below are final. Recreate pixel-faithfully using Tailwind utilities. Where Tailwind can't express something (e.g. the `oklch` accent), use arbitrary values (`bg-[oklch(0.62_0.22_25)]`) or extend `tailwind.config.js`.

---

## Layout (single screen, no body scroll)

```
┌───────────────────────────────────────────────────────────────┬─────────┐
│  SUB/WAVE   vol. 1 · transmission 0241    ● on air … 23:41:02 │         │
│  ─────────────────────────────────────────────────────────────│         │
│                                                                │   N     │
│                                                                │  Queue  │
│   NOW PLAYING — 1:11 / 2:34                                   │         │
│                                                                │   N     │
│   ████ ███ ██████                                              │  Played │
│   Tutti Frutti                                                │         │
│                                                                │   N     │
│   Little Richard · Here's Little Richard · 1957                │  Booth  │
│                                                                │         │
│      ░ ▒ ▓ █ █ ▓ ▒ ░ ░ ▒ ▓ █  (low-contrast waveform)         │   +     │
│                                                                │ Request │
│  ─────────────────────────────────────────────────────────────│         │
│  [● Tune Out] 1:11   Tutti Frutti · Little Richard   -1:23 ▓▓ │         │
└───────────────────────────────────────────────────────────────┴─────────┘
                                          ▲ drawer slides from here (460px)
```

### Regions

1. **Top bar** — full width. Left: `SUB/WAVE` wordmark + caption. Right: live dot, weather/period caption, monospace clock. 1px solid ink bottom border. Padding `24px 32px`.
2. **Center stage** — vertically centered, slight upward bias (`translateY(-58%)`). Eyebrow label, huge title (`clamp(64px, 10vw, 144px)`), artist + album line. Right margin reserves space for the dot rail.
3. **Waveform** — full width minus rail, positioned 100px from bottom, height 160px, opacity 0.18, low-contrast background visual. Bars under the elapsed cursor use the accent color; bars after, ink. Decorative only.
4. **Bottom transport bar** — full width. Big Tune In/Out button (ink fill, cream text, vermilion dot when live), a single-line progress with title/artist label centered + elapsed/remaining times, segmented volume meter. 1px solid ink top border, padding `20px 32px`.
5. **Right dot rail** — fixed 96px wide column on the right, from top bar to bottom bar. 1px solid ink left border. Stacks 4 buttons (Queue / Played / Booth / Request). Each shows a large count number above a tiny uppercase label.
6. **Drawer** — slides in from right rail, 460px wide, full height between top and bottom bars. Cream background, ink border left+right, light shadow. Animation: `transform translateX(40px)→0 + opacity 0→1`, **220ms** `cubic-bezier(.2,.7,.2,1)`. Backdrop is `rgba(0,0,0,0.05)`; clicking it dismisses.

### Responsive behavior

Designed for desktop (≥ 1024px). Below that:
- Stack the dot rail as a horizontal toolbar below the top bar.
- Drawer becomes a bottom sheet (full width, 70vh tall) sliding from the bottom.
- Title size auto-shrinks via the `clamp()`.

---

## Design tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#f3efe6` | Page background, drawer background |
| `--ink` | `#161412` | Primary text, borders, button fill |
| `--muted` | `#7a736a` | Secondary text, eyebrow labels, dim borders |
| `--accent` | `oklch(0.62 0.22 25)` (~`#d94b2a`) | Live dot, elapsed waveform, request CTA, "requested by" badge |
| Grain overlay | inline SVG turbulence at opacity 0.4, `mix-blend-mode: multiply` | Subtle paper texture across the whole page |

Type:
- Family: `"Helvetica Neue", Helvetica, Arial, sans-serif` (sans). Already loaded — system available.
- Title: `clamp(64px, 10vw, 144px)`, weight 800, `letter-spacing: -0.04em`, `line-height: 0.86`.
- Artist line: `clamp(20px, 2.4vw, 36px)`, weight 400, `letter-spacing: -0.01em`. Artist in ink, album/year in muted.
- Eyebrow / rail labels / chips: 10–11px, weight 700, `letter-spacing: 0.3em–0.4em`, `text-transform: uppercase`.
- Body in drawers: 12–14px.
- Tabular numerals (`font-variant-numeric: tabular-nums`) on all clock, time, count digits.

Spacing:
- Page padding: `24px 32px` (top bar), `20px 32px` (bottom bar), `28px` (drawer content).
- Rail buttons: full width × 14×8 px padding, gap 4.
- Drawer rows: vertical padding 10–14px, separated by `1px solid rgba(0,0,0,0.08–0.1)`.

Borders: always `1px solid ink` (or `rgba(0,0,0,0.08)` for soft inner separators). No border radius anywhere — sharp corners throughout.

No shadows except drawer: `-30px 0 60px -20px rgba(0,0,0,0.15)`.

---

## Components & content

Take `web/app/page.js`'s data flow as-is and recompose the presentation. Pull these subcomponents from `reference/v3-frequency.jsx`:

### `<TopBar />`
- Left cluster: `SUB/WAVE` (11px, 700, 0.4em uppercase) + caption "vol. 1 · transmission 0241" (10px, muted, 0.3em uppercase). The "transmission" number can be derived from `state.djLog.length` or just kept as a fixed string for now.
- Right cluster (10px, muted, 0.3em uppercase, gap 18px): live indicator (`●` accent + "on air" / dim "off air"), context line (`${city} · ${temp}°C · ${condition}`), clock (ink, weight 600, tabular-nums).

### `<CenterStage />`
- Eyebrow: `NOW PLAYING — ${fmtTime(elapsed)} / ${fmtTime(duration)}`.
- `<h1>` title: `nowPlaying.title`.
- Sub: `<span ink>${artist}</span> · ${album} · ${year}` (year only if present).
- If `nowPlaying` is null: title text becomes "scanning the dial" in muted with a 1ch underline blink.

### `<Waveform />`
- 120-bar fake spectrum that animates when `tunedIn` is true. In production, drive from the existing Web Audio analyser in `EQVisualizer.jsx`. The visual is decorative; it must not be the focus.
- Bars whose index/total < elapsed/duration use the accent color; others use ink. Whole layer at `opacity: 0.18`.

### `<TransportBar />`
- Tune In/Out button — replaces the existing Receiver button. Ink fill, cream text, 11px 0.4em uppercase, padding `14px 28px`. Leading 8px circle = accent if `tunedIn`, dim if not. Reuse the `tuneIn()` function from existing page.js verbatim.
- Inline progress: 1px muted line, 3px accent overlay sized by elapsed/duration. Above it, three-cell row: elapsed | "Title · Artist" | "−remaining" (all 10px, 0.3em uppercase, muted).
- Volume meter: 12 segmented cells (1px ink border, ink fill when lit). Invisible range input on top for interaction + a11y. Replaces `<VUMeter />`.

### `<DotRail />`
- 96px column, ink left border. 4 buttons stacked vertically:
  - Queue — count from `state.upcoming.length`
  - Played — count from `state.history.length`
  - Booth — count from `state.djLog.length`
  - Request — display `+` instead of a count
- Each button: 22px count (weight 200, accent when active) above a 9px uppercase label, padding `14px 8px`. Active state inverts: ink fill, cream text. Single-select — opening one closes others.

### `<Drawer />`
- Slides in 220ms cubic-bezier(.2,.7,.2,1), 460px wide. Header: 14px 0.4em uppercase title + 20px close `×`. Body scrolls if it overflows.
- Four bodies — see `V3Queue`, `V3History`, `V3Booth`, `V3Request` in the reference file. Notable details:
  - **Queue rows**: 28px weight-200 numeric index, 18px title, 12px artist, then a 9px 0.3em uppercase accent line "↳ requested by ${name}" if present.
  - **History rows**: 14px title, 11px muted artist, right-aligned "Nm ago" stamp.
  - **Booth rows**: speak-kinds (`dj-speak`, `station-id`) render the message in italic at 14px ink, label-tag colored accent; other kinds render the message at 12px muted, label-tag muted.
  - **Request body**: short prose, mood chips (ink border, transparent, 11px), 3-row textarea (1px ink border, transparent bg, 16px ink), full-width "Send to the booth" CTA in accent fill + white text + 11px 0.4em uppercase.

### Existing helpers to keep
- Polling tick (5s) in `useEffect` — unchanged.
- `tuneIn()`, `submitRequest()`, `audioRef` — unchanged.
- `relTime()` helper from existing page — reuse in History.

### Existing components to retire (their visuals are no longer used)
- `Vinyl.jsx` — vinyl illustration not used in V3.
- `VUMeter.jsx` — replaced by inline segmented bars.
- The amber/stone color tokens, cassette-grain backgrounds in `globals.css`.

You can keep `EQVisualizer.jsx` (or its analyser logic) — just render it as the low-contrast `<Waveform />` instead of its current bars.

---

## Interactions & behavior

- **Tune In / Out** — same as today. Use `audioRef`, `STREAM_URL`, the same play/pause logic from current page.js.
- **Volume** — drives `audioRef.current.volume` on change.
- **Dot rail click** — toggles drawer. Reclicking the same item closes it. Clicking another switches without closing.
- **Drawer dismiss** — backdrop click, `×` button, or `Escape` keypress.
- **Drawer transition** — 220ms slide+fade in. No exit animation (instant close is fine).
- **Request submit** — `Enter` in textarea sends. Reuse the existing `/api/request` POST and the `submitMessage` toast. Render the toast inline at the bottom of the Request drawer, ink border, accent text on `ok`, muted on `miss`, red on `err`.
- **Polling** — leave at 5s `setInterval` like today. If a request returns success, optimistically reflect the queued track at the top of the Queue drawer (current page already does this implicitly via the next poll).
- **Mood chips** — click sets the textarea value.
- **`prefers-reduced-motion`** — collapse the 220ms drawer slide to an instant open/close; keep the waveform animation off when reduced-motion is set (already wired in current `globals.css`).

---

## State

Mirror current page state — nothing new except `drawer`:

```js
const [tunedIn, setTunedIn] = useState(false);
const [volume, setVolume] = useState(0.8);
const [nowPlaying, setNowPlaying] = useState(null);
const [context, setContext] = useState(null);
const [state, setState] = useState({ upcoming: [], history: [], djLog: [] });
const [requestText, setRequestText] = useState('');
const [requesterName, setRequesterName] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitMessage, setSubmitMessage] = useState(null);
const [drawer, setDrawer] = useState(null); // 'queue' | 'history' | 'booth' | 'request' | null
```

---

## What's intentionally out of scope here

- `/settings` and `/debug` pages — those should be restyled separately. (Recommendation: keep `/debug` as its own scrollable route in V3 vocabulary; consider `/settings` as a full-screen overlay launched from a gear icon in the top bar.)
- Mobile drawer (< 1024px) — bottom-sheet pattern noted above; implement when the desktop view is locked.
- Real audio analyser drive of the waveform — keep `useSpectrum` mock or wire the existing analyser from `EQVisualizer.jsx`.

---

## Files in this bundle

- `preview.html` — open in any browser to see the design running standalone.
- `reference/v3-frequency.jsx` — the source of the design. Functions: `V3Frequency`, `V3Queue`, `V3History`, `V3Booth`, `V3Request`.
- `reference/shared.jsx` — mock data + small hooks (`useSpectrum`, `useElapsed`, `useClock`, `fmtTime`). The hooks are useful as-is; the mock data arrays show the exact data shape consumed (matches the existing `/api/now-playing` and `/api/state` responses).

## Suggested order of work

1. Strip the amber theme from `globals.css`; add the cream/ink/accent tokens + paper grain.
2. Rewrite `web/app/page.js` shell to the new region layout (top bar / stage / waveform / transport / rail).
3. Build `<Drawer />` as a shared component with the slide animation and Escape handler.
4. Port the four drawer bodies from `V3Queue` / `V3History` / `V3Booth` / `V3Request`.
5. Wire `tunedIn`, volume, request submit — copy verbatim from the existing page.
6. Delete `Vinyl.jsx` and `VUMeter.jsx`. Re-skin or remove `EQVisualizer.jsx` depending on whether you want a real analyser-driven waveform.
7. QA the polling + request-success flow; confirm 5s tick still updates `nowPlaying`, `state`, `context` cleanly.
