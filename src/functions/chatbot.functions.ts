import { createServerFn } from "@tanstack/react-start";

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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { reply: "AI service is not configured. Please try again later." };
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
        }),
      });

      if (!res.ok) {
        console.error(`AI API error: ${res.status}`);
        return { reply: "I'm having trouble connecting right now. Please try again." };
      }

      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content || "I couldn't generate a response.";
      return { reply };
    } catch (error) {
      console.error("Chatbot error:", error);
      return { reply: "An error occurred. Please try again." };
    }
  });
