import { createServerFn } from "@tanstack/react-start";

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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { scenario: null, error: "AI service not configured" };
    }

    try {
      const res = await fetch("https://ai-gateway.lovable.dev/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.error(`AI API error: ${res.status}`);
        return { scenario: null, error: "Failed to generate scenario" };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        return { scenario: null, error: "Empty response" };
      }

      const scenario = JSON.parse(content);
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { followUp: null };

    try {
      const res = await fetch("https://ai-gateway.lovable.dev/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a presidential simulation narrator. Given a scenario and the player's choice, generate a brief (1-2 sentence) teaser about what consequences may follow in the next scenario. Be dramatic and foreboding.",
            },
            {
              role: "user",
              content: `Scenario: ${data.scenario}\nChoice: ${data.choice}\nCurrent stats: ${JSON.stringify(data.stats)}`,
            },
          ],
        }),
      });

      if (!res.ok) return { followUp: null };
      const json = await res.json();
      return { followUp: json.choices?.[0]?.message?.content || null };
    } catch {
      return { followUp: null };
    }
  });
