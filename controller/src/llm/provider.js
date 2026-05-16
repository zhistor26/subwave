// Provider registry — the one place SUB/WAVE decides which LLM to talk to.
//
// Every model call in the controller resolves its model through here, so the
// operator can switch providers (homelab Ollama ↔ Anthropic ↔ OpenAI ↔ Google
// Gemini ↔ OpenRouter ↔ the Vercel AI Gateway) from the admin Settings UI
// without a redeploy and without touching a single call site.
//
// The active provider/model lives in `settings.llm` (see settings.js):
//   { provider:  'ollama' | 'anthropic' | 'openai' | 'google' | 'openrouter' | 'gateway',
//     model:     string,   // empty → provider default
//     apiKey:    string,   // empty → read the provider's env var
//     ollamaUrl: string }  // empty → config.ollama.url default (Ollama only)
//
// `ollama` is the default and needs no key. The cloud providers are opt-in.

import { gateway, createGateway } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { config } from '../config.js';
import * as settings from '../settings.js';

// Memoise built clients so we don't reconstruct a provider on every call.
// Keyed by a signature that changes whenever provider/model/key changes, so a
// settings edit is picked up on the next call with no explicit invalidation.
const clientCache = new Map();

function llmCfg() {
  return settings.get().llm || { provider: 'ollama', model: '', apiKey: '', ollamaUrl: '' };
}

// Ollama server URL — from settings (admin UI), falling back to the config
// default when the settings field is left blank.
function ollamaBaseUrl(cfg) {
  return cfg.ollamaUrl || config.ollama.url;
}

// Resolve the concrete model id. Ollama falls back to the env-configured
// model; cloud providers must name a model explicitly — guessing a model id
// that may not exist fails worse than a clear error.
function resolveModelId(cfg) {
  if (cfg.model) return cfg.model;
  if (cfg.provider === 'ollama') return config.ollama.model;
  throw new Error(
    `llm.provider is "${cfg.provider}" but llm.model is empty — set a model in Settings`
  );
}

// Returns an AI SDK LanguageModel for the active provider.
export function languageModel() {
  const cfg = llmCfg();
  const id = resolveModelId(cfg);
  const sig = `${cfg.provider}|${id}|${cfg.apiKey || ''}|${ollamaBaseUrl(cfg)}`;

  const cached = clientCache.get(sig);
  if (cached) return cached;

  let model;
  switch (cfg.provider) {
    case 'anthropic': {
      const provider = createAnthropic(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      model = provider(id);
      break;
    }
    case 'openai': {
      const provider = createOpenAI(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      model = provider(id);
      break;
    }
    case 'google': {
      const provider = createGoogleGenerativeAI(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      model = provider(id);
      break;
    }
    case 'openrouter': {
      const provider = createOpenRouter(cfg.apiKey ? { apiKey: cfg.apiKey } : {});
      model = provider(id);
      break;
    }
    case 'gateway': {
      const provider = cfg.apiKey ? createGateway({ apiKey: cfg.apiKey }) : gateway;
      model = provider(id);
      break;
    }
    case 'ollama':
    default: {
      const provider = createOllama({ baseURL: `${ollamaBaseUrl(cfg)}/api` });
      model = provider(id);
      break;
    }
  }

  clientCache.set(sig, model);
  return model;
}

// A short, log-friendly label for the active model — used by record() and the
// /debug surface so a call's provenance is visible.
export function activeModelLabel() {
  const cfg = llmCfg();
  try {
    return `${cfg.provider}:${resolveModelId(cfg)}`;
  } catch {
    return `${cfg.provider}:(unset)`;
  }
}

// Ollama is the only provider whose tool-calling is weak enough to matter for
// the agentic picker. Callers use this to decide whether to trust the agent
// path or fall back to the pre-built candidate pool.
export function providerName() {
  return llmCfg().provider;
}

// The effective Ollama server URL — settings field, or the config default.
// Used by /debug to report what the registry will actually talk to.
export function activeOllamaUrl() {
  return ollamaBaseUrl(llmCfg());
}
