import OpenAI from "openai";

export function getOpenAIKey(): string | undefined {
  const key = typeof process !== "undefined" ? process.env.OPENAI_API_KEY?.trim() : undefined;
  return key || undefined;
}

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const key = getOpenAIKey();
  if (!key) return null;
  if (!_client) _client = new OpenAI({ apiKey: key });
  return _client;
}

export async function openAIChat(params: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string;
  json?: boolean;
  temperature?: number;
}): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const client = getOpenAIClient();
  if (!client) return { ok: false, message: "OpenAI API key not configured" };

  try {
    const res = await client.chat.completions.create({
      model: params.model ?? "gpt-4o-mini",
      messages: params.messages,
      temperature: params.temperature ?? 0.8,
      response_format: params.json ? { type: "json_object" } : undefined,
    });
    const text = res.choices[0]?.message?.content ?? "";
    return { ok: true, text };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenAI error";
    console.error("[OpenAI]", msg);
    return { ok: false, message: msg };
  }
}

export async function openAIGenerateImage(params: {
  prompt: string;
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const client = getOpenAIClient();
  if (!client) return { ok: false, message: "OpenAI API key not configured" };

  try {
    const res = await client.images.generate({
      model: "dall-e-3",
      prompt: params.prompt,
      n: 1,
      size: "1024x576",
      response_format: "url",
    });
    const url = res.data?.[0]?.url;
    if (!url) return { ok: false, message: "No image returned" };
    return { ok: true, url };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenAI image error";
    return { ok: false, message: msg };
  }
}

export function stripJsonFences(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = t.match(fence);
  if (m) return m[1].trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return t.trim();
}
