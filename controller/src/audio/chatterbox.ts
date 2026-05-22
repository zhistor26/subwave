// Chatterbox TTS client — supervises a persistent Python worker over stdio.
//
// chatterbox_worker.py loads the Chatterbox Turbo model once (5-15s) and stays
// resident, reading one JSON request per line and emitting one JSON response
// per line. We manage the lifecycle here: lazy spawn on first speak(),
// auto-restart on crash, and a small request map keyed by random id.
//
// Same shape as kokoro.ts — the dispatcher in tts.ts treats both engines
// identically. The added wrinkle is per-request `referenceWav`: Chatterbox
// supports zero-shot voice cloning from a 5-second reference clip, so each
// call can swap voices without restarting the worker.

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const READY_TIMEOUT_MS = 120_000;        // first call may include model + weights load
// Chatterbox is heavier than Kokoro — 350M params vs ~80M — and on CPU a single
// sentence can take 1-3s. On GPU it's ~75ms. The 180s ceiling matches Kokoro's
// for symmetry; CHATTERBOX_REQUEST_TIMEOUT_MS overrides for tighter ops.
const REQUEST_TIMEOUT_MS = parseInt(process.env.CHATTERBOX_REQUEST_TIMEOUT_MS || '180000', 10);

type PendingRequest = {
  resolve: (msg: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

let worker: ChatterboxWorker | null = null;
let bootingPromise: Promise<ChatterboxWorker> | null = null;

class ChatterboxWorker {
  proc: ChildProcessWithoutNullStreams | null = null;
  ready = false;
  readyResolve: (() => void) | null = null;
  readyReject: ((err: Error) => void) | null = null;
  readyPromise: Promise<void>;
  readyTimer: NodeJS.Timeout | null = null;
  requests = new Map<string, PendingRequest>();
  buffer = '';
  fatalError: Error | null = null;

  constructor() {
    this.readyPromise = new Promise<void>((res, rej) => {
      this.readyResolve = res;
      this.readyReject = rej;
    });
  }

  start() {
    this.proc = spawn(config.chatterbox.python, [config.chatterbox.workerScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CHATTERBOX_DEVICE: config.chatterbox.device,
        CHATTERBOX_REFERENCE_WAV: config.chatterbox.referenceWav,
      },
    });

    this.readyTimer = setTimeout(() => {
      this.failReady(new Error('chatterbox worker ready timeout'));
    }, READY_TIMEOUT_MS);

    this.proc.stdout.on('data', (chunk: Buffer) => this.onStdout(chunk));
    this.proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trimEnd();
      if (text) console.error(`[chatterbox] ${text}`);
    });
    this.proc.on('exit', (code, signal) => this.onExit(code, signal));
  }

  onStdout(chunk: Buffer) {
    this.buffer += chunk.toString('utf8');
    let nl;
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      let msg: any;
      try { msg = JSON.parse(line); }
      catch { console.error('[chatterbox] bad json from worker:', line); continue; }
      this.handleMessage(msg);
    }
  }

  handleMessage(msg: any) {
    if (msg.ready) {
      this.ready = true;
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyResolve?.();
      return;
    }
    if (msg.fatal) {
      this.fatalError = new Error(msg.error || 'chatterbox worker fatal');
      this.failReady(this.fatalError);
      return;
    }
    const pending = this.requests.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.requests.delete(msg.id);
    if (msg.ok) pending.resolve(msg);
    else pending.reject(new Error(msg.error || 'chatterbox request failed'));
  }

  failReady(err: Error) {
    if (this.ready) return;
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.readyReject?.(err);
  }

  onExit(code: number | null, signal: NodeJS.Signals | null) {
    console.error(`[chatterbox] worker exited code=${code} signal=${signal}`);
    const err = this.fatalError || new Error(`chatterbox worker exited (${code ?? signal})`);
    for (const { reject, timer } of this.requests.values()) {
      clearTimeout(timer);
      reject(err);
    }
    this.requests.clear();
    this.failReady(err);
    if (worker === this) worker = null;
  }

  send(id: string, payload: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requests.delete(id);
        reject(new Error(`chatterbox request ${id} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.requests.set(id, { resolve, reject, timer });
      this.proc?.stdin.write(JSON.stringify({ id, ...payload }) + '\n');
    });
  }
}

async function ensureWorker(): Promise<ChatterboxWorker> {
  if (worker && worker.ready) return worker;
  if (bootingPromise) return bootingPromise;
  bootingPromise = (async () => {
    const w = new ChatterboxWorker();
    worker = w;
    w.start();
    await w.readyPromise;
    return w;
  })();
  try {
    return await bootingPromise;
  } finally {
    bootingPromise = null;
  }
}

// `voice` here is the reference-WAV filename (not a voice id like Kokoro's
// `bf_isabella`). The dispatcher passes the persona's `voice` field directly;
// resolve it against the configured voice directory so the worker gets an
// absolute path (or empty string → built-in voice).
function resolveReferenceWav(voice?: string): string {
  if (!voice) return '';
  if (path.isAbsolute(voice)) return voice;
  return path.join(config.chatterbox.voiceDir, voice);
}

export async function speak(
  text: string,
  { outPath: customPath, voice }: { outPath?: string; voice?: string } = {},
): Promise<string> {
  if (!text || !text.trim()) throw new Error('Empty TTS text');
  await mkdir(config.piper.outDir, { recursive: true });

  const id = crypto.randomBytes(6).toString('hex');
  const outPath = customPath || path.join(config.piper.outDir, `${id}.wav`);
  if (customPath) await mkdir(path.dirname(customPath), { recursive: true });

  const w = await ensureWorker();
  const msg = await w.send(id, {
    text: text.trim(),
    reference_wav: resolveReferenceWav(voice),
    out: outPath,
  });
  return msg.path;
}

// Chatterbox is bundled only when the controller image is built with
// `--build-arg WITH_CHATTERBOX=1`, so a configured path isn't proof the
// runtime exists. Check the venv interpreter and worker script are actually
// on disk — that's true in a Chatterbox-enabled image and false otherwise,
// which is exactly what lets the dispatcher fall back to Piper.
export function isAvailable() {
  return existsSync(config.chatterbox.python) && existsSync(config.chatterbox.workerScript);
}

// List the reference-WAV filenames the operator has uploaded into the voice
// directory. The admin UI uses these to populate the per-persona voice dropdown.
// Returns [] (not an error) if the directory doesn't exist yet — that's the
// pre-install state and the UI handles it gracefully.
export async function listReferenceVoices(): Promise<string[]> {
  try {
    const entries = await readdir(config.chatterbox.voiceDir);
    return entries.filter((f) => f.toLowerCase().endsWith('.wav')).sort();
  } catch {
    return [];
  }
}

export function voiceDir(): string {
  return config.chatterbox.voiceDir;
}
