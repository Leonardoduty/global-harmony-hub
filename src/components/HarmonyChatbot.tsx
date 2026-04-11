import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithHarmony } from "@/functions/chatbot.functions";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "What conflicts are active right now?",
  "Explain the UN's role in peacekeeping.",
  "What is the Geneva Convention?",
];

export default function HarmonyChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to **Global Pulse**. I'm your diplomatic AI assistant. Ask me about global conflicts, peace initiatives, or international relations." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatFn = useServerFn(chatWithHarmony);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await chatFn({
        data: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages((p) => [...p, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
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
        <span className="font-display font-bold text-sm">Harmony AI Chatbot</span>
        <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
      </div>
      <div ref={scrollRef} className="h-72 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted px-3 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
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
          placeholder="Ask about global affairs..."
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
        />
        <button onClick={() => send(input)} disabled={loading} className="px-3 text-primary hover:text-olive-dark disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
