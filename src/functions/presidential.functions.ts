import { createServerFn } from "@tanstack/react-start";
import {
  geminiGenerateFromMessages,
  geminiGenerateImage,
  getGeminiApiKey,
  stripJsonMarkdown,
} from "@/lib/gemini";

function normalizeScenario(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (!title || !description) return null;
  const imagePrompt = typeof o.imagePrompt === "string" ? o.imagePrompt.trim() : "";

  const mapOpt = (x: unknown) => {
    if (!x || typeof x !== "object") return null;
    const opt = x as Record<string, unknown>;
    const label = typeof opt.label === "string" ? opt.label.trim() : "";
    const outcome = typeof opt.outcome === "string" ? opt.outcome.trim() : "";
    const eff = opt.effects && typeof opt.effects === "object" && !Array.isArray(opt.effects) ? (opt.effects as Record<string, unknown>) : {};
    const num = (k: string) => {
      const v = eff[k];
      return typeof v === "number" && Number.isFinite(v) ? v : Number(v);
    };
    const effects = {
      diplomacy: num("diplomacy") || 0,
      economy: num("economy") || 0,
      security: num("security") || 0,
      approval: num("approval") || 0,
    };
    if (!label || !outcome) return null;
    return { label, effects, outcome };
  };

  const rawOpts = Array.isArray(o.options) ? o.options : [];
  const options = rawOpts.map(mapOpt).filter(Boolean) as {
    label: string;
    effects: Record<string, number>;
    outcome: string;
  }[];
  if (options.length < 3) return null;

  return { title, description, imagePrompt, options: options.slice(0, 5) };
}

export const generateScenario = createServerFn({ method: "POST" })
  .inputValidator((input: { stats: Record<string, number>; previousDecisions: string[]; scenarioCount: number }) => {
    if (!input.stats || typeof input.scenarioCount !== "number") {
      throw new Error("Invalid input");
    }
    if (input.previousDecisions.length > 50) {
      throw new Error("Too many previous decisions");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return { scenario: null, error: "AI service not configured (set GEMINI_API_KEY)" };
    }

    try {
      const result = await geminiGenerateFromMessages({
        apiKey,
        responseMimeType: "application/json",
        messages: [
          {
            role: "system",
            content: `You are a presidential crisis scenario generator for a simulation game. Generate realistic, nuanced geopolitical scenarios. The player's current stats are: diplomacy=${data.stats.diplomacy}, economy=${data.stats.economy}, security=${data.stats.security}, approval=${data.stats.approval}.

Their previous decisions: ${data.previousDecisions.slice(-5).join("; ") || "None yet"}.
This is scenario #${data.scenarioCount + 1}.

IMPORTANT: Generate scenarios that REACT to and BUILD UPON previous decisions, creating branching storylines. If they made aggressive choices, show escalation consequences. If diplomatic, show relationship building.

Respond in this exact JSON format:
{
  "title": "short crisis title",
  "description": "2-3 sentence description of the crisis situation, referencing previous decisions if applicable",
  "imagePrompt": "One dense paragraph of visual art direction for a single cinematic editorial illustration: setting, key figures as silhouettes or generic officials (no real-world politician likenesses), mood, lighting, symbolic objects. No text or logos in the scene.",
  "options": [
    {
      "label": "short action label (5-8 words)",
      "effects": { "diplomacy": number(-25 to 25), "economy": number(-25 to 25), "security": number(-25 to 25), "approval": number(-25 to 25) },
      "outcome": "2-3 sentence outcome description"
    }
  ]
}

Generate exactly 3 options with different strategic approaches. Make effects realistic and balanced — no option should be clearly best. Consider the player's current stats when generating — if a stat is very low, create pressure around it.`,
          },
          {
            role: "user",
            content: `Generate scenario #${data.scenarioCount + 1} for the presidential simulation.`,
          },
        ],
      });

      if (!result.ok) {
        console.error(`AI API error: ${result.status} ${result.message}`);
        return { scenario: null, error: "Failed to generate scenario" };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonMarkdown(result.text));
      } catch {
        return { scenario: null, error: "Invalid JSON from model" };
      }
      const scenario = normalizeScenario(parsed);
      if (!scenario) {
        return { scenario: null, error: "Model response missing required scenario fields" };
      }
      return { scenario, error: null };
    } catch (error) {
      console.error("Scenario generation error:", error);
      return { scenario: null, error: "Failed to generate scenario" };
    }
  });

export const generateOutcome = createServerFn({ method: "POST" })
  .inputValidator((input: { scenario: string; choice: string; stats: Record<string, number> }) => {
    if (!input.scenario || !input.choice) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return { followUp: null };

    try {
      const result = await geminiGenerateFromMessages({
        apiKey,
        messages: [
          {
            role: "system",
            content:
              "You are a presidential simulation narrator. Given a scenario and the player's choice, generate a brief (1-2 sentence) teaser about what consequences may follow in the next scenario. Be dramatic and foreboding.",
          },
          {
            role: "user",
            content: `Scenario: ${data.scenario}\nChoice: ${data.choice}\nCurrent stats: ${JSON.stringify(data.stats)}`,
          },
        ],
      });

      if (!result.ok) return { followUp: null };
      return { followUp: result.text || null };
    } catch {
      return { followUp: null };
    }
  });

export const generateScenarioIllustrations = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; description: string; imagePrompt?: string }) => {
    if (!input.title?.trim() || !input.description?.trim()) throw new Error("Invalid input");
    if (input.title.length > 200 || input.description.length > 4000) throw new Error("Input too long");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return { imageDataUrls: [] as string[], error: "AI service not configured (set GEMINI_API_KEY)" };
    }
    const visual =
      data.imagePrompt?.trim() ||
      `Crisis scene for a head-of-state simulation: ${data.title}. ${data.description}`;
    const prompt = [
      "Create editorial illustration still(s), painterly or print-news style.",
      "No readable text, no logos, no flags with legible detail, no real-world politician or celebrity likenesses.",
      "If you output multiple images, make each a different camera angle or moment of the same crisis (up to 3).",
      "Subject and composition:",
      visual.slice(0, 1200),
    ].join(" ");

    const result = await geminiGenerateImage({ apiKey, prompt });
    if (!result.ok) {
      console.error(`Scenario image API error: ${result.status} ${result.message}`);
      return { imageDataUrls: [] as string[], error: result.message };
    }
    return { imageDataUrls: result.dataUrls, error: null as string | null };
  });
