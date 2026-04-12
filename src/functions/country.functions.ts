import { createServerFn } from "@tanstack/react-start";
import { callGemini } from "./gemini.server";

export const getCountryInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string }) => {
    if (!input.countryName || input.countryName.length > 100) {
      throw new Error("Invalid country name");
    }
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callGemini({
        systemPrompt: `You are a geopolitical analyst. When given a country name, provide a detailed analysis in this exact JSON format:
{
  "name": "country name",
  "conflicts": [
    { "name": "conflict name", "status": "active|resolved|frozen", "years": "e.g. 2022-present", "description": "1 sentence" }
  ],
  "peaceInitiatives": [
    { "name": "initiative name", "year": "year", "description": "1 sentence" }
  ],
  "history": [
    { "year": "year or period", "event": "brief historical event" }
  ],
  "alliances": ["list of major alliances and organizations"],
  "attributes": {
    "stability": number(0-100),
    "economicStrength": number(0-100),
    "militaryStrength": number(0-100),
    "diplomacyScore": number(0-100),
    "politicalFreedom": number(0-100)
  },
  "economicStatus": "growing|stable|declining|crisis",
  "politicalSystem": "description of government type",
  "stabilityScore": number(0-100),
  "summary": "2-3 sentence geopolitical summary"
}

Include 2-5 items per category. Focus on real, factual data.`,
        userPrompt: `Provide geopolitical analysis for: ${data.countryName}`,
        jsonMode: true,
      });

      const info = JSON.parse(content);
      return { info, error: null };
    } catch (error) {
      console.error("Country info error:", error);
      return { info: null, error: "Failed to analyze country" };
    }
  });
