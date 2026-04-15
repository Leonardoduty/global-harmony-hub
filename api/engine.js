import { getOpenAIKey } from "./openai.js";
export default async function handler(req, res) {
    try {
      const body = req.body || {};
      const prompt = body.prompt || "Hello";
  
      const openaiKey = getOpenAIKey();
      const openrouterKey = process.env.OPENROUTER_API_KEY;
  
      // ---------------- OPENAI ----------------
      if (openaiKey) {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
          }),
        });
  
        const data = await r.json();
        const reply = data?.choices?.[0]?.message?.content;
  
        return res.status(200).json({
          reply,
          provider: "openai",
        });
      }
  
      // ---------------- OPENROUTER ----------------
      if (openrouterKey) {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-nano-a3b:free",
            messages: [{ role: "user", content: prompt }],
          }),
        });
  
        const data = await r.json();
        const reply = data?.choices?.[0]?.message?.content;
  
        return res.status(200).json({
          reply,
          provider: "openrouter",
        });
      }
  
      return res.status(400).json({
        reply: "No API keys found",
      });
  
    } catch (err) {
      return res.status(500).json({
        error: err.message,
      });
    }
  }
  console.log("ENV CHECK:", {
    openai: !!process.env.OPENAI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  });