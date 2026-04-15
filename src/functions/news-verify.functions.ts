import { createServerFn } from "@tanstack/react-start";
import { openAIChat, stripJsonFences } from "@/lib/openai";
import { getWorldStateSnapshot } from "@/lib/worldState";

type VerifyResult = {
  verified: boolean;
  credibility_score: number;
  classification: "Verified" | "Unverified" | "Misleading" | "Fake";
  reason: string;
  key_claims: string[];
  confidence: number;
};

const FALLBACK_RESULT: VerifyResult = {
  verified: false,
  credibility_score: 50,
  classification: "Unverified",
  reason: "AI verification service is unavailable. Please try again later.",
  key_claims: [],
  confidence: 0,
};

export const verifyNews = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { headline: string; content?: string }) => {
      if (!input.headline?.trim()) throw new Error("Headline is required");
      if (input.headline.length > 500) throw new Error("Headline too long");
      if (input.content && input.content.length > 3000) throw new Error("Content too long");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const worldContext = getWorldStateSnapshot();

    const result = await openAIChat({
      json: true,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a news verification AI for the Global Governance Simulator. You assess news credibility by cross-referencing against known world state data.

${worldContext}

Evaluate news claims against this simulation state. Respond ONLY with this JSON (no markdown):
{
  "verified": boolean,
  "credibility_score": number (0-100),
  "classification": "Verified" | "Unverified" | "Misleading" | "Fake",
  "reason": "1-3 sentence explanation of your verdict",
  "key_claims": ["claim1", "claim2"] (max 3 key claims identified),
  "confidence": number (0-1, your confidence in this assessment)
}

Scoring guide:
- 80-100: Verified — aligns with known facts and world state
- 50-79: Unverified — plausible but unconfirmed  
- 20-49: Misleading — contains distortions or missing critical context
- 0-19: Fake — contradicts known facts or is clearly fabricated`,
        },
        {
          role: "user",
          content: `Verify this news:\n\nHEADLINE: "${data.headline}"${data.content ? `\n\nCONTENT: ${data.content}` : ""}`,
        },
      ],
    });

    if (!result.ok) return { result: FALLBACK_RESULT };

    try {
      const parsed = JSON.parse(stripJsonFences(result.text)) as VerifyResult;
      return { result: parsed };
    } catch {
      return { result: FALLBACK_RESULT };
    }
  });

export const generateNewsHeadlines = createServerFn({ method: "GET" })
  .handler(async () => {
    const worldContext = getWorldStateSnapshot();

    const result = await openAIChat({
      json: true,
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content: `You are a global news wire service for the Global Governance Simulator. Generate realistic news headlines based on the current simulation state.

${worldContext}

Respond ONLY with this JSON:
{
  "headlines": [
    { "headline": "...", "source": "Reuters/AP/BBC/AFP/Al Jazeera", "category": "conflict|diplomacy|economy|humanitarian|security", "credibility": number(75-100) }
  ]
}

Generate exactly 5 headlines that reflect the current world state. Make them feel like real breaking news.`,
        },
        { role: "user", content: "Generate current news headlines." },
      ],
    });

    if (!result.ok) return { headlines: [] };

    try {
      const parsed = JSON.parse(stripJsonFences(result.text));
      return { headlines: parsed.headlines ?? [] };
    } catch {
      return { headlines: [] };
    }
  });
