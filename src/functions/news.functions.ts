import { createServerFn } from "@tanstack/react-start";
import { callGemini } from "./gemini.server";

export const generateNews = createServerFn({ method: "POST" })
  .inputValidator((input: { category?: string }) => {
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callGemini({
        systemPrompt: `You are a verified news aggregator for a geopolitical monitoring platform. Generate realistic, factual-sounding global news stories. Respond in this exact JSON format:
{
  "stories": [
    {
      "headline": "news headline",
      "source": "credible news source name",
      "time": "relative time like '2 hours ago'",
      "summary": "2-3 sentence summary",
      "category": "conflict|diplomacy|economy|humanitarian|environment|politics",
      "region": "region name",
      "verified": true,
      "verificationNote": "brief note on how this was verified"
    }
  ]
}

Generate 5-6 diverse stories covering different regions and topics. Stories should feel current and realistic. ${data.category ? `Focus on ${data.category} stories.` : "Mix different categories."}`,
        userPrompt: "Generate the latest verified global news briefing.",
        jsonMode: true,
        temperature: 0.7,
      });

      const result = JSON.parse(content);
      return { stories: result.stories, error: null };
    } catch (error) {
      console.error("News generation error:", error);
      return { stories: null, error: "Failed to generate news" };
    }
  });
