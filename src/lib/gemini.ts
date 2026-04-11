const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Default text model (broad API availability). Override with GEMINI_MODEL. */
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

/** Image-capable model for scenario art (override with GEMINI_IMAGE_MODEL). */
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";

export function getGeminiApiKey(): string | undefined {
  const raw =
    (typeof process !== "undefined" && (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)) ||
    "";
  const key = raw.trim();
  return key || undefined;
}

export function getGeminiModel(): string {
  const m = (typeof process !== "undefined" && process.env.GEMINI_MODEL?.trim()) || "";
  return m || DEFAULT_GEMINI_MODEL;
}

export function getGeminiImageModel(): string {
  const m = (typeof process !== "undefined" && process.env.GEMINI_IMAGE_MODEL?.trim()) || "";
  return m || DEFAULT_GEMINI_IMAGE_MODEL;
}

/** Strip markdown code fences some models still emit despite responseMimeType. */
export function stripJsonMarkdown(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i;
  const m = t.match(fence);
  if (m) return m[1].trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

/** Map OpenAI-style chat messages to Gemini contents + optional system instruction. */
export function openAiMessagesToGemini(messages: { role: string; content: string }[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
} {
  const systemChunks: string[] = [];
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemChunks.push(m.content);
    } else if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: m.content }] });
    }
  }
  return {
    ...(systemChunks.length
      ? { systemInstruction: { parts: [{ text: systemChunks.join("\n\n") }] } }
      : {}),
    contents,
  };
}

export function extractGeminiText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const root = data as {
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  if (root.error?.message) return null;
  const parts = root.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;
  const text = parts.map((p) => p.text ?? "").join("");
  if (text) return text;
  const fr = root.candidates?.[0]?.finishReason;
  const br = root.promptFeedback?.blockReason;
  if (fr || br) return null;
  return null;
}

type InlineImagePart = { inline_data?: { mime_type?: string; data?: string }; inlineData?: { mimeType?: string; data?: string } };

export function extractGeminiInlineImages(data: unknown): { mimeType: string; data: string }[] {
  if (!data || typeof data !== "object") return [];
  const root = data as { candidates?: { content?: { parts?: InlineImagePart[] } }[] };
  const parts = root.candidates?.[0]?.content?.parts;
  if (!parts?.length) return [];
  const out: { mimeType: string; data: string }[] = [];
  for (const p of parts) {
    const id = p.inline_data ?? p.inlineData;
    if (!id?.data) continue;
    const mime = id.mime_type ?? id.mimeType ?? "image/png";
    out.push({ mimeType: mime, data: id.data });
  }
  return out;
}

export async function geminiGenerateImage(params: {
  apiKey: string;
  prompt: string;
}): Promise<{ ok: true; dataUrls: string[] } | { ok: false; status: number; message: string }> {
  const model = getGeminiImageModel();
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: params.prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "16:9" },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify(body),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, status: res.status, message: "Invalid JSON from Gemini API" };
  }
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message || `Gemini image API error (${res.status})`;
    return { ok: false, status: res.status, message: msg };
  }
  const imgs = extractGeminiInlineImages(json);
  if (!imgs.length) {
    const msg = (json as { error?: { message?: string } })?.error?.message || "No image in model response";
    return { ok: false, status: 502, message: msg };
  }
  const dataUrls = imgs.map((img) => `data:${img.mimeType};base64,${img.data}`);
  return { ok: true, dataUrls };
}

export async function geminiGenerateFromMessages(params: {
  apiKey: string;
  messages: { role: string; content: string }[];
  responseMimeType?: "application/json" | "text/plain";
}): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const model = getGeminiModel();
  const { systemInstruction, contents } = openAiMessagesToGemini(params.messages);
  if (contents.length === 0) {
    return { ok: false, status: 400, message: "No messages to send" };
  }

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (params.responseMimeType) {
    body.generationConfig = { responseMimeType: params.responseMimeType };
  }

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify(body),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, status: res.status, message: "Invalid JSON from Gemini API" };
  }

  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } })?.error?.message || `Gemini API error (${res.status})`;
    return { ok: false, status: res.status, message: msg };
  }

  const text = extractGeminiText(json);
  if (!text) {
    const msg = (json as { error?: { message?: string } })?.error?.message || "Empty model response";
    return { ok: false, status: 502, message: msg };
  }

  return { ok: true, text };
}
