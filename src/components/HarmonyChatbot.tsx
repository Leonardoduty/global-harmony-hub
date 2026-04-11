import { useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = ["Find peace treaties for X", "Explain diplomacy options."];

export default function HarmonyChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to Global Pulse. How can I help you understand global harmony today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    // Simulated AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        default: "I can help you explore global conflict data, peace treaties, and diplomacy options. Ask me about any region or topic.",
      };
      setMessages((p) => [
        ...p,
        { role: "assistant", content: responses.default },
      ]);
      setLoading(false);
    }, 1200);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full p-4 shadow-xl hover:bg-olive-dark transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="gp-chatbot">
      <div className="flex items-center justify-between bg-primary text-primary-foreground px-4 py-3">
        <span className="font-display font-bold text-sm">Harmony Chatbot</span>
        <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
      </div>
      <div className="h-64 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-muted-foreground text-xs">Thinking...</div>}
      </div>
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {messages.length <= 1 && suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full hover:bg-khaki transition-colors">
            {s}
          </button>
        ))}
      </div>
      <div className="flex border-t border-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Type your question..."
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
        />
        <button onClick={() => send(input)} className="px-3 text-primary hover:text-olive-dark">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
