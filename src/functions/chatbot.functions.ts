import { createServerFn } from "@tanstack/react-start";
import { geminiGenerateFromMessages, getGeminiApiKey } from "@/lib/gemini";

export const chatWithHarmony = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: { role: string; content: string }[] }) => {
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new Error("Messages array is required");
    }
    if (input.messages.length > 50) {
      throw new Error("Too many messages");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return { reply: "AI service is not configured. Please try again later." };
    }

    try {
      const result = await geminiGenerateFromMessages({
        apiKey,
        messages: [
          {
            role: "system",
            content: `You are the Global Pulse Harmony Chatbot — a diplomatic AI assistant specializing in global conflicts, peace initiatives, diplomacy, and international relations. You provide factual, balanced analysis. Keep responses concise (2-4 sentences). You can discuss:
- Active conflicts and their history
- Peace treaties and diplomatic efforts
- International organizations (UN, NATO, EU, AU, etc.)
- Humanitarian issues
- Geopolitical analysis
Always maintain a neutral, fact-based tone. If asked about something outside your scope, politely redirect to global harmony topics.`,
          },
          ...data.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
      });

      if (!result.ok) {
        console.error(`AI API error: ${result.status} ${result.message}`);
        return { reply: "I'm having trouble connecting right now. Please try again." };
      }

      return { reply: result.text || "I couldn't generate a response." };
    } catch (error) {
      console.error("Chatbot error:", error);
      return { reply: "An error occurred. Please try again." };
    }
  });
