import { createServerFn } from "@tanstack/react-start";
import { callAI, callAIImage } from "./ai.server";

export const generateScenario = createServerFn({ method: "POST" })
  .inputValidator((input: { stats: Record<string, number>; previousDecisions: string[]; scenarioCount: number; countryName?: string }) => {
    if (!input.stats || typeof input.scenarioCount !== "number") {
      throw new Error("Invalid input");
    }
    if (input.previousDecisions.length > 50) {
      throw new Error("Too many previous decisions");
    }
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callAI({
        systemPrompt: `You are a presidential crisis scenario generator for an immersive geopolitical simulation game. Generate realistic, nuanced scenarios. The player leads ${data.countryName || "a major nation"}.

Current stats: diplomacy=${data.stats.diplomacy}, economy=${data.stats.economy}, security=${data.stats.security}, approval=${data.stats.approval}, military=${data.stats.military || 50}, international_relations=${data.stats.international_relations || 50}.

Previous decisions: ${data.previousDecisions.slice(-8).join("; ") || "None yet"}.
This is scenario #${data.scenarioCount + 1}.

CRITICAL RULES:
- Generate scenarios that REACT to and BUILD UPON previous decisions
- Include dialogue from advisors, foreign leaders, or citizens as quotes
- Create escalating consequences and branching storylines
- If a stat is critically low (<20), create urgent crises around it
- Include unexpected global events (disasters, assassinations, economic crashes, pandemics)
- Mix war/peace/politics/economics/social issues

Respond in this exact JSON format:
{
  "title": "crisis title",
  "description": "3-4 sentence vivid description with advisor dialogue in quotes",
  "category": "military|diplomatic|economic|social|environmental|political",
  "urgency": "critical|high|medium",
  "advisorQuote": {"name": "Advisor Name", "role": "role", "quote": "their advice"},
  "options": [
    {
      "label": "action label (5-8 words)",
      "effects": { "diplomacy": number(-30 to 30), "economy": number(-30 to 30), "security": number(-30 to 30), "approval": number(-30 to 30), "military": number(-30 to 30), "international_relations": number(-30 to 30) },
      "predictedEffects": { "diplomacy": number(-30 to 30), "economy": number(-30 to 30), "security": number(-30 to 30), "approval": number(-30 to 30), "military": number(-30 to 30), "international_relations": number(-30 to 30) },
      "outcome": "3-4 sentence dramatic outcome with consequences",
      "newsHeadline": "Breaking news headline about this decision"
    }
  ],
  "imagePrompt": "a short prompt for generating an illustration of this crisis scene (political, no violence)"
}

Generate exactly 3 options with different strategic approaches. predictedEffects should be close to but slightly different from actual effects for realism.`,
        userPrompt: `Generate scenario #${data.scenarioCount + 1} for the presidential simulation.`,
        jsonMode: true,
        temperature: 0.9,
      });

      const scenario = JSON.parse(content);

      // Try to generate an image for the scenario
      let scenarioImage: string | null = null;
      if (scenario.imagePrompt) {
        scenarioImage = await callAIImage(
          `Editorial illustration, political news style: ${scenario.imagePrompt}. Dark moody tones, professional news media aesthetic.`
        );
      }

      return { scenario: { ...scenario, image: scenarioImage }, error: null };
    } catch (error) {
      console.error("Scenario generation error:", error);
      return { scenario: null, error: "Failed to generate scenario" };
    }
  });

export const generateOutcome = createServerFn({ method: "POST" })
  .inputValidator((input: { scenario: string; choice: string; stats: Record<string, number>; newsHeadline?: string }) => {
    if (!input.scenario || !input.choice) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const reply = await callAI({
        systemPrompt: "You are a presidential simulation narrator. Given a scenario and the player's choice, generate a dramatic 2-3 sentence teaser about consequences that will unfold. Be foreboding and cinematic. Also suggest what a news ticker might say.",
        userPrompt: `Scenario: ${data.scenario}\nChoice: ${data.choice}\nCurrent stats: ${JSON.stringify(data.stats)}`,
      });
      return { followUp: reply };
    } catch {
      return { followUp: null };
    }
  });

export const askAdvisor = createServerFn({ method: "POST" })
  .inputValidator((input: { question: string; stats: Record<string, number>; countryName: string; previousDecisions: string[]; currentScenario?: string }) => {
    if (!input.question || input.question.length > 1000) throw new Error("Invalid question");
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const reply = await callAI({
        systemPrompt: `You are the Chief Strategic Advisor to the President of ${data.countryName}. You provide expert geopolitical advice based on current state:

Stats: diplomacy=${data.stats.diplomacy}, economy=${data.stats.economy}, security=${data.stats.security}, approval=${data.stats.approval}, military=${data.stats.military}, international_relations=${data.stats.international_relations}.

Recent decisions: ${data.previousDecisions.slice(-5).join("; ") || "None yet"}.
${data.currentScenario ? `Current crisis: ${data.currentScenario}` : ""}

Give strategic, actionable advice in 2-4 sentences. Be specific to the current situation. Warn about risks.`,
        userPrompt: data.question,
        temperature: 0.7,
      });
      return { reply, error: null };
    } catch (error) {
      console.error("Advisor error:", error);
      return { reply: "I'm unable to provide advice at this time. Trust your instincts, Mr./Madam President.", error: "Failed" };
    }
  });
