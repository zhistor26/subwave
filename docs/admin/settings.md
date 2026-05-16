# Settings — Station Configuration

**Path:** `/admin/settings`

Station-wide configuration, split into four sections plus a **danger zone**.
A section rail on the left switches between them. Changes save to `/settings`;
the page also reads live state and polls every 3 seconds.

> **API keys are never entered in this UI.** Cloud TTS and cloud LLM keys are
> read from the controller's environment (`controller/.env`). Each provider
> section reports whether its key is present and names the env var to set.

---

## TTS voice

Sets the **station-level** TTS — not per-persona voices (those live on the
[Personas](./personas.md) page).

- **Default engine** — the engine used to render jingles, and the fallback if a
  persona's own engine fails. `piper` is the universal fallback.
- **Kokoro voice** — the Kokoro voice id used wherever Kokoro is the engine.
- **Cloud engine** *(optional)* — enable it by picking a provider (OpenAI /
  ElevenLabs), or set it to **off**. When on, configure the **model** and a
  **default voice** (used by Cloud personas that haven't set their own). The
  **API key** status banner reports whether `OPENAI_API_KEY` /
  `ELEVENLABS_API_KEY` is set.

Applies live — no mixer restart.

---

## LLM provider

The model that writes DJ scripts and picks tracks.

- **Provider** — `ollama` (homelab default, needs no key), `anthropic`,
  `openai`, `google`, `openrouter`, or `gateway`. Switching reroutes **every**
  LLM call — no redeploy.
- **Model** — the model id for the chosen provider, set here for every
  provider including Ollama. Leave blank to use the built-in default
  (`nemotron-3-super:cloud` for Ollama); for cloud providers a model is
  required, with a hint giving the expected id format.
- **Ollama server URL** *(Ollama only)* — where the Ollama server runs. Leave
  blank to use the built-in default (`http://localhost:11434`).
- For any non-Ollama provider, an **API key** banner reports whether the
  matching env var is present.
- **Next-track picker** — choose how the DJ chooses the next track:
  - **Candidate pool** *(default)* — the controller builds a balanced pool and
    the model picks from it.
  - **Agent** — a tool-using agent explores the library itself. Needs a model
    good at multi-step tool calls; leave off for small local models.

Applies on the next LLM call — no restart.

---

## Mixer

- **Crossfade duration** — seconds of overlap between tracks.
  **Requires a mixer restart** to apply (flagged with a *restart required* pill).
- **Station location** — name, latitude, longitude. Sets where the DJ thinks it
  broadcasts from (`{location}`) and drives the Open-Meteo weather it reads on
  air. Applies live.

---

## Jingles

Pre-recorded TTS station stingers.

- **Jingle ratio** — one jingle every N music tracks. **Requires a mixer
  restart** to apply.
- **Create jingle** — type up to 500 characters; the controller renders a WAV
  via the configured TTS engine and adds it to the rotation (picked up without
  a restart).
- **Jingles list** — every rendered jingle with its text, filename, size, and
  creation time. **Delete** removes one — except the built-in station ident,
  which is protected and cannot be deleted.

---

## Danger zone

In the section rail, below the four sections:

- **Broadcast on air / off air** indicator.
- **Stop stream** — takes the station off air by disconnecting the Icecast
  mount. Every current listener is dropped; new listeners get nothing.
  Confirmed via a dialog. **Start stream** brings it back (non-destructive, no
  confirm).
- **Restart mixer** — drops the broadcast for ~3–5 seconds. Use it to apply
  pending crossfade or jingle-ratio changes. Confirmed via a dialog. When a
  saved setting is waiting on a restart, a *"Pending settings need a restart"*
  note appears here.
