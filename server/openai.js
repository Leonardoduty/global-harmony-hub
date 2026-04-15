import OpenAI from "openai";

let _client = null;

export function getOpenAIKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function getOpenAIClient() {
  const key = getOpenAIKey();
  if (!key) return null;
  if (!_client) _client = new OpenAI({ apiKey: key });
  return _client;
}

export async function openAIChat({ messages, model = "gpt-4o-mini", json = false, temperature = 0.8 }) {
  const client = getOpenAIClient();
  if (!client) return { ok: false, message: "OpenAI API key not configured", model: null };

  try {
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature,
      response_format: json ? { type: "json_object" } : undefined,
    });
    const text = res.choices[0]?.message?.content ?? "";
    return { ok: true, text, model };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI error";
    return { ok: false, message: msg, model };
  }
}

export function stripJsonFences(text) {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = t.match(fence);
  if (m) return m[1].trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return t.trim();
}
