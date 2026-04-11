import { useState, useEffect } from "react";
import { Shield, Zap, Heart, DollarSign, Loader2, RotateCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateScenario, generateOutcome } from "@/functions/presidential.functions";

type Scenario = {
  title: string;
  description: string;
  options: { label: string; effects: Record<string, number>; outcome: string }[];
};

const STORAGE_KEY = "gp-presidential-sim";

function loadState() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveState(state: { stats: Record<string, number>; decisions: string[]; scenarioCount: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const fallbackScenarios: Scenario[] = [
  {
    title: "Border Crisis",
    description: "Neighboring country reports mass refugee displacement. 50,000 civilians are heading toward your border. Your advisors are divided.",
    options: [
      { label: "Open borders & provide aid", effects: { diplomacy: 20, economy: -10, security: -5, approval: 15 }, outcome: "International praise pours in. Humanitarian organizations laud your decision. However, opposition parties raise concerns about resource strain." },
      { label: "Deploy military to secure border", effects: { diplomacy: -15, economy: 5, security: 20, approval: -10 }, outcome: "Border is secured but international community condemns the action. Sanctions are threatened by the UN Human Rights Council." },
      { label: "Negotiate with neighbor for joint solution", effects: { diplomacy: 15, economy: -5, security: 10, approval: 10 }, outcome: "Bilateral talks begin. A shared processing center is established. Both nations share the burden while maintaining security." },
    ],
  },
  {
    title: "Cyber Attack on Infrastructure",
    description: "A sophisticated cyber attack has disabled power grids in three major cities. Intelligence suggests a state-sponsored actor is behind it.",
    options: [
      { label: "Launch retaliatory cyber operation", effects: { diplomacy: -20, economy: -5, security: 15, approval: 5 }, outcome: "Your cyber team successfully disrupts the attacker's infrastructure. However, escalation fears rise globally." },
      { label: "Engage in diplomatic channels", effects: { diplomacy: 15, economy: 0, security: -5, approval: -5 }, outcome: "Diplomatic talks begin but progress is slow. Critics accuse you of weakness while power remains out." },
      { label: "Declare state of emergency & rebuild", effects: { diplomacy: 5, economy: -15, security: 10, approval: 10 }, outcome: "Massive investment in cyber infrastructure begins. Grid is restored in 48 hours with improved defenses." },
    ],
  },
];

export default function PresidentialSim() {
  const saved = loadState();
  const [stats, setStats] = useState<Record<string, number>>(saved?.stats ?? { diplomacy: 50, economy: 50, security: 50, approval: 50 });
  const [decisions, setDecisions] = useState<string[]>(saved?.decisions ?? []);
  const [scenarioCount, setScenarioCount] = useState(saved?.scenarioCount ?? 0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const genScenarioFn = useServerFn(generateScenario);
  const genOutcomeFn = useServerFn(generateOutcome);

  useEffect(() => {
    saveState({ stats, decisions, scenarioCount });
  }, [stats, decisions, scenarioCount]);

  const loadScenario = async () => {
    setLoading(true);
    setOutcome(null);
    setFollowUp(null);

    if (aiEnabled) {
      try {
        const result = await genScenarioFn({
          data: { stats, previousDecisions: decisions, scenarioCount },
        });
        if (result.scenario) {
          setScenario(result.scenario);
          setLoading(false);
          return;
        }
      } catch {
        console.log("AI scenario gen failed, using fallback");
      }
    }

    // Fallback to static scenarios
    setScenario(fallbackScenarios[scenarioCount % fallbackScenarios.length]);
    setLoading(false);
  };

  useEffect(() => {
    loadScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (option: Scenario["options"][0]) => {
    setStats((prev) => ({
      diplomacy: Math.max(0, Math.min(100, prev.diplomacy + (option.effects.diplomacy || 0))),
      economy: Math.max(0, Math.min(100, prev.economy + (option.effects.economy || 0))),
      security: Math.max(0, Math.min(100, prev.security + (option.effects.security || 0))),
      approval: Math.max(0, Math.min(100, prev.approval + (option.effects.approval || 0))),
    }));
    setOutcome(option.outcome);
    setDecisions((d) => [...d, `${scenario?.title}: ${option.label}`]);
    setScenarioCount((c) => c + 1);

    // Get AI follow-up teaser
    if (aiEnabled && scenario) {
      try {
        const result = await genOutcomeFn({
          data: { scenario: scenario.description, choice: option.label, stats },
        });
        if (result.followUp) setFollowUp(result.followUp);
      } catch { /* ignore */ }
    }
  };

  const next = () => {
    loadScenario();
  };

  const resetGame = () => {
    setStats({ diplomacy: 50, economy: 50, security: 50, approval: 50 });
    setDecisions([]);
    setScenarioCount(0);
    localStorage.removeItem(STORAGE_KEY);
    loadScenario();
  };

  const gameOver = Object.values(stats).some((v) => v <= 0);

  const statConfig = [
    { key: "diplomacy", label: "Diplomacy", icon: Heart, color: "bg-primary" },
    { key: "economy", label: "Economy", icon: DollarSign, color: "bg-gold" },
    { key: "security", label: "Security", icon: Shield, color: "bg-olive-dark" },
    { key: "approval", label: "Approval", icon: Zap, color: "bg-accent" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="rounded" />
            AI Scenarios
          </label>
          <span className="text-xs font-mono text-muted-foreground">Term: {scenarioCount} decisions</span>
        </div>
        <button onClick={resetGame} className="flex items-center gap-1 text-xs font-mono text-destructive hover:text-destructive/80">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statConfig.map((s) => (
          <div key={s.key} className={`gp-card text-center ${stats[s.key] <= 20 ? "ring-2 ring-destructive" : ""}`}>
            <s.icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="font-mono text-xs text-muted-foreground uppercase">{s.label}</div>
            <div className="font-display text-2xl font-bold">{stats[s.key]}</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div
                className={`${stats[s.key] <= 20 ? "bg-destructive" : s.color} h-1.5 rounded-full transition-all duration-500`}
                style={{ width: `${stats[s.key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="gp-card bg-destructive/10 border-destructive text-center">
          <h3 className="font-display text-xl font-bold text-destructive mb-2">Impeached!</h3>
          <p className="text-sm text-foreground mb-3">Your presidency has ended after {scenarioCount} decisions. A critical stat hit zero.</p>
          <button onClick={resetGame} className="gp-btn-primary">Start New Term</button>
        </div>
      )}

      {/* Scenario */}
      {!gameOver && (
        <div className="gp-card">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="font-mono text-sm text-muted-foreground">Generating crisis scenario...</span>
            </div>
          ) : scenario ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="gp-badge">Scenario {scenarioCount + 1}</span>
                {aiEnabled && <span className="gp-badge-verified text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono">AI Generated</span>}
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{scenario.title}</h3>
              <p className="text-sm text-foreground mb-4">{scenario.description}</p>

              {!outcome ? (
                <div className="space-y-2">
                  {scenario.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => choose(opt)}
                      className="w-full text-left gp-btn-secondary text-sm"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-muted rounded-md p-4 space-y-3">
                  <p className="text-sm text-foreground">{outcome}</p>
                  {followUp && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-3">{followUp}</p>
                  )}
                  <button onClick={next} className="gp-btn-primary text-sm">Next Scenario →</button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Decision History */}
      {decisions.length > 0 && (
        <details className="gp-card">
          <summary className="font-display font-bold text-sm cursor-pointer">Decision History ({decisions.length})</summary>
          <ul className="mt-3 space-y-1 text-xs font-mono text-muted-foreground">
            {decisions.map((d, i) => (
              <li key={i} className="pl-3 border-l-2 border-border">{i + 1}. {d}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
