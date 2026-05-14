// LLM-as-DJ. When the auto-DJ needs the next track, we don't pick at random —
// we hand a candidate pool + recent-play context to Ollama and ask which track
// should play next. Designed to be cheap (one call per track, ~3-5 min apart)
// and gracefully degrade if the model is slow or wrong.
//
// Candidate sources, in priority order:
//   1. getSimilarSongs2 seeded by the current track (Last.fm adjacency)
//   2. Mood-tagged library (LLM tagger output)
//   3. Navidrome playlists whose name matches the current mood
//   4. Recently-added albums ("new in the crates")
//   5. Frequent albums (scrobble-backed favourites)
//   6. Similar-artist top songs
//   7. Starred + random — final fallback

import * as subsonic from './subsonic.js';
import * as library from './library.js';
import * as ollama from './ollama.js';
import { getFullContext } from './context.js';

const CANDIDATE_CAP = 18;
const HISTORY_DEPTH = 8;

// Per-source caps so the LLM sees a balanced mix rather than 15 similar songs.
const CAP_SIMILAR = 8;
const CAP_MOOD_LIBRARY = 10;
const CAP_PLAYLIST = 6;
const CAP_RECENT = 4;
const CAP_FREQUENT = 4;
const CAP_SIMILAR_ARTIST = 4;

// TTL cache for sources that don't change between picks. Without this, every
// pick would re-fetch playlists, recent/frequent album lists and re-walk their
// tracks — turning ~1 Navidrome call per pick into ~15.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();
async function memo(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.val;
  const val = await fn();
  cache.set(key, { val, at: Date.now() });
  return val;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function notRecent(recentIds) {
  return (t) => t && t.id && !recentIds.has(t.id);
}

// Walk a list of albums and return up to `perAlbum` tracks from each, capped.
async function tracksFromAlbums(albums, perAlbum, max) {
  const out = [];
  for (const a of albums) {
    if (out.length >= max) break;
    try {
      const songs = await subsonic.getAlbum(a.id);
      out.push(...shuffle(songs).slice(0, perAlbum));
    } catch {}
  }
  return out;
}

async function buildCandidates(mood, recentIds, currentTrack) {
  await library.load();
  const pool = [];
  const sources = {};
  const add = (label, items) => {
    if (!items?.length) return;
    pool.push(...items.map(t => ({ ...t, _source: label })));
    sources[label] = (sources[label] || 0) + items.length;
  };

  // 1. Similar-songs from current track — strongest contextual signal.
  if (currentTrack?.id) {
    try {
      const similar = await subsonic.getSimilarSongs(currentTrack.id, { count: 20 });
      add('similar', similar.filter(notRecent(recentIds)).slice(0, CAP_SIMILAR));
    } catch {}
  }

  // 2. Mood-tagged library (LLM-built tags, may be sparse).
  if (mood) {
    const moodHits = shuffle(library.songsByMood(mood).filter(notRecent(recentIds)));
    add('mood-library', moodHits.slice(0, CAP_MOOD_LIBRARY));
  }

  // 3. Mood-matched Navidrome playlists — operator's hand curation.
  if (mood) {
    try {
      const playlists = await memo('playlists', CACHE_TTL_MS, () => subsonic.getPlaylists());
      const matched = playlists.filter(p =>
        p.name?.toLowerCase().includes(mood.toLowerCase())
      );
      const plTracks = [];
      for (const pl of matched.slice(0, 2)) {
        try {
          const songs = await memo(`playlist:${pl.id}`, CACHE_TTL_MS, () => subsonic.getPlaylist(pl.id));
          plTracks.push(...songs);
        } catch {}
      }
      add('playlist', shuffle(plTracks.filter(notRecent(recentIds))).slice(0, CAP_PLAYLIST));
    } catch {}
  }

  // 4. Recently-added albums — "new in the crates".
  try {
    const recentTracks = await memo('recent-tracks', CACHE_TTL_MS, async () => {
      const albums = await subsonic.getRecentlyAddedAlbums({ size: 10 });
      return tracksFromAlbums(shuffle(albums).slice(0, 5), 2, 12);
    });
    add('recent', recentTracks.filter(notRecent(recentIds)).slice(0, CAP_RECENT));
  } catch {}

  // 5. Frequent albums — scrobble-backed favourites.
  try {
    const freqTracks = await memo('frequent-tracks', CACHE_TTL_MS, async () => {
      const albums = await subsonic.getFrequentAlbums({ size: 10 });
      return tracksFromAlbums(shuffle(albums).slice(0, 5), 2, 12);
    });
    add('frequent', freqTracks.filter(notRecent(recentIds)).slice(0, CAP_FREQUENT));
  } catch {}

  // 6. Similar-artist top songs — adjacency through Last.fm artist graph.
  if (currentTrack?.artist) {
    try {
      const similarArtistTracks = await memo(`similar-artist:${currentTrack.artist}`, CACHE_TTL_MS, async () => {
        const matches = await subsonic.searchArtists(currentTrack.artist, { artistCount: 1 });
        if (matches.length === 0) return [];
        const info = await subsonic.getArtistInfo(matches[0].id, { count: 5 });
        const similars = (info?.similarArtist || []).slice(0, 2);
        const collected = [];
        for (const sa of similars) {
          try {
            const top = await subsonic.getTopSongs(sa.name, { count: 5 });
            collected.push(...top);
          } catch {}
        }
        return collected;
      });
      add('similar-artist', similarArtistTracks.filter(notRecent(recentIds)).slice(0, CAP_SIMILAR_ARTIST));
    } catch {}
  }

  // 7. Fallback if the pool is still thin — starred + random.
  if (pool.length < 8) {
    try {
      const starred = (await subsonic.getStarred()).filter(notRecent(recentIds));
      add('starred', shuffle(starred).slice(0, 4));
    } catch {}
    try {
      const random = (await subsonic.getRandomSongs({ size: 10 })).filter(notRecent(recentIds));
      add('random', random.slice(0, 4));
    } catch {}
  }

  // De-dup, shuffle, cap.
  const seen = new Set();
  const final = shuffle(pool).filter(t => {
    if (!t.id || seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  }).slice(0, CANDIDATE_CAP);

  return { candidates: final, sources };
}

function summariseRecent(queue) {
  const items = [];
  if (queue.current) items.push(queue.current);
  items.push(...queue.history.slice(0, HISTORY_DEPTH));
  return items.filter(i => i?.track?.title).map(i => {
    const tags = i.track.id ? library.get(i.track.id) : null;
    return {
      title: i.track.title,
      artist: i.track.artist,
      moods: tags?.moods || [],
      energy: tags?.energy || null,
    };
  });
}

// Main entry. Returns the picked song object (with id+metadata) or null if
// no pick could be made.
export async function pickNext(queue) {
  const ctx = await getFullContext();
  const recentIds = queue.recentlyPlayedIds(25);
  const currentTrack = queue.current?.track || null;
  const { candidates, sources } = await buildCandidates(ctx.dominantMood, recentIds, currentTrack);

  if (candidates.length === 0) {
    queue.log('picker', 'no candidates available, skipping LLM pick');
    return null;
  }

  queue.log('picker', `pool ${candidates.length} (${
    Object.entries(sources).map(([k, v]) => `${k}=${v}`).join(' ')
  })`);

  const recentPlays = summariseRecent(queue);

  let pickRaw;
  try {
    pickRaw = await ollama.pickNextTrack({
      candidates: candidates.map(c => ({
        id: c.id,
        title: c.title,
        artist: c.artist,
        moods: c.moods || [],
        energy: c.energy || null,
      })),
      recentPlays,
      context: ctx,
    });
  } catch (err) {
    queue.log('error', `picker LLM failed: ${err.message}`);
    return null;
  }

  const chosen = candidates.find(c => c.id === pickRaw?.id);
  if (!chosen) {
    queue.log('error', `picker returned unknown id ${pickRaw?.id}; falling back to first candidate`);
    return { song: candidates[0], reason: 'fallback (LLM returned invalid id)' };
  }

  return { song: chosen, reason: pickRaw.reason || null, source: chosen._source };
}

// Pick + enqueue. Fire-and-forget from the watcher.
export async function pickAndEnqueue(queue) {
  const result = await pickNext(queue);
  if (!result) return;
  const { song, reason, source } = result;
  queue.log('ai-pick', `${song.title} — ${song.artist}`, { reason, source });
  await queue.push({
    track: {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      year: song.year,
      genre: song.genre,
    },
    requestedBy: null,
    intent: reason || 'ai pick',
    introScript: null,        // no spoken intro for auto-picks (keeps the flow musical)
    aiPicked: true,
  });
}
