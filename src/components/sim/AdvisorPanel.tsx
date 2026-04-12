import { useState, useRef, useEffect } from "react";
import { Send, Brain, Loader as Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAdvisorSuggestion } from "@/functions/presidential.functions";

type Message = { role: "user" | "advisor"; text: string };

type Props = {
  stats: Record<string, number>;
  currentScenario?: string;
  decisionHistory: string[];
};

const QUICK_QUESTIONS = [
  "What is my biggest vulnerability right now?",
  "Should I focus on diplomacy or security?",
  "What are the long-term risks if I keep declining?",
  "How do my recent decisions affect the next crisis?",
];

export default function AdvisorPanel({ stats, currentScenario, decisionHistory }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "advisor", text: "Chief Advisor standing by. I have full situational awareness of your term. Ask me anything — strategic assessments, scenario analysis, or political risk forecasting." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const advisorFn = useServerFn(getAdvisorSuggestion);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", text: question };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await advisorFn({
        data: { question, stats, currentScenario, decisionHistory },
      });
      setMessages((p) => [...p, { role: "advisor", text: result.advice }]);
    } catch {
      setMessages((p) => [...p, { role: "advisor", text: "I'm experiencing technical difficulties. Please try again shortly." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">Chief Advisor</span>
          <span className="text-xs font-mono text-muted-foreground bg-primary/15 text-primary px-2 py-0.5 rounded-full">AI-Powered</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-3 space-y-3">
          <div ref={scrollRef} className="h-48 overflow-y-auto space-y-2 text-sm pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  {m.role === "advisor" && (
                    <div className="flex items-center gap-1 mb-1">
                      <Brain className="w-3 h-3 text-primary" />
                      <span className="font-mono text-xs text-muted-foreground">ADVISOR</span>
                    </div>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg border border-border">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={loading}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full hover:bg-khaki transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t border-border pt-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask your advisor..."
              className="flex-1 bg-muted px-3 py-2 rounded-md text-xs outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            <button
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-olive-dark transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
