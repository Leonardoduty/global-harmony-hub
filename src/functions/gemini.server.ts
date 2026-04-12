// Shared Gemini API helper — server only
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export async function callGemini(opts: {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = opts.model ?? "gemini-2.0-flash";
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [
      { role: "user", parts: [{ text: `${opts.systemPrompt}\n\n${opts.userPrompt}` }] },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Gemini API error ${res.status}:`, text);
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text as string;
}

export async function callGeminiImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${GEMINI_API_URL}/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const parts = json.candidates?.[0]?.content?.parts;
    const imgPart = parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
    if (imgPart?.inlineData?.data) {
      return `data:image/png;base64,${imgPart.inlineData.data}`;
    }
    return null;
  } catch {
    return null;
  }
}
