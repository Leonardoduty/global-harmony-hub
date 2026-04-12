import { createServerFn } from "@tanstack/react-start";
import { callGemini } from "./gemini.server";

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
    const conversationContext = data.messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    try {
      const reply = await callGemini({
        systemPrompt: `You are the Global Pulse Harmony Chatbot — a diplomatic AI assistant specializing in global conflicts, peace initiatives, diplomacy, and international relations. You provide factual, balanced analysis. Keep responses concise (2-4 sentences). You can discuss:
- Active conflicts and their history
- Peace treaties and diplomatic efforts
- International organizations (UN, NATO, EU, AU, etc.)
- Humanitarian issues and geopolitical analysis
Always maintain a neutral, fact-based tone. If asked about something outside your scope, politely redirect to global harmony topics.`,
        userPrompt: `Conversation so far:\n${conversationContext}\n\nRespond to the latest user message.`,
      });
      return { reply };
    } catch (error) {
      console.error("Chatbot error:", error);
      return { reply: "I'm having trouble connecting right now. Please try again." };
    }
  });
