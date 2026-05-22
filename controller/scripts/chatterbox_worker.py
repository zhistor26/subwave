#!/usr/bin/env python3
"""
Chatterbox TTS worker — line-protocol child process.

The Node side (controller/src/audio/chatterbox.ts) spawns this once and keeps
it alive, because loading the Chatterbox Turbo model takes ~10-30s and we don't
want to eat that on every DJ link. Protocol is one JSON object per line over
stdin/stdout, identical in shape to kokoro_worker.py.

Request:  {"id": "...", "text": "...", "out": "/path/to.wav",
           "reference_wav": "/optional/reference.wav"}
Response: {"id": "...", "ok": true,  "path": "/path/to.wav", "duration_s": 3.4}
       |  {"id": "...", "ok": false, "error": "..."}

Uses the official `chatterbox-tts` PyPI package — `ChatterboxTurboTTS` from
`chatterbox.tts_turbo`. There is no turn-key ONNX runtime package, so this is
the PyTorch path; it runs on CPU (slow) or CUDA. The model + weights are baked
into the controller image only when it is built with
`--build-arg WITH_CHATTERBOX=1` (see docker/Dockerfile.controller). Weights are
resolved through the Hugging Face cache (HF_HOME), pre-warmed at image build.
"""

import json
import os
import sys
import traceback
from pathlib import Path

DEVICE = os.environ.get("CHATTERBOX_DEVICE", "cpu").lower()
DEFAULT_REFERENCE = os.environ.get("CHATTERBOX_REFERENCE_WAV", "")


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def log(msg):
    # Anything on stderr is captured by the Node parent as plain log lines.
    sys.stderr.write(f"[chatterbox-worker] {msg}\n")
    sys.stderr.flush()


def main():
    try:
        import torch
        import torchaudio as ta
        from chatterbox.tts_turbo import ChatterboxTurboTTS
    except Exception as e:
        emit({"id": None, "ok": False, "fatal": True, "error": f"import failed: {e}"})
        sys.exit(1)

    device = DEVICE
    if device == "cuda" and not torch.cuda.is_available():
        log("CUDA requested but unavailable — falling back to cpu")
        device = "cpu"

    log(f"loading ChatterboxTurboTTS on device={device}")
    try:
        model = ChatterboxTurboTTS.from_pretrained(device=device)
    except Exception as e:
        emit({"id": None, "ok": False, "fatal": True, "error": f"model load failed: {e}"})
        sys.exit(1)

    sample_rate = model.sr
    log("ready")
    emit({"id": None, "ready": True})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            text = (req.get("text") or "").strip()
            if not text:
                raise ValueError("empty text")
            out = req.get("out")
            if not out:
                raise ValueError("missing 'out' path")
            reference_wav = req.get("reference_wav") or DEFAULT_REFERENCE
            if reference_wav and not Path(reference_wav).is_file():
                log(f"reference_wav not found, using built-in voice: {reference_wav}")
                reference_wav = ""
            Path(out).parent.mkdir(parents=True, exist_ok=True)

            # Voice cloning is opt-in per request: passing audio_prompt_path
            # clones the reference clip; omitting it uses the built-in voice.
            if reference_wav:
                wav = model.generate(text, audio_prompt_path=reference_wav)
            else:
                wav = model.generate(text)

            # generate() returns a torch tensor shaped [channels, samples];
            # torchaudio.save needs it on CPU.
            if hasattr(wav, "cpu"):
                wav = wav.cpu()
            ta.save(out, wav, sample_rate)

            duration = float(wav.shape[-1]) / float(sample_rate)
            emit({"id": req_id, "ok": True, "path": out, "duration_s": round(duration, 3)})
        except Exception as e:
            log(f"request failed: {e}\n{traceback.format_exc()}")
            emit({"id": req_id, "ok": False, "error": str(e)})


if __name__ == "__main__":
    main()
