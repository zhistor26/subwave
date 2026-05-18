// AI SDK wrapper — the single chokepoint for every LLM call in the controller.
//
// Two primitives:
//   djText   — free-text generation (DJ intros, links, idents, skill segments)
//   djObject — schema-validated structured output (request matching, picker)
//
// Both resolve their model through llm/provider.js, so switching providers in
// Settings reroutes every call with no change here or at the call sites.

import { generateText, Output, stepCountIs, ToolLoopAgent, tool } from 'ai';
import { languageModel, activeModelLabel, providerName } from './provider.js';
import { record } from './log.js';
import * as settings from '../settings.js';

// Hard output-token caps. A reasoning model with no cap can generate until it
// fills the whole context window — one runaway <think> ramble then ties up the
// inference slot for minutes. These are generous backstops for normal output
// (idents are ~150 tokens, structured picks ~250); raise them if you turn
// `llm.reasoning` on and need room for the chain-of-thought.
const MAX_TOKENS_TEXT   = 800;
const MAX_TOKENS_OBJECT = 1000;
const MAX_TOKENS_AGENT  = 1200;

// Some models (Qwen 3, DeepSeek R1, etc.) emit a <think>…</think> reasoning
// block before the answer. Reasoning is suppressed at the provider layer when
// `llm.reasoning` is off (llm/provider.js no-think fetch + the Ollama `think`
// flag below); we still strip any leftover tags defensively here.
const THINK_TAG_RE = /<think>[\s\S]*?<\/think>\s*/gi;
const DANGLING_THINK_RE = /^[\s\S]*?<\/think>\s*/i;

function stripThinking(s) {
  if (!s) return s;
  return s.replace(THINK_TAG_RE, '').replace(DANGLING_THINK_RE, '').trim();
}

// Pull a JSON object out of a free-text reply: drop ```json fences and any
// prose around it, then take the outermost { … }. Used by djObject's recovery
// path when native structured output fails to parse.
function extractJson(s) {
  if (!s) throw new Error('empty model response');
  const t = s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in model response');
  return t.slice(start, end + 1);
}

// Normalise the AI SDK usage block into { input, output, total }. Providers
// vary in which fields they populate (and a local Ollama box often omits them
// entirely — token stats then read as 0 for that call). `totalUsage` is the
// agent-loop sum across steps; prefer it when present.
function usageOf(result) {
  const u = result?.totalUsage || result?.usage || {};
  const input = u.inputTokens ?? u.promptTokens ?? 0;
  const output = u.outputTokens ?? u.completionTokens ?? 0;
  const total = u.totalTokens ?? (input + output);
  return { input, output, total };
}

// `repeat_penalty` is Ollama-specific and lives under providerOptions.ollama;
// non-Ollama providers ignore the block entirely, so it's safe to always pass.
function ollamaOptions(repeatPenalty) {
  // `think` follows the llm.reasoning setting — false suppresses the
  // <think> block on reasoning models served through Ollama.
  const opts = { think: settings.get().llm?.reasoning === true };
  if (repeatPenalty != null) opts.options = { repeat_penalty: repeatPenalty };
  return { ollama: opts };
}

// True when the active provider needs the tool-call structured-output path.
// Ollama-served models — local and especially the `:cloud` ones — ignore
// JSON-schema constrained decoding (Ollama's `format` field) and just emit
// prose, so Output.object throws NoObjectGeneratedError. Their tool-calling,
// however, works: see objectViaToolCall.
function needsToolCallObject() {
  return providerName() === 'ollama';
}

// Structured output via a forced tool call. The result schema is presented as
// an `emit` tool the model MUST call (toolChoice:'required'); we capture and
// Zod-validate its input. This is the reliable structured-output path for
// models that ignore JSON mode but handle tool calls fine. Single step — the
// model's only legal move is to call `emit` once.
async function objectViaToolCall({ system, prompt, messages, schema, temperature, maxOutputTokens }) {
  let captured;
  const emit = tool({
    description: 'Return your final answer. Call this tool exactly once, with the complete result — calling it IS how you answer.',
    inputSchema: schema,
    execute: async (input) => { captured = input; return 'received'; },
  });
  await generateText({
    model: languageModel(),
    system,
    ...(messages ? { messages } : { prompt }),
    temperature,
    maxOutputTokens,
    tools: { emit },
    toolChoice: 'required',
    stopWhen: stepCountIs(1),
    providerOptions: ollamaOptions(null),
  });
  if (captured === undefined) throw new Error('model never called the emit tool');
  return schema.parse(captured);
}

// Free-text DJ generation.
export async function djText({
  system,
  prompt,
  temperature = 0.9,
  topP = 0.95,
  repeatPenalty = 1.15,
  seed = null,
  maxOutputTokens = MAX_TOKENS_TEXT,
  kind = 'sdk.djText',
}) {
  const started = Date.now();
  try {
    const result = await generateText({
      model: languageModel(),
      system,
      prompt,
      temperature,
      topP,
      ...(seed != null ? { seed } : {}),
      maxOutputTokens,
      providerOptions: ollamaOptions(repeatPenalty),
    });
    const out = stripThinking(result.text);
    record({
      kind, ok: true, ms: Date.now() - started,
      model: activeModelLabel(),
      sampling: { temperature, top_p: topP, repeat_penalty: repeatPenalty, seed },
      via: 'ai-sdk',
      usage: usageOf(result),
      // Full, untruncated — the /debug surface shows the whole system prompt.
      system,
      user: prompt,
      response: out,
      t: new Date().toISOString(),
    });
    return out;
  } catch (err) {
    record({
      kind, ok: false, ms: Date.now() - started,
      model: activeModelLabel(), via: 'ai-sdk',
      user: prompt, error: err.message, t: new Date().toISOString(),
    });
    throw err;
  }
}

// Schema-validated structured output. `schema` is a Zod object schema; the
// returned value is parsed and validated.
//
// Two attempts, because small/cloud models occasionally botch structured
// output (the AI SDK throws NoObjectGeneratedError — "could not parse the
// response"):
//   1. native    — Output.object, which forwards the schema to the provider's
//                   structured-output mode (constrained decoding where it's
//                   supported).
//   2. recovery  — plain free-text, then strip <think> blocks / ``` fences and
//                   Zod-validate ourselves. Catches models that wrap the JSON
//                   in reasoning the native parser chokes on.
// Throws only if BOTH attempts fail.
export async function djObject({
  system,
  prompt,
  schema,
  temperature = 0.4,
  maxOutputTokens = MAX_TOKENS_OBJECT,
  kind = 'sdk.djObject',
}) {
  const started = Date.now();
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let object;
      let usage;
      if (attempt === 1 && needsToolCallObject()) {
        object = await objectViaToolCall({ system, prompt, schema, temperature, maxOutputTokens });
      } else if (attempt === 1) {
        const result = await generateText({
          model: languageModel(),
          system,
          prompt,
          temperature,
          maxOutputTokens,
          output: Output.object({ schema }),
          providerOptions: ollamaOptions(null),
        });
        object = result.output;
        usage = usageOf(result);
      } else {
        const result = await generateText({
          model: languageModel(),
          system,
          prompt: `${prompt}\n\nRespond with a single JSON object only — no prose, no markdown fences.`,
          temperature,
          maxOutputTokens,
          providerOptions: ollamaOptions(null),
        });
        object = schema.parse(JSON.parse(extractJson(stripThinking(result.text))));
        usage = usageOf(result);
      }
      record({
        kind, ok: true, ms: Date.now() - started,
        model: activeModelLabel(),
        sampling: { temperature },
        via: attempt === 2 ? 'ai-sdk:recovery' : (needsToolCallObject() ? 'ai-sdk:tool' : 'ai-sdk'),
        usage,
        // Full, untruncated — the /debug surface shows the whole system prompt.
        system,
        user: prompt,
        response: JSON.stringify(object).slice(0, 500),
        t: new Date().toISOString(),
      });
      return object;
    } catch (err) {
      lastErr = err;
    }
  }
  record({
    kind, ok: false, ms: Date.now() - started,
    model: activeModelLabel(), via: 'ai-sdk',
    user: prompt, error: lastErr.message, t: new Date().toISOString(),
  });
  throw lastErr;
}

// Conversational tool-loop with structured output — the primitive behind the
// session DJ agent (broadcast/dj-agent.js). A ToolLoopAgent is given the
// music-discovery tools and a step cap, fed a `messages` array (the session
// chat window) instead of a single prompt, and returns a schema-validated
// final object. Throws on failure so the caller can fall back to a stateless
// path.
export async function djAgent({
  system,
  messages,
  tools,
  schema,
  maxSteps = 8,
  temperature = 0.6,
  maxOutputTokens = MAX_TOKENS_AGENT,
  kind = 'sdk.djAgent',
}) {
  const started = Date.now();
  try {
    // No discovery tools + an Ollama model that ignores JSON mode: there is no
    // loop to run, and ToolLoopAgent + Output.object would throw
    // NoObjectGeneratedError. Get the structured result from a forced tool call.
    const toolCount = tools ? Object.keys(tools).length : 0;
    if (schema && toolCount === 0 && needsToolCallObject()) {
      const object = await objectViaToolCall({ system, messages, schema, temperature, maxOutputTokens });
      record({
        kind, ok: true, ms: Date.now() - started,
        model: activeModelLabel(),
        sampling: { temperature },
        via: 'ai-sdk:tool',
        system,
        messages,
        toolCalls: [],
        steps: 0,
        response: JSON.stringify(object, null, 2),
        t: new Date().toISOString(),
      });
      return { object, steps: 0, toolCalls: [] };
    }
    const agent = new ToolLoopAgent({
      model: languageModel(),
      instructions: system,
      tools,
      stopWhen: stepCountIs(maxSteps),
      temperature,
      maxOutputTokens,
      ...(schema ? { output: Output.object({ schema }) } : {}),
    });
    const result = await agent.generate({ messages });
    const steps = result.steps?.length ?? 0;
    const object = schema ? result.output : stripThinking(result.text);
    // Flatten the tool-loop into an ordered trail of {name, args, result} so
    // the /debug surface shows exactly which library tools the agent called.
    const toolCalls = (result.steps || []).flatMap((s) => {
      const results = s.toolResults || [];
      return (s.toolCalls || []).map((c, i) => ({
        name: c.toolName,
        args: c.input ?? c.args ?? null,
        result: results[i]?.output ?? results[i]?.result ?? null,
      }));
    });
    record({
      kind, ok: true, ms: Date.now() - started,
      model: activeModelLabel(),
      sampling: { temperature },
      via: 'ai-sdk:agent',
      usage: usageOf(result),
      // Full, untruncated — the agent's entire input and trail.
      system,
      messages,
      toolCalls,
      steps,
      response: schema
        ? JSON.stringify(object, null, 2)
        : String(object ?? ''),
      t: new Date().toISOString(),
    });
    return { object, steps, toolCalls };
  } catch (err) {
    record({
      kind, ok: false, ms: Date.now() - started,
      model: activeModelLabel(), via: 'ai-sdk:agent',
      system,
      messages,
      error: err.message, t: new Date().toISOString(),
    });
    throw err;
  }
}
