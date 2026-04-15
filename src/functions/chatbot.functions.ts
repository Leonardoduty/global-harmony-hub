import { createServerFn } from "@tanstack/react-start";
import { openAIChat } from "@/lib/openai";
import { getWorldStateSnapshot } from "@/lib/worldState";

type AdvisorType = "Diplomatic Advisor" | "Economic Advisor" | "Military Advisor" | "General";

const ADVISOR_PROMPTS: Record<AdvisorType, string> = {
  "Diplomatic Advisor": `You are a senior Diplomatic Advisor with 30 years of UN and foreign ministry experience. You specialize in international law, treaty negotiation, and conflict mediation. Your advice prioritizes dialogue, multilateral frameworks, and soft power. You cite real precedents from diplomatic history.`,

  "Economic Advisor": `You are a Chief Economic Advisor and former IMF economist. You analyze global markets, trade relationships, sanctions regimes, and economic warfare. Your advice focuses on financial stability, trade leverage, and economic consequences of geopolitical decisions. You use data-driven analysis.`,

  "Military Advisor": `You are a retired Joint Chiefs-level Military Advisor with expertise in defense strategy, deterrence theory, and conflict escalation dynamics. You provide frank assessments of military capabilities, risk thresholds, and the consequences of force deployment. You prioritize mission clarity and exit strategies.`,

  "General": `You are the Global Pulse Harmony AI — a diplomatic intelligence assistant specializing in global conflicts, geopolitics, and international relations. You provide factual, balanced analysis with historical context. You maintain a neutral, authoritative tone.`,
};

export const chatWithHarmony = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      messages: { role: string; content: string }[];
      advisor?: string;
    }) => {
      if (!Array.isArray(input.messages) || input.messages.length === 0) {
        throw new Error("Messages array is required");
      }
      if (input.messages.length > 50) throw new Error("Too many messages");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const advisor = (data.advisor as AdvisorType) ?? "General";
    const advisorPrompt = ADVISOR_PROMPTS[advisor] ?? ADVISOR_PROMPTS["General"];
    const worldContext = getWorldStateSnapshot();

    const result = await openAIChat({
      temperature: 0.75,
      messages: [
        {
          role: "system",
          content: `${advisorPrompt}

${worldContext}

Keep responses concise (2-4 sentences) but insightful. Reference the current world state when relevant. If asked something outside geopolitics and international affairs, politely redirect back to your area of expertise.`,
        },
        ...data.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    if (!result.ok) {
      return { reply: "I'm having trouble connecting right now. Please try again.", confidence: 0 };
    }

    return {
      reply: result.text || "I couldn't generate a response.",
      advisor,
      confidence: 0.92,
    };
  });
