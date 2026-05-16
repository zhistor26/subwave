// Liquidsoap server (telnet) client — sends commands to the running mixer
// via TCP. radio.liq enables this and registers a "restart" command that
// triggers shutdown(); the container's restart-policy brings it right back
// with whatever updated settings the controller just wrote to disk.

import net from 'node:net';

const HOST = process.env.LIQUIDSOAP_HOST || 'liquidsoap';
const PORT = parseInt(process.env.LIQUIDSOAP_PORT || '1234', 10);

export function sendCommand(cmd, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: HOST, port: PORT });
    let buf = '';
    let done = false;

    const finish = (err, value) => {
      if (done) return;
      done = true;
      try { sock.end('quit\n'); } catch {}
      try { sock.destroy(); } catch {}
      if (err) reject(err); else resolve(value);
    };

    sock.setTimeout(timeoutMs);
    sock.on('timeout', () => finish(new Error('liquidsoap telnet timeout')));
    sock.on('error', err => finish(err));
    sock.on('connect', () => sock.write(`${cmd}\n`));
    sock.on('data', chunk => {
      buf += chunk.toString();
      // Liquidsoap terminates responses with END\r\n
      if (/END\r?\n/.test(buf)) finish(null, buf.replace(/END\r?\n.*$/s, '').trim());
    });
    sock.on('close', () => finish(null, buf.trim()));
  });
}

export async function restartLiquidsoap() {
  // The custom "restart" command in radio.liq calls shutdown().
  // We don't wait for a response — the socket will just be reset.
  try {
    await sendCommand('restart', 2000);
  } catch (err) {
    // Connection reset is expected (Liquidsoap is dying)
    if (!/ECONNRESET|EPIPE|timeout/i.test(err.message)) throw err;
  }
}

// Skip the currently playing track via the custom "skip" command in radio.liq.
// Unlike restart, this returns a normal "OK" response — Liquidsoap stays up.
export async function skipTrack() {
  return sendCommand('skip', 2000);
}

// Start / stop / query the broadcast. radio.liq exposes an interactive bool
// `on_air`; flipping it false makes the switch feeding the fallible Icecast
// output go unavailable, which disconnects the /stream.mp3 mount — the
// station goes off air while the mixer process keeps running.
export async function startStream() {
  return sendCommand('var.set on_air = true', 2000);
}

export async function stopStream() {
  return sendCommand('var.set on_air = false', 2000);
}

// Returns true when on air, false otherwise. `var.get on_air` echoes the
// interactive variable's value, e.g. "true" / "false".
export async function streamStatus() {
  const res = await sendCommand('var.get on_air', 2000);
  return /\btrue\b/i.test(res);
}
