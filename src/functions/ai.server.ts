// Shared AI helper — Minimax 2.5 API — server only
const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/chat/completions";

export async function callAI(opts: {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY not configured");

  const messages = [
    { role: "system", content: opts.systemPrompt },
    { role: "user", content: opts.userPrompt },
  ];

  const body: Record<string, unknown> = {
    model: "MiniMax-Text-01",
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: 4096,
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Minimax API error ${res.status}:`, text);
    throw new Error(`Minimax API error: ${res.status}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty Minimax response");
  return text as string;
}

// Image generation using Lovable AI Gateway (Minimax doesn't do images)
export async function callAIImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const imgUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imgUrl || null;
  } catch {
    return null;
  }
}
