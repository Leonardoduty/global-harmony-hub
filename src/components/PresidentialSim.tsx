import { useState, useEffect, useCallback } from "react";
import {
  Shield, Zap, Heart, DollarSign, Loader2, RotateCcw, Swords, Globe2,
  MessageSquareQuote, Newspaper, ChevronRight, Crown, MapPin, Flag
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateScenario, generateOutcome } from "@/functions/presidential.functions";

type Scenario = {
  title: string;
  description: string;
  category?: string;
  urgency?: string;
  advisorQuote?: { name: string; role: string; quote: string };
  options: { label: string; effects: Record<string, number>; outcome: string; newsHeadline?: string }[];
  image?: string | null;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const fallbackScenarios: Scenario[] = [
  {
    title: "Border Crisis",
    description: "Neighboring country reports mass refugee displacement. 50,000 civilians are heading toward your border. Your Defense Minister warns: \"We don't have the capacity, Mr. President.\"",
    category: "humanitarian",
    urgency: "critical",
    advisorQuote: { name: "Gen. Morrison", role: "Defense Secretary", quote: "We need a decision in the next 6 hours, or we lose control of the situation entirely." },
    options: [
      { label: "Open borders & provide humanitarian aid", effects: { diplomacy: 20, economy: -10, security: -5, approval: 15, military: 0, international_relations: 15 }, outcome: "International praise pours in. Humanitarian organizations laud your decision. However, opposition parties raise concerns about resource strain.", newsHeadline: "President Opens Borders: Humanitarian Triumph or National Risk?" },
      { label: "Deploy military to secure border", effects: { diplomacy: -15, economy: 5, security: 20, approval: -10, military: 10, international_relations: -15 }, outcome: "Border is secured but international community condemns the action. Sanctions are threatened by the UN Human Rights Council.", newsHeadline: "Military Deployed at Border: International Outcry Follows" },
      { label: "Negotiate bilateral processing centers", effects: { diplomacy: 15, economy: -5, security: 10, approval: 10, military: 0, international_relations: 10 }, outcome: "Bilateral talks begin. A shared processing center is established. Both nations share the burden.", newsHeadline: "Historic Agreement: Joint Processing Centers Established" },
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
  Easy: "text-primary",
  Medium: "text-gold",
  Hard: "text-destructive",
};

/* ─── Country Selection Screen ─── */
function CountrySelect({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <Crown className="w-10 h-10 mx-auto text-gold" />
        <h2 className="font-display text-2xl font-black tracking-wide">Choose Your Nation</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Select the country you will lead as President. Each nation presents unique geopolitical challenges.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {COUNTRIES.map((c) => (
          <button
            key={c.name}
            onClick={() => onSelect(c.name)}
            className="gp-card text-left group hover:ring-2 hover:ring-primary transition-all"
          >
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
            <div
              className={`${stats[s.key] <= 20 ? "bg-destructive" : s.color} h-1.5 rounded-full transition-all duration-700`}
              style={{ width: `${stats[s.key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── News Ticker ─── */
function NewsTicker({ headlines }: { headlines: string[] }) {
  if (headlines.length === 0) return null;
  return (
    <div className="bg-muted rounded-md px-3 py-2 overflow-hidden">
      <div className="flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-destructive shrink-0" />
        <span className="font-mono text-xs text-destructive font-bold shrink-0">BREAKING:</span>
        <div className="text-xs font-mono text-foreground truncate">{headlines[0]}</div>
      </div>
      {headlines.length > 1 && (
        <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
          Earlier: {headlines[1]}
        </div>
      )}
    </div>
  );
}

/* ─── Scenario Card ─── */
function ScenarioCard({
  scenario,
  scenarioCount,
  outcome,
  chosenHeadline,
  followUp,
  onChoose,
  onNext,
}: {
  scenario: Scenario;
  scenarioCount: number;
  outcome: string | null;
  chosenHeadline: string | null;
  followUp: string | null;
  onChoose: (opt: Scenario["options"][0]) => void;
  onNext: () => void;
}) {
  return (
    <div className="gp-card space-y-4">
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

      {/* Scenario Image */}
      {scenario.image && (
        <div className="rounded-md overflow-hidden border border-border">
          <img src={scenario.image} alt={scenario.title} className="w-full h-52 object-cover" loading="lazy" />
        </div>
      )}

      <h3 className="font-display text-xl font-bold">{scenario.title}</h3>
      <p className="text-sm text-foreground leading-relaxed">{scenario.description}</p>

      {/* Advisor Quote */}
      {scenario.advisorQuote && (
        <div className="bg-muted/50 rounded-md p-3 border-l-4 border-primary">
          <div className="flex items-start gap-2">
            <MessageSquareQuote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm italic text-foreground">"{scenario.advisorQuote.quote}"</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">— {scenario.advisorQuote.name}, {scenario.advisorQuote.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Options or Outcome */}
      {!outcome ? (
        <div className="space-y-2">
          {scenario.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onChoose(opt)}
              className="w-full text-left gp-btn-secondary text-sm group flex items-center justify-between"
            >
              <span className="font-bold">{opt.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
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
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chosenHeadline, setChosenHeadline] = useState<string | null>(null);

  const genScenarioFn = useServerFn(generateScenario);
  const genOutcomeFn = useServerFn(generateOutcome);

  useEffect(() => {
    if (countryName) {
      saveState({ stats, decisions, scenarioCount, newsHeadlines, countryName });
    }
  }, [stats, decisions, scenarioCount, newsHeadlines, countryName]);

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setOutcome(null);
    setFollowUp(null);
    setChosenHeadline(null);

    try {
      const result = await genScenarioFn({
        data: { stats, previousDecisions: decisions, scenarioCount, countryName: countryName || undefined },
      });
      if (result.scenario) {
        setScenario(result.scenario);
        setLoading(false);
        return;
      }
    } catch {
      console.log("AI scenario gen failed, using fallback");
    }

    setScenario(fallbackScenarios[scenarioCount % fallbackScenarios.length]);
    setLoading(false);
  }, [genScenarioFn, stats, decisions, scenarioCount, countryName]);

  useEffect(() => {
    if (countryName && !scenario && !loading) {
      loadScenario();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryName]);

  const choose = async (option: Scenario["options"][0]) => {
    const newStats: Record<string, number> = {};
    for (const key of Object.keys(stats)) {
      newStats[key] = Math.max(0, Math.min(100, stats[key] + (option.effects[key] || 0)));
    }
    setStats(newStats);
    setOutcome(option.outcome);
    if (option.newsHeadline) {
      setChosenHeadline(option.newsHeadline);
      setNewsHeadlines((h) => [option.newsHeadline!, ...h].slice(0, 20));
    }
    setDecisions((d) => [...d, `${scenario?.title}: ${option.label}`]);
    setScenarioCount((c: number) => c + 1);

    if (scenario) {
      try {
        const result = await genOutcomeFn({
          data: { scenario: scenario.description, choice: option.label, stats: newStats, newsHeadline: option.newsHeadline },
        });
        if (result.followUp) setFollowUp(result.followUp);
      } catch { /* ignore */ }
    }
  };

  const resetGame = () => {
    setStats({ diplomacy: 50, economy: 50, security: 50, approval: 50, military: 50, international_relations: 50 });
    setDecisions([]);
    setScenarioCount(0);
    setNewsHeadlines([]);
    setCountryName(null);
    setScenario(null);
    setOutcome(null);
    setFollowUp(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const startCountry = (name: string) => {
    setCountryName(name);
  };

  const gameOver = Object.values(stats).some((v) => v <= 0);

  /* ─── Render ─── */

  // Country selection screen
  if (!countryName) {
    return <CountrySelect onSelect={startCountry} />;
  }

  const selectedFlag = COUNTRIES.find((c) => c.name === countryName)?.flag || "🏳️";

  return (
    <div className="space-y-6">
      {/* Country Badge + Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedFlag}</span>
          <div>
            <div className="font-display font-bold text-sm flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              {countryName}
            </div>
            <div className="text-xs font-mono text-muted-foreground">Term: {scenarioCount} decisions</div>
          </div>
        </div>
        <button onClick={resetGame} className="flex items-center gap-1 text-xs font-mono text-destructive hover:text-destructive/80">
          <RotateCcw className="w-3 h-3" /> New Game
        </button>
      </div>

      <StatsDashboard stats={stats} />
      <NewsTicker headlines={newsHeadlines} />

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
            scenario={scenario}
            scenarioCount={scenarioCount}
            outcome={outcome}
            chosenHeadline={chosenHeadline}
            followUp={followUp}
            onChoose={choose}
            onNext={loadScenario}
          />
        ) : null
      )}

      {/* Decision History */}
      {decisions.length > 0 && (
        <details className="gp-card">
          <summary className="font-display font-bold text-sm cursor-pointer flex items-center gap-2">
            <Flag className="w-4 h-4 text-muted-foreground" />
            Decision History ({decisions.length})
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
