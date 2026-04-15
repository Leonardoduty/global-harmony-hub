import "dotenv/config";

export default async function handler(req, res) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    const prompt = req.body?.prompt || "Hello";

    // OPENAI FIRST
    if (openaiKey) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await r.json();
      return res.json({ ok: true, source: "openai", data });
    }

    // OPENROUTER fallback
    if (openrouterKey) {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-nano-30b-a3b:free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await r.json();
      return res.json({ ok: true, source: "openrouter", data });
    }

    return res.json({ ok: false, error: "No API keys" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}