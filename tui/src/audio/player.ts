// Audio playback by shelling out to an external player — a terminal can't
// decode MP3 itself. `mpv` is preferred because it exposes a JSON IPC socket
// for live volume control; `ffplay` is the fallback (no post-launch volume).
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export type Engine = 'mpv' | 'ffplay';

function onPath(bin: string): boolean {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
    stdio: 'ignore',
  });
  return r.status === 0;
}

// Pick the best available engine, or null if the box has neither binary.
export function detectEngine(): Engine | null {
  if (onPath('mpv')) return 'mpv';
  if (onPath('ffplay')) return 'ffplay';
  return null;
}

export class StreamPlayer {
  readonly streamUrl: string;
  readonly engine: Engine | null;
  private child: ChildProcess | null;
  private ipcPath: string | null;
  // Set true by stop() so the child's exit handler can tell an intentional
  // teardown from a crash / stream drop and only fire onExitCb for the latter.
  private stopping: boolean;
  private onExitCb: (() => void) | null;

  constructor(streamUrl: string) {
    this.streamUrl = streamUrl;
    this.engine = detectEngine();
    this.child = null;
    this.ipcPath = null;
    this.stopping = false;
    this.onExitCb = null;
  }

  get available(): boolean { return this.engine != null; }

  // Only mpv can change volume after launch (via its IPC socket).
  get supportsVolume(): boolean { return this.engine === 'mpv'; }

  // Register a callback fired when the audio child exits on its own — a
  // crash, or the stream connection dropping — as opposed to stop() killing
  // it. Lets the UI flip `tunedIn` back off so it never claims to be playing
  // a process that is already gone.
  onExit(cb: () => void): void { this.onExitCb = cb; }

  // Start playback. `volume` is 0–100; ignored by the ffplay path.
  play(volume = 70): void {
    if (!this.engine || this.child) return;
    this.stopping = false;
    if (this.engine === 'mpv') {
      this.ipcPath = path.join(os.tmpdir(), `subwave-mpv-${process.pid}.sock`);
      this.child = spawn('mpv', [
        '--no-video',
        '--no-terminal',
        '--really-quiet',
        `--volume=${Math.round(volume)}`,
        `--input-ipc-server=${this.ipcPath}`,
        this.streamUrl,
      ], { stdio: 'ignore' });
    } else {
      // No -autoexit: that flag is for finite files. On a continuous Icecast
      // stream any momentary socket blip reads as EOF and ffplay would quit
      // for good, with nothing to respawn it.
      this.child = spawn('ffplay', [
        '-nodisp', '-loglevel', 'quiet', this.streamUrl,
      ], { stdio: 'ignore' });
    }
    const handleGone = () => {
      this.child = null;
      this.ipcPath = null;
      if (!this.stopping) this.onExitCb?.();
    };
    this.child.on('error', handleGone);
    this.child.on('exit', handleGone);
  }

  stop(): void {
    if (this.child) {
      this.stopping = true;
      this.child.kill('SIGTERM');
      this.child = null;
    }
  }

  // Send a new volume (0–100) to a running mpv over its IPC socket. No-op for
  // ffplay or when nothing is playing. Errors are swallowed — a transient
  // socket failure must never crash the UI.
  setVolume(volume: number): void {
    if (this.engine !== 'mpv' || !this.child || !this.ipcPath) return;
    const sock = net.connect(this.ipcPath, () => {
      const cmd = { command: ['set_property', 'volume', Math.round(volume)] };
      sock.write(JSON.stringify(cmd) + '\n');
      sock.end();
    });
    sock.on('error', () => {});
  }
}
