import { createServerFn } from "@tanstack/react-start";
import { callAI } from "./ai.server";

export const factCheckStatement = createServerFn({ method: "POST" })
  .inputValidator((input: { statement: string }) => {
    if (!input.statement || input.statement.length > 2000) throw new Error("Invalid statement");
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callAI({
        systemPrompt: `You are a professional fact-checker. Analyze the given statement and respond in this exact JSON format:
{
  "verdict": "TRUE|FALSE|PARTIALLY TRUE|UNVERIFIABLE",
  "confidence": number(0-100),
  "explanation": "2-3 sentence explanation",
  "sources": ["list of relevant source types or organizations"],
  "context": "1 sentence additional context"
}

Be thorough and balanced in your analysis.`,
        userPrompt: `Fact-check this statement: "${data.statement}"`,
        jsonMode: true,
        temperature: 0.3,
      });

      const result = JSON.parse(content);
      return { result, error: null };
    } catch (error) {
      console.error("Fact check error:", error);
      return { result: null, error: "Failed to analyze statement" };
    }
  });
