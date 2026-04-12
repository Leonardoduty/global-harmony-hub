import { createServerFn } from "@tanstack/react-start";
import { callGemini } from "./gemini.server";

export const factCheckStatement = createServerFn({ method: "POST" })
  .inputValidator((input: { statement: string }) => {
    if (!input.statement || input.statement.length > 1000) {
      throw new Error("Invalid statement");
    }
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callGemini({
        systemPrompt: `You are an expert fact-checker. Analyze the given statement and determine its accuracy. Respond in this exact JSON format:
{
  "verdict": "true" | "false" | "misleading",
  "explanation": "3-4 sentence detailed explanation with evidence",
  "confidence": number(0-100),
  "sources": ["list of 2-3 credible source types that support your analysis"],
  "relatedClaims": ["1-2 related claims worth checking"]
}

Be thorough, factual, and cite the basis for your judgment.`,
        userPrompt: `Fact-check this statement: "${data.statement}"`,
        jsonMode: true,
        temperature: 0.3,
      });

      const result = JSON.parse(content);
      return { result, error: null };
    } catch (error) {
      console.error("Fact check error:", error);
      return { result: null, error: "Failed to fact-check" };
    }
  });
