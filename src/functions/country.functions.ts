import { createServerFn } from "@tanstack/react-start";

export const getCountryInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string }) => {
    if (!input.countryName || input.countryName.length > 100) {
      throw new Error("Invalid country name");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { info: null, error: "AI service not configured" };
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
              content: `You are a geopolitical analyst. When given a country name, provide a concise analysis in this exact JSON format:
{
  "name": "country name",
  "conflicts": [
    { "name": "conflict name", "status": "active|resolved|frozen", "years": "e.g. 2022-present", "description": "1 sentence" }
  ],
  "peaceInitiatives": [
    { "name": "initiative name", "year": "year", "description": "1 sentence" }
  ],
  "history": [
    { "year": "year or period", "event": "brief historical event relevant to conflict/peace" }
  ],
  "stabilityScore": number (0-100),
  "summary": "2-3 sentence geopolitical summary"
}

Include 2-5 items per category. Focus on real, factual data. For conflicts, include both internal and external. For peace, include treaties, agreements, and diplomatic efforts. History should cover key events from the last 50+ years relevant to the country's conflict/peace profile.`,
            },
            {
              role: "user",
              content: `Provide geopolitical analysis for: ${data.countryName}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.error(`Country info API error: ${res.status}`);
        return { info: null, error: "Failed to fetch country info" };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) return { info: null, error: "Empty response" };

      const info = JSON.parse(content);
      return { info, error: null };
    } catch (error) {
      console.error("Country info error:", error);
      return { info: null, error: "Failed to analyze country" };
    }
  });
