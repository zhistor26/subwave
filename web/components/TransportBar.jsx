'use client';

import BroadcastTicker from './BroadcastTicker';

export default function TransportBar({
  tunedIn,
  onTune,
  offline = false,
  volume,
  setVolume,
  nowPlaying,
  elapsed,
  djLog,
  tickerOn,
}) {
  const duration = nowPlaying?.duration ?? 0;
  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const cells = 12;
  const lit = Math.round(volume * cells);

  const showTicker = tickerOn && djLog?.length > 0;
  const songLine = nowPlaying?.title
    ? `${nowPlaying.title}${nowPlaying.artist ? ' · ' + nowPlaying.artist : ''}`
    : null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 [border-top:none] sm:[border-top:1px_solid_var(--ink)]"
      style={{ background: 'var(--bg)' }}
    >
      {/* Hairline progress along the top edge of the bar. */}
      {duration > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: 0,
            height: 2,
            width: `${progress * 100}%`,
            background: 'var(--accent)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile-only ticker row above the controls. Marquee gets its own
          full-width strip so it never collides with the Tune Out button.
          On sm: and up the ticker renders inline in the controls row below. */}
      {showTicker && (
        <div className="sm:hidden flex items-center px-2 py-0">
          <BroadcastTicker items={djLog} enabled={true} />
        </div>
      )}

      <div
        // Bottom inset keeps the Tune In / volume row clear of the iPhone
        // home indicator when installed (viewport-fit=cover). Side insets
        // matter for landscape on notched phones; top stays fixed so the
        // hairline progress bar above this row sits flush.
        className="flex items-center gap-3 sm:gap-6
          pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]
          pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]
          sm:pt-5 sm:pb-[calc(env(safe-area-inset-bottom)_+_1.25rem)]
          sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]"
      >
        <button
          onClick={offline ? undefined : onTune}
          disabled={offline}
          aria-disabled={offline}
          title={offline ? 'The station is currently off air' : undefined}
          className={`v3-eyebrow v3-focus flex items-center gap-[10px] shrink-0 px-4 py-3 sm:px-7 sm:py-[14px] ${offline ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            background: offline ? 'var(--bg)' : 'var(--ink)',
            color: offline ? 'var(--muted)' : 'var(--bg)',
            border: offline ? '1px solid var(--muted)' : 'none',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: offline ? 'var(--muted)' : tunedIn ? 'var(--accent)' : '#5a5048',
              display: 'inline-block',
            }}
          />
          {offline ? 'Stream Offline' : tunedIn ? 'Tune Out' : 'Tune In'}
        </button>

        {/* Desktop ticker (mobile gets it as the strip above). Otherwise the
            song line takes the centre slot on both. */}
        {showTicker && (
          <div className="hidden sm:flex flex-1 min-w-0">
            <BroadcastTicker items={djLog} enabled={true} />
          </div>
        )}
        <div
          className={`flex-1 min-w-0 v3-caption truncate items-center ${showTicker ? 'flex sm:hidden' : 'flex'}`}
          style={{ color: 'var(--muted)' }}
          title={songLine ?? ''}
        >
          {songLine && (
            <>
              <span style={{ color: 'var(--ink)' }}>{nowPlaying.title}</span>
              {nowPlaying.artist && <span>&nbsp;·&nbsp;{nowPlaying.artist}</span>}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-[10px] shrink-0">
          <span className="hidden sm:inline v3-caption" style={{ color: 'var(--muted)' }}>Vol</span>
          <div
            className="relative flex items-center w-[52px] sm:w-[80px]"
            style={{ height: 18, gap: 2 }}
          >
            {Array.from({ length: cells }).map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: '100%',
                  background: i < lit ? 'var(--ink)' : 'transparent',
                  border: '1px solid var(--ink)',
                }}
              />
            ))}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
