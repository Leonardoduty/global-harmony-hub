import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, Loader2, ChevronDown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithHarmony } from "@/functions/chatbot.functions";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };
type AdvisorType = "General" | "Diplomatic Advisor" | "Economic Advisor" | "Military Advisor";

const ADVISORS: { value: AdvisorType; label: string; color: string; icon: string }[] = [
  { value: "General", label: "Harmony AI", color: "text-primary", icon: "🌐" },
  { value: "Diplomatic Advisor", label: "Diplomatic Advisor", color: "text-blue-400", icon: "🕊️" },
  { value: "Economic Advisor", label: "Economic Advisor", color: "text-amber-400", icon: "📊" },
  { value: "Military Advisor", label: "Military Advisor", color: "text-red-400", icon: "🛡️" },
];

const WELCOME: Record<AdvisorType, string> = {
  "General": "Welcome to **Global Pulse**. I'm your diplomatic AI assistant. Ask me about global conflicts, peace initiatives, or international relations.",
  "Diplomatic Advisor": "As your **Diplomatic Advisor**, I'm here to guide you through treaty negotiations, alliance frameworks, and multilateral diplomacy. What situation requires our attention?",
  "Economic Advisor": "Your **Economic Advisor** reporting. I can brief you on trade relationships, sanctions regimes, market stability, and the economic consequences of geopolitical decisions.",
  "Military Advisor": "**Military Advisor** standing by. I provide frank strategic assessments on defense postures, deterrence, and force deployment options. What's the situation?",
};

const SUGGESTIONS: Record<AdvisorType, string[]> = {
  "General": ["What conflicts are active right now?", "Explain the UN's role in peacekeeping.", "What is the Geneva Convention?"],
  "Diplomatic Advisor": ["How do I negotiate a ceasefire?", "What leverage do we have in this dispute?", "What are our alliance obligations?"],
  "Economic Advisor": ["What are the effects of sanctions?", "How stable is global trade right now?", "What's our economic exposure to this conflict?"],
  "Military Advisor": ["What's the current threat level?", "How do we deter escalation?", "What are our defensive options?"],
};

export default function HarmonyChatbot() {
  const [open, setOpen] = useState(false);
  const [advisor, setAdvisor] = useState<AdvisorType>("General");
  const [showAdvisorMenu, setShowAdvisorMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME["General"] },
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

  const switchAdvisor = (a: AdvisorType) => {
    setAdvisor(a);
    setShowAdvisorMenu(false);
    setMessages([{ role: "assistant", content: WELCOME[a] }]);
  };

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
          advisor,
        },
      });
      setMessages((p) => [...p, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const currentAdvisor = ADVISORS.find((a) => a.value === advisor) ?? ADVISORS[0];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full p-4 shadow-xl hover:bg-primary/90 transition-all duration-200 hover:scale-110"
        title="Open AI Advisor"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{currentAdvisor.icon}</span>
          <div className="min-w-0">
            <p className={`font-semibold text-sm leading-tight truncate ${currentAdvisor.color}`}>
              {currentAdvisor.label}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">GLOBAL PULSE INTEL</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Advisor switcher */}
          <div className="relative">
            <button
              onClick={() => setShowAdvisorMenu((v) => !v)}
              className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              Switch <ChevronDown className="w-3 h-3" />
            </button>
            {showAdvisorMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-48 bg-popover border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                {ADVISORS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => switchAdvisor(a.value)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors ${advisor === a.value ? "bg-muted/50" : ""}`}
                  >
                    <span>{a.icon}</span>
                    <span className={a.color}>{a.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[380px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none leading-snug [&>p]:mb-1 [&>p:last-child]:mb-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {SUGGESTIONS[advisor].map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder={`Ask ${currentAdvisor.label}…`}
            className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-ring"
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="bg-primary text-primary-foreground rounded-lg p-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
