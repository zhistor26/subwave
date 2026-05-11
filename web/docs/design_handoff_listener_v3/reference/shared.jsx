/* Shared mock data + tiny helpers for all 4 SUB/WAVE variations. */

const MOCK_NOW = {
  title: 'Tutti Frutti',
  artist: 'Little Richard',
  album: "Here's Little Richard",
  year: 1957,
  durationSec: 154,
  elapsedSec: 71,
};

const MOCK_UPCOMING = [
  { title: 'Brown Eyed Girl', artist: 'Van Morrison', requestedBy: 'kavi' },
  { title: 'Mr. Tambourine Man', artist: 'The Byrds' },
  { title: 'Sunday Morning', artist: 'The Velvet Underground' },
  { title: 'Tere Bin Nahin Laage Jiya', artist: 'Sidhu Moose Wala', requestedBy: 'anon' },
  { title: 'Wichita Lineman', artist: 'Glen Campbell' },
];

const MOCK_HISTORY = [
  { title: 'A Day in the Life', artist: 'The Beatles', t: '2m' },
  { title: 'Riders on the Storm', artist: 'The Doors', t: '7m' },
  { title: 'God Only Knows', artist: 'The Beach Boys', t: '11m' },
  { title: 'Heroes', artist: 'David Bowie', t: '15m' },
  { title: 'Five Years', artist: 'David Bowie', t: '19m' },
  { title: 'Dreams', artist: 'Fleetwood Mac', t: '24m' },
  { title: 'Hounds of Love', artist: 'Kate Bush', t: '29m' },
];

const MOCK_BOOTH = [
  { kind: 'dj-speak', t: '23:41:02', msg: 'Late-night vibes from the homelab. This one\u2019s for the cooling fans.' },
  { kind: 'queued', t: '23:40:38', msg: 'Queued: Brown Eyed Girl \u2014 Van Morrison' },
  { kind: 'request', t: '23:39:47', msg: 'incoming: \u201cmore sidhu\u201d \u2014 matched.' },
  { kind: 'playing', t: '23:38:52', msg: 'Now: Tutti Frutti \u2014 Little Richard' },
  { kind: 'station-id', t: '23:30:00', msg: 'You\u2019re on SUB/WAVE \u2014 98.7 from the basement.' },
  { kind: 'weather', t: '23:25:14', msg: 'Toronto: 14\u00b0C, rain steady. Perfect headphones weather.' },
  { kind: 'dj-speak', t: '23:20:01', msg: 'Spinning oldies because the model says so. Don\u2019t @ me.' },
  { kind: 'hourly-check', t: '23:00:00', msg: 'Top of the hour. Listeners: 1. (you.)' },
];

const MOCK_CTX = {
  temp: 14,
  condition: 'rainy',
  period: 'late-night',
  city: 'Toronto',
  festival: null,
};

const MOOD_CHIPS = [
  'late-night driving',
  'more like this',
  'something punjabi',
  'surprise me',
  'rainy day',
];

// Generate a pseudo-random spectrum that mutates each tick, in [0..1].
function useSpectrum(bins, active, speed = 80) {
  const [arr, setArr] = React.useState(() => Array(bins).fill(0.1));
  React.useEffect(() => {
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

// Faux elapsed time that advances when tunedIn is true.
function useElapsed(startSec, durationSec, active) {
  const [s, setS] = React.useState(startSec);
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setS(x => (x + 1) % durationSec), 1000);
    return () => clearInterval(id);
  }, [active, durationSec]);
  return s;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function useClock() {
  const [t, setT] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

Object.assign(window, {
  MOCK_NOW, MOCK_UPCOMING, MOCK_HISTORY, MOCK_BOOTH, MOCK_CTX, MOOD_CHIPS,
  useSpectrum, useElapsed, useClock, fmtTime,
});
