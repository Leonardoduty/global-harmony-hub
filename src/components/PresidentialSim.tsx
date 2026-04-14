import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, Zap, Heart, DollarSign, Loader2, RotateCcw, Swords, Globe2,
  MessageSquareQuote, Newspaper, ChevronRight, Crown, MapPin, Flag,
  Send, TrendingUp, TrendingDown, Minus, Clock, MessageCircle
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateScenario, generateOutcome, askAdvisor } from "@/functions/presidential.functions";
import presidentImg from "@/assets/president-portrait.jpg";

type Scenario = {
  title: string;
  description: string;
  category?: string;
  urgency?: string;
  advisorQuote?: { name: string; role: string; quote: string };
  options: { label: string; effects: Record<string, number>; predictedEffects?: Record<string, number>; outcome: string; newsHeadline?: string }[];
  image?: string | null;
};

type HistoryEntry = {
  title: string;
  choice: string;
  outcome: string;
  headline?: string;
  statChanges: Record<string, number>;
  image?: string | null;
  turn: number;
};

const STORAGE_KEY = "gp-presidential-sim";

const COUNTRIES = [
  { name: "United States", flag: "🇺🇸", difficulty: "Medium" },
  { name: "China", flag: "🇨🇳", difficulty: "Hard" },
  { name: "India", flag: "🇮🇳", difficulty: "Medium" },
  { name: "Russia", flag: "🇷🇺", difficulty: "Hard" },
  { name: "Germany", flag: "🇩🇪", difficulty: "Easy" },
  { name: "Brazil", flag: "🇧🇷", difficulty: "Medium" },
  { name: "Japan", flag: "🇯🇵", difficulty: "Easy" },
  { name: "Nigeria", flag: "🇳🇬", difficulty: "Hard" },
  { name: "United Kingdom", flag: "🇬🇧", difficulty: "Easy" },
  { name: "France", flag: "🇫🇷", difficulty: "Medium" },
  { name: "South Korea", flag: "🇰🇷", difficulty: "Medium" },
  { name: "Israel", flag: "🇮🇱", difficulty: "Hard" },
];

function loadState() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveState(state: Record<string, unknown>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const fallbackScenarios: Scenario[] = [
  {
    title: "Border Crisis",
    description: "Neighboring country reports mass refugee displacement. 50,000 civilians are heading toward your border. \"We need action now,\" says your defense secretary.",
    category: "humanitarian", urgency: "critical",
    advisorQuote: { name: "Gen. Morrison", role: "Defense Secretary", quote: "We need a decision in the next 6 hours, or we lose control of the situation entirely." },
    options: [
      { label: "Open borders & provide humanitarian aid", effects: { diplomacy: 20, economy: -10, security: -5, approval: 15, military: 0, international_relations: 15 }, predictedEffects: { diplomacy: 18, economy: -8, security: -3, approval: 12, military: 0, international_relations: 12 }, outcome: "International praise pours in. However, opposition parties raise concerns about resource strain.", newsHeadline: "President Opens Borders: Humanitarian Triumph or National Risk?" },
      { label: "Deploy military to secure border", effects: { diplomacy: -15, economy: 5, security: 20, approval: -10, military: 10, international_relations: -15 }, predictedEffects: { diplomacy: -12, economy: 3, security: 18, approval: -8, military: 8, international_relations: -12 }, outcome: "Border is secured but international community condemns the action.", newsHeadline: "Military Deployed at Border: International Outcry Follows" },
      { label: "Negotiate bilateral processing centers", effects: { diplomacy: 15, economy: -5, security: 10, approval: 10, military: 0, international_relations: 10 }, predictedEffects: { diplomacy: 12, economy: -3, security: 8, approval: 8, military: 0, international_relations: 8 }, outcome: "Bilateral talks begin. A shared processing center is established.", newsHeadline: "Historic Agreement: Joint Processing Centers Established" },
    ],
  },
];

const statConfig = [
  { key: "diplomacy", label: "Diplomacy", icon: Heart, color: "bg-primary" },
  { key: "economy", label: "Economy", icon: DollarSign, color: "bg-gold" },
  { key: "security", label: "Security", icon: Shield, color: "bg-olive-dark" },
  { key: "approval", label: "Approval", icon: Zap, color: "bg-accent" },
  { key: "military", label: "Military", icon: Swords, color: "bg-destructive" },
  { key: "international_relations", label: "Int'l Relations", icon: Globe2, color: "bg-primary" },
] as const;

const urgencyColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-gold/15 text-gold border-gold/30",
  medium: "bg-primary/15 text-primary border-primary/30",
};

const difficultyColors: Record<string, string> = {
  Easy: "text-primary", Medium: "text-gold", Hard: "text-destructive",
};

/* ─── Country Selection ─── */
function CountrySelect({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <img src={presidentImg} alt="Presidential office" className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary shadow-lg" width={512} height={640} />
        <Crown className="w-8 h-8 mx-auto text-gold" />
        <h2 className="font-display text-2xl font-black tracking-wide">Choose Your Nation</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Select the country you will lead as President. Each nation presents unique challenges.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {COUNTRIES.map((c) => (
          <button key={c.name} onClick={() => onSelect(c.name)} className="gp-card text-left group hover:ring-2 hover:ring-primary transition-all">
            <div className="text-3xl mb-2">{c.flag}</div>
            <div className="font-display font-bold text-sm">{c.name}</div>
            <div className={`text-xs font-mono ${difficultyColors[c.difficulty]}`}>{c.difficulty}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Stats Dashboard ─── */
function StatsDashboard({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statConfig.map((s) => (
        <div key={s.key} className={`gp-card text-center ${stats[s.key] <= 20 ? "ring-2 ring-destructive animate-pulse" : ""}`}>
          <s.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="font-mono text-[10px] text-muted-foreground uppercase">{s.label}</div>
          <div className="font-display text-xl font-bold">{stats[s.key]}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div className={`${stats[s.key] <= 20 ? "bg-destructive" : s.color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${stats[s.key]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Advisor Speech Bubble ─── */
function AdvisorBubble({ quote }: { quote: { name: string; role: string; quote: string } }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <MessageSquareQuote className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="relative bg-muted rounded-xl rounded-tl-none px-4 py-3">
          <div className="absolute -left-2 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-muted" />
          <p className="text-sm italic text-foreground leading-relaxed">"{quote.quote}"</p>
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-1.5 ml-1">
          — {quote.name}, {quote.role}
        </p>
      </div>
    </div>
  );
}

/* ─── Decision Impact Preview ─── */
function ImpactPreview({ effects }: { effects: Record<string, number> }) {
  return (
    <div className="bg-muted/50 rounded-md p-3 mt-2 space-y-1">
      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Predicted Impact</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {statConfig.map((s) => {
          const val = effects[s.key] || 0;
          if (val === 0) return null;
          return (
            <div key={s.key} className="flex items-center gap-1 text-xs">
              {val > 0 ? <TrendingUp className="w-3 h-3 text-primary" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
              <span className="text-muted-foreground">{s.label}</span>
              <span className={`font-mono font-bold ${val > 0 ? "text-primary" : "text-destructive"}`}>{val > 0 ? "+" : ""}{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Advisor Chat Panel ─── */
function AdvisorChat({ stats, countryName, decisions, currentScenario }: {
  stats: Record<string, number>; countryName: string; decisions: string[]; currentScenario?: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "advisor"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askFn = useServerFn(askAdvisor);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const ask = async () => {
    if (!question.trim() || loading) return;
    const q = question;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const result = await askFn({ data: { question: q, stats, countryName, previousDecisions: decisions, currentScenario } });
      setMessages((m) => [...m, { role: "advisor", content: result.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "advisor", content: "I'm unable to advise right now, Mr./Madam President." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="gp-btn-secondary text-xs flex items-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5" /> Ask Advisor
      </button>
    );
  }

  return (
    <div className="gp-card p-0 overflow-hidden">
      <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-display font-bold">Strategic Advisor</span>
        <button onClick={() => setOpen(false)} className="text-xs font-mono hover:opacity-70">✕</button>
      </div>
      <div ref={scrollRef} className="h-40 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-4">Ask your advisor anything about the current situation...</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs ${m.role === "user" ? "text-right" : ""}`}>
            <span className={`inline-block px-3 py-1.5 rounded-lg max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground italic">Advisor is thinking...</div>}
      </div>
      <div className="flex border-t border-border">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="What if we...?"
          className="flex-1 px-3 py-2 text-xs bg-transparent outline-none"
        />
        <button onClick={ask} disabled={loading} className="px-3 text-primary hover:text-olive-dark disabled:opacity-50">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Scenario Card ─── */
function ScenarioCard({
  scenario, scenarioCount, outcome, chosenHeadline, followUp, onChoose, onNext, hoveredOption,
  setHoveredOption,
}: {
  scenario: Scenario; scenarioCount: number;
  outcome: string | null; chosenHeadline: string | null; followUp: string | null;
  onChoose: (opt: Scenario["options"][0]) => void; onNext: () => void;
  hoveredOption: number | null; setHoveredOption: (i: number | null) => void;
}) {
  return (
    <div className="gp-card p-0 overflow-hidden">
      {/* Scenario Image */}
      {scenario.image && (
        <img src={scenario.image} alt={scenario.title} className="w-full h-56 md:h-72 object-cover" loading="lazy" />
      )}

      <div className="p-5 space-y-4">
        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="gp-badge">Scenario {scenarioCount + 1}</span>
          {scenario.category && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{scenario.category}</span>
          )}
          {scenario.urgency && (
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${urgencyColors[scenario.urgency] || ""}`}>
              {scenario.urgency.toUpperCase()}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono">AI Generated</span>
        </div>

        <h3 className="font-display text-xl font-bold">{scenario.title}</h3>
        <p className="text-sm text-foreground leading-relaxed">{scenario.description}</p>

        {/* Advisor Speech Bubble */}
        {scenario.advisorQuote && <AdvisorBubble quote={scenario.advisorQuote} />}

        {/* Options or Outcome */}
        {!outcome ? (
          <div className="space-y-2">
            {scenario.options.map((opt, i) => (
              <div key={i}>
                <button
                  onClick={() => onChoose(opt)}
                  onMouseEnter={() => setHoveredOption(i)}
                  onMouseLeave={() => setHoveredOption(null)}
                  className="w-full text-left gp-btn-secondary text-sm group flex items-center justify-between"
                >
                  <span className="font-bold">{opt.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                {/* Impact preview on hover */}
                {hoveredOption === i && opt.predictedEffects && <ImpactPreview effects={opt.predictedEffects} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted rounded-md p-4 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{outcome}</p>
            {chosenHeadline && (
              <div className="flex items-center gap-2 bg-background rounded-md p-2 border border-border">
                <Newspaper className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs font-mono text-foreground">{chosenHeadline}</span>
              </div>
            )}
            {followUp && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-3">{followUp}</p>
            )}
            <button onClick={onNext} className="gp-btn-primary text-sm">Next Scenario →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── History Timeline ─── */
function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <details className="gp-card">
      <summary className="font-display font-bold text-sm cursor-pointer flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" /> Event Timeline ({history.length})
      </summary>
      <div className="mt-4 relative pl-6">
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
        {history.map((entry, i) => (
          <div key={i} className="relative mb-4">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary border-2 border-card flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-card" />
            </div>
            <div className="bg-muted/50 rounded-md p-3">
              {entry.image && (
                <img src={entry.image} alt={entry.title} className="w-full h-24 object-cover rounded-md mb-2" loading="lazy" />
              )}
              <div className="flex items-center gap-2 mb-1 text-xs font-mono text-muted-foreground">
                <span>Turn {entry.turn}</span>
                {entry.headline && <span className="text-destructive">• {entry.headline}</span>}
              </div>
              <h4 className="font-display font-bold text-sm">{entry.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Choice: {entry.choice}</p>
              <p className="text-xs text-foreground mt-1">{entry.outcome}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(entry.statChanges).map(([key, val]) => {
                  if (val === 0) return null;
                  return (
                    <span key={key} className={`text-[10px] font-mono ${val > 0 ? "text-primary" : "text-destructive"}`}>
                      {key}: {val > 0 ? "+" : ""}{val}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/* ─── Main Component ─── */
export default function PresidentialSim() {
  const saved = loadState();
  const [countryName, setCountryName] = useState<string | null>(saved?.countryName ?? null);
  const [stats, setStats] = useState<Record<string, number>>(
    saved?.stats ?? { diplomacy: 50, economy: 50, security: 50, approval: 50, military: 50, international_relations: 50 }
  );
  const [decisions, setDecisions] = useState<string[]>(saved?.decisions ?? []);
  const [scenarioCount, setScenarioCount] = useState(saved?.scenarioCount ?? 0);
  const [newsHeadlines, setNewsHeadlines] = useState<string[]>(saved?.newsHeadlines ?? []);
  const [history, setHistory] = useState<HistoryEntry[]>(saved?.history ?? []);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chosenHeadline, setChosenHeadline] = useState<string | null>(null);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);

  const genScenarioFn = useServerFn(generateScenario);
  const genOutcomeFn = useServerFn(generateOutcome);

  useEffect(() => {
    if (countryName) saveState({ stats, decisions, scenarioCount, newsHeadlines, countryName, history });
  }, [stats, decisions, scenarioCount, newsHeadlines, countryName, history]);

  const loadScenario = useCallback(async () => {
    setLoading(true); setOutcome(null); setFollowUp(null); setChosenHeadline(null); setHoveredOption(null);
    try {
      const result = await genScenarioFn({ data: { stats, previousDecisions: decisions, scenarioCount, countryName: countryName || undefined } });
      if (result.scenario) { setScenario(result.scenario); setLoading(false); return; }
    } catch { console.log("AI scenario gen failed, using fallback"); }
    setScenario(fallbackScenarios[scenarioCount % fallbackScenarios.length]);
    setLoading(false);
  }, [genScenarioFn, stats, decisions, scenarioCount, countryName]);

  useEffect(() => {
    if (countryName && !scenario && !loading) loadScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryName]);

  const choose = async (option: Scenario["options"][0]) => {
    const newStats: Record<string, number> = {};
    const statChanges: Record<string, number> = {};
    for (const key of Object.keys(stats)) {
      const change = option.effects[key] || 0;
      newStats[key] = Math.max(0, Math.min(100, stats[key] + change));
      statChanges[key] = change;
    }
    setStats(newStats); setOutcome(option.outcome);
    if (option.newsHeadline) { setChosenHeadline(option.newsHeadline); setNewsHeadlines((h) => [option.newsHeadline!, ...h].slice(0, 20)); }
    setDecisions((d) => [...d, `${scenario?.title}: ${option.label}`]);

    // Add to history timeline
    setHistory((h) => [...h, {
      title: scenario?.title || "Decision",
      choice: option.label,
      outcome: option.outcome,
      headline: option.newsHeadline || undefined,
      statChanges,
      image: scenario?.image || undefined,
      turn: scenarioCount + 1,
    }]);

    setScenarioCount((c: number) => c + 1);
    if (scenario) {
      try { const result = await genOutcomeFn({ data: { scenario: scenario.description, choice: option.label, stats: newStats, newsHeadline: option.newsHeadline } }); if (result.followUp) setFollowUp(result.followUp); } catch { /* ignore */ }
    }
  };

  const resetGame = () => {
    setStats({ diplomacy: 50, economy: 50, security: 50, approval: 50, military: 50, international_relations: 50 });
    setDecisions([]); setScenarioCount(0); setNewsHeadlines([]); setHistory([]); setCountryName(null); setScenario(null); setOutcome(null); setFollowUp(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const gameOver = Object.values(stats).some((v) => v <= 0);

  if (!countryName) return <CountrySelect onSelect={setCountryName} />;

  const selectedFlag = COUNTRIES.find((c) => c.name === countryName)?.flag || "🏳️";

  return (
    <div className="space-y-6">
      {/* Country Badge + Leader */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <img src={presidentImg} alt="President" className="w-12 h-12 rounded-full object-cover border-2 border-primary" width={512} height={640} />
          <div>
            <div className="font-display font-bold text-sm flex items-center gap-1.5">
              <span className="text-lg">{selectedFlag}</span>
              <MapPin className="w-3 h-3 text-muted-foreground" />
              {countryName}
            </div>
            <div className="text-xs font-mono text-muted-foreground">Term: {scenarioCount} decisions</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdvisorChat stats={stats} countryName={countryName} decisions={decisions} currentScenario={scenario?.description} />
          <button onClick={resetGame} className="flex items-center gap-1 text-xs font-mono text-destructive hover:text-destructive/80">
            <RotateCcw className="w-3 h-3" /> New Game
          </button>
        </div>
      </div>

      <StatsDashboard stats={stats} />

      {/* News Ticker */}
      {newsHeadlines.length > 0 && (
        <div className="bg-muted rounded-md px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-destructive shrink-0" />
            <span className="font-mono text-xs text-destructive font-bold shrink-0">BREAKING:</span>
            <div className="text-xs font-mono text-foreground truncate">{newsHeadlines[0]}</div>
          </div>
          {newsHeadlines.length > 1 && (
            <details className="text-xs">
              <summary className="font-mono text-muted-foreground cursor-pointer">Previous headlines ({newsHeadlines.length - 1})</summary>
              <ul className="mt-1 space-y-0.5">
                {newsHeadlines.slice(1, 6).map((h, i) => (
                  <li key={i} className="font-mono text-muted-foreground pl-2 border-l border-border">{h}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="gp-card bg-destructive/10 border-destructive text-center space-y-3">
          <h3 className="font-display text-xl font-bold text-destructive">Impeached!</h3>
          <p className="text-sm text-foreground">Your presidency of {countryName} ended after {scenarioCount} decisions.</p>
          <button onClick={resetGame} className="gp-btn-primary">Start New Term</button>
        </div>
      )}

      {/* Scenario */}
      {!gameOver && (
        loading ? (
          <div className="gp-card flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="font-mono text-sm text-muted-foreground">Intelligence briefing incoming...</span>
          </div>
        ) : scenario ? (
          <ScenarioCard
            scenario={scenario} scenarioCount={scenarioCount} outcome={outcome}
            chosenHeadline={chosenHeadline} followUp={followUp} onChoose={choose}
            onNext={loadScenario} hoveredOption={hoveredOption} setHoveredOption={setHoveredOption}
          />
        ) : null
      )}

      {/* Event Timeline */}
      <HistoryTimeline history={history} />

      {/* Decision History (compact) */}
      {decisions.length > 0 && (
        <details className="gp-card">
          <summary className="font-display font-bold text-sm cursor-pointer flex items-center gap-2">
            <Flag className="w-4 h-4 text-muted-foreground" /> Decision Log ({decisions.length})
          </summary>
          <ul className="mt-3 space-y-1 text-xs font-mono text-muted-foreground">
            {decisions.map((d: string, i: number) => (
              <li key={i} className="pl-3 border-l-2 border-border">{i + 1}. {d}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
