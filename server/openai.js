import OpenAI from "openai";

const OPENROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
const OPENAI_MODEL = "gpt-4o-mini";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

let _openaiClient = null;
let _lastOpenAIKey = null;

export function getOpenAIKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function getOpenRouterKey() {
  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  if (orKey) return orKey;
  const aiKey = process.env.OPENAI_API_KEY?.trim();
  if (aiKey?.startsWith("sk-or-")) return aiKey;
  return null;
}

function getOpenAIOnlyKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key && !key.startsWith("sk-or-")) return key;
  return process.env.OPENAI_BACKUP_KEY?.trim() || null;
}

function getOpenAIClient(key) {
  if (!key) return null;
  if (!_openaiClient || _lastOpenAIKey !== key) {
    _openaiClient = new OpenAI({ apiKey: key });
    _lastOpenAIKey = key;
  }
  return _openaiClient;
}

async function tryOpenRouter(messages, { json = false, temperature = 0.8 } = {}) {
  const key = getOpenRouterKey();
  if (!key) {
    return { ok: false, error: "No OpenRouter API key available", skipped: true };
  }

  const body = {
    model: OPENROUTER_MODEL,
    messages,
    temperature,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };

  try {
    const res = await fetch(OPENROUTER_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://global-pulse-simulator.replit.app",
        "X-Title": "Global Governance AI Simulator",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    const raw = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = raw?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: errMsg, raw, skipped: false };
    }

    const content = raw?.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "Empty response from OpenRouter", raw, skipped: false };
    }

    return { ok: true, text: content, model: OPENROUTER_MODEL, raw, skipped: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenRouter fetch error";
    return { ok: false, error: msg, skipped: false };
  }
}

async function tryOpenAI(messages, { json = false, temperature = 0.8 } = {}) {
  const key = getOpenAIOnlyKey() ?? getOpenAIKey();
  if (!key) {
    return { ok: false, error: "No OpenAI API key available", skipped: true };
  }

  const client = getOpenAIClient(key);
  if (!client) {
    return { ok: false, error: "Could not initialise OpenAI client", skipped: true };
  }

  try {
    const res = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    });

    const content = res.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "Empty response from OpenAI", skipped: false };
    }

    return { ok: true, text: content, model: OPENAI_MODEL, skipped: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI error";
    return { ok: false, error: msg, skipped: false };
  }
}

export async function callAI(messages, options = {}) {
  const ai_flow = {
    openrouter_attempted: false,
    openrouter_success: false,
    openrouter_error: null,
    openrouter_skipped: false,
    openai_attempted: false,
    openai_success: false,
    openai_error: null,
    openai_skipped: false,
  };

  console.log(`[AI] Attempting OpenRouter (${OPENROUTER_MODEL})...`);
  ai_flow.openrouter_attempted = true;
  const orResult = await tryOpenRouter(messages, options);

  if (orResult.skipped) {
    ai_flow.openrouter_attempted = false;
    ai_flow.openrouter_skipped = true;
    ai_flow.openrouter_error = orResult.error;
    console.log(`[AI] OpenRouter skipped: ${orResult.error}`);
  } else if (orResult.ok) {
    ai_flow.openrouter_success = true;
    console.log(`[AI] OpenRouter success`);
    return {
      ok: true,
      text: orResult.text,
      model: orResult.model,
      provider: "openrouter",
      ai_flow,
    };
  } else {
    ai_flow.openrouter_success = false;
    ai_flow.openrouter_error = orResult.error;
    console.warn(`[AI] OpenRouter failed: ${orResult.error} — falling back to OpenAI`);
  }

  console.log(`[AI] Attempting OpenAI (${OPENAI_MODEL})...`);
  ai_flow.openai_attempted = true;
  const oaResult = await tryOpenAI(messages, options);

  if (oaResult.skipped) {
    ai_flow.openai_skipped = true;
    ai_flow.openai_error = oaResult.error;
    console.warn(`[AI] OpenAI skipped: ${oaResult.error}`);
  } else if (oaResult.ok) {
    ai_flow.openai_success = true;
    console.log(`[AI] OpenAI fallback success`);
    return {
      ok: true,
      text: oaResult.text,
      model: oaResult.model,
      provider: "openai",
      ai_flow,
      warning: "OpenRouter failed — fallback triggered",
    };
  } else {
    ai_flow.openai_success = false;
    ai_flow.openai_error = oaResult.error;
    console.error(`[AI] Both providers failed`);
  }

  return {
    ok: false,
    message: "Both AI providers failed",
    provider: "none",
    ai_flow,
    error: "Backup AI also failed",
  };
}

export function stripJsonFences(text) {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = t.match(fence);
  if (m) return m[1].trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return t.trim();
}

export async function getProviderStatus() {
  const testMessages = [{ role: "user", content: "Reply with OK" }];

  const orStatus = await tryOpenRouter(testMessages, { temperature: 0.1 });
  const oaStatus = await tryOpenAI(testMessages, { temperature: 0.1 });

  return {
    openrouter: orStatus.ok ? "working" : orStatus.skipped ? "no_key" : "failing",
    openai: oaStatus.ok ? "working" : oaStatus.skipped ? "no_key" : "failing",
    openrouter_error: orStatus.error ?? null,
    openai_error: oaStatus.error ?? null,
  };
}
