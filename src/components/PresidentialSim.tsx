import { useState, useEffect, useRef } from "react";
import { Shield, Zap, Heart, DollarSign, Loader as Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateScenario,
  generateOutcome,
  generateScenarioIllustrations,
} from "@/functions/presidential.functions";
import AdvisorPanel from "@/components/sim/AdvisorPanel";
import NewsPanel from "@/components/sim/NewsPanel";
import DecisionPreview from "@/components/sim/DecisionPreview";
import TimelineLog, { type TimelineEntry } from "@/components/sim/TimelineLog";

type Scenario = {
  title: string;
  description: string;
  imagePrompt?: string;
  options: {
    label: string;
    effects: Record<string, number>;
    outcome: string;
    preview?: Record<string, number>;
  }[];
};

const STORAGE_KEY = "gp-presidential-sim-v2";

function loadState() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveState(state: {
  stats: Record<string, number>;
  decisions: string[];
  scenarioCount: number;
  timeline: TimelineEntry[];
  worldEvents: string[];
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STAT_CONFIG = [
  { key: "diplomacy", label: "Diplomacy", icon: Heart, color: "bg-primary", barColor: "bg-primary" },
  { key: "economy", label: "Economy", icon: DollarSign, color: "bg-gold", barColor: "bg-gold" },
  { key: "security", label: "Security", icon: Shield, color: "bg-olive-dark", barColor: "bg-olive-dark" },
  { key: "approval", label: "Approval", icon: Zap, color: "bg-accent", barColor: "bg-accent" },
] as const;

export default function PresidentialSim() {
  const saved = loadState();

  const [stats, setStats] = useState<Record<string, number>>(
    saved?.stats ?? { diplomacy: 50, economy: 50, security: 50, approval: 50 }
  );
  const [decisions, setDecisions] = useState<string[]>(saved?.decisions ?? []);
  const [scenarioCount, setScenarioCount] = useState<number>(saved?.scenarioCount ?? 0);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(saved?.timeline ?? []);
  const [worldEvents, setWorldEvents] = useState<string[]>(saved?.worldEvents ?? []);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [newsHeadline, setNewsHeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"ai" | "fallback" | null>(null);
  const [illustrations, setIllustrations] = useState<string[]>([]);
  const [illustLoading, setIllustLoading] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const [newsFeedTrigger, setNewsFeedTrigger] = useState(0);
  const [pendingChoice, setPendingChoice] = useState<Scenario["options"][0] | null>(null);

  const genScenarioFn = useServerFn(generateScenario);
  const genOutcomeFn = useServerFn(generateOutcome);
  const genIllustrationsFn = useServerFn(generateScenarioIllustrations);

  const illustCancelRef = useRef<boolean>(false);

  useEffect(() => {
    saveState({ stats, decisions, scenarioCount, timeline, worldEvents });
  }, [stats, decisions, scenarioCount, timeline, worldEvents]);

  useEffect(() => {
    if (!scenario) {
      setIllustrations([]);
      setIllustLoading(false);
      return;
    }
    illustCancelRef.current = false;
    setIllustrations([]);
    setIllustLoading(true);
    genIllustrationsFn({
      data: {
        title: scenario.title,
        description: scenario.description,
        imagePrompt: scenario.imagePrompt,
      },
    })
      .then((res) => {
        if (!illustCancelRef.current && res.imageDataUrls?.length) {
          setIllustrations(res.imageDataUrls);
        }
      })
      .catch(() => {
        if (!illustCancelRef.current) setIllustrations([]);
      })
      .finally(() => {
        if (!illustCancelRef.current) setIllustLoading(false);
      });
    return () => {
      illustCancelRef.current = true;
    };
  }, [scenario, genIllustrationsFn]);

  const loadScenario = async () => {
    setLoading(true);
    setOutcome(null);
    setFollowUp(null);
    setNewsHeadline(null);
    setHoveredOption(null);
    setPendingChoice(null);

    try {
      const result = await genScenarioFn({
        data: {
          stats,
          previousDecisions: decisions,
          scenarioCount,
          worldEvents: worldEvents.slice(-5),
        },
      });
      if (result.scenario) {
        setScenario(result.scenario);
        setDataSource(result.source === "ai" ? "ai" : "fallback");
      }
    } catch {
      setScenario(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (option: Scenario["options"][0]) => {
    if (!scenario) return;
    setPendingChoice(option);

    const prevStats = { ...stats };
    const newStats = {
      diplomacy: Math.max(0, Math.min(100, stats.diplomacy + (option.effects.diplomacy || 0))),
      economy: Math.max(0, Math.min(100, stats.economy + (option.effects.economy || 0))),
      security: Math.max(0, Math.min(100, stats.security + (option.effects.security || 0))),
      approval: Math.max(0, Math.min(100, stats.approval + (option.effects.approval || 0))),
    };

    setStats(newStats);
    setOutcome(option.outcome);

    const decisionText = `${scenario.title}: ${option.label}`;
    const newDecisions = [...decisions, decisionText];
    setDecisions(newDecisions);
    setScenarioCount((c) => c + 1);

    const statChanges: Record<string, number> = {};
    for (const key of Object.keys(option.effects)) {
      statChanges[key] = newStats[key as keyof typeof newStats] - prevStats[key as keyof typeof prevStats];
    }

    let headlineText: string | null = null;
    let followUpText: string | null = null;

    try {
      const outcomeResult = await genOutcomeFn({
        data: {
          scenario: scenario.description,
          choice: option.label,
          stats: prevStats,
          decisionHistory: newDecisions.slice(-5),
        },
      });
      followUpText = outcomeResult.followUp ?? null;
      headlineText = outcomeResult.newsHeadline ?? null;
      setFollowUp(followUpText);
      setNewsHeadline(headlineText);
    } catch { /* ignore */ }

    const entry: TimelineEntry = {
      id: Date.now(),
      scenarioTitle: scenario.title,
      decision: option.label,
      outcome: option.outcome,
      newsHeadline: headlineText ?? undefined,
      statChanges,
      timestamp: formatTimestamp(),
    };

    setTimeline((prev) => [...prev, entry]);

    if (headlineText) {
      setWorldEvents((prev) => [...prev, headlineText as string].slice(-20));
    }

    setNewsFeedTrigger((n) => n + 1);
  };

  const next = () => {
    loadScenario();
  };

  const resetGame = () => {
    setStats({ diplomacy: 50, economy: 50, security: 50, approval: 50 });
    setDecisions([]);
    setScenarioCount(0);
    setTimeline([]);
    setWorldEvents([]);
    setNewsFeedTrigger(0);
    setOutcome(null);
    setFollowUp(null);
    setNewsHeadline(null);
    setPendingChoice(null);
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => loadScenario(), 100);
  };

  const gameOver = Object.values(stats).some((v) => v <= 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            Term: <span className="text-foreground font-semibold">{scenarioCount}</span> decisions
          </span>
          {dataSource === "ai" && (
            <span className="flex items-center gap-1 text-xs font-mono text-primary">
              <Sparkles className="w-3 h-3" /> AI Active
            </span>
          )}
        </div>
        <button
          onClick={resetGame}
          className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> New Term
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CONFIG.map((s) => {
          const val = stats[s.key];
          const critical = val <= 20;
          const projected =
            hoveredOption !== null && scenario
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    val + ((scenario.options[hoveredOption]?.preview ?? scenario.options[hoveredOption]?.effects)?.[s.key] || 0)
                  )
                )
              : null;

          return (
            <div
              key={s.key}
              className={`gp-card text-center transition-all duration-300 ${critical ? "ring-2 ring-destructive animate-pulse" : ""}`}
            >
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${critical ? "text-destructive" : "text-muted-foreground"}`} />
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
              <div className={`font-display text-2xl font-bold ${critical ? "text-destructive" : "text-foreground"}`}>
                {val}
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-1 relative overflow-hidden">
                <div
                  className={`${critical ? "bg-destructive" : s.barColor} h-1.5 rounded-full transition-all duration-500`}
                  style={{ width: `${val}%` }}
                />
                {projected !== null && projected !== val && (
                  <div
                    className={`absolute top-0 h-1.5 rounded-full opacity-40 transition-all duration-300 ${projected > val ? "bg-primary" : "bg-destructive"}`}
                    style={{
                      left: `${Math.min(val, projected)}%`,
                      width: `${Math.abs(projected - val)}%`,
                    }}
                  />
                )}
              </div>
              {projected !== null && projected !== val && (
                <div className={`text-xs font-mono mt-0.5 ${projected > val ? "text-primary" : "text-destructive"}`}>
                  {projected > val ? "+" : ""}{projected - val} → {projected}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="gp-card bg-destructive/10 border-destructive text-center py-8 space-y-3">
          <h3 className="font-display text-2xl font-black text-destructive">Government Collapsed</h3>
          <p className="text-sm text-foreground max-w-md mx-auto">
            Your administration has fallen after {scenarioCount} decisions. A critical pillar of governance hit zero.
          </p>
          <div className="flex flex-col items-center gap-2 mt-4">
            {timeline.length > 0 && (
              <p className="text-xs font-mono text-muted-foreground">Final decision: "{decisions[decisions.length - 1]}"</p>
            )}
            <button onClick={resetGame} className="gp-btn-primary">Begin New Term</button>
          </div>
        </div>
      )}

      {/* Scenario Panel */}
      {!gameOver && (
        <div className="gp-card">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="font-mono text-sm text-muted-foreground">Generating crisis scenario...</p>
              <p className="font-mono text-xs text-muted-foreground/60">AI is analyzing your term's trajectory</p>
            </div>
          ) : scenario ? (
            <div className="space-y-4">
              {/* Scenario Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="gp-badge">Crisis #{scenarioCount + 1}</span>
                    {dataSource === "ai" && (
                      <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        <Sparkles className="w-3 h-3" /> AI
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">{scenario.title}</h3>
                </div>
              </div>

              {/* Illustration */}
              {(illustLoading || illustrations.length > 0) && (
                <div className="rounded-lg overflow-hidden border border-border bg-muted">
                  {illustLoading && illustrations.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs font-mono text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rendering scene illustration...
                    </div>
                  ) : (
                    <div className={`grid gap-0 ${illustrations.length > 1 ? "grid-cols-2" : ""}`}>
                      {illustrations.map((src, i) => (
                        <img
                          key={`${i}-${src.slice(0, 30)}`}
                          src={src}
                          alt=""
                          className="w-full object-cover max-h-52"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-foreground leading-relaxed">{scenario.description}</p>

              {/* Options or Outcome */}
              {!outcome ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Choose your response:</p>
                  {scenario.options.map((opt, i) => (
                    <div key={i}>
                      <button
                        onClick={() => choose(opt)}
                        onMouseEnter={() => setHoveredOption(i)}
                        onMouseLeave={() => setHoveredOption(null)}
                        className="w-full text-left gp-btn-secondary text-sm transition-all duration-150 hover:border-primary/50"
                        disabled={!!pendingChoice}
                      >
                        <span className="font-semibold">{opt.label}</span>
                      </button>
                      {hoveredOption === i && (
                        <DecisionPreview option={opt} currentStats={stats} />
                      )}
                    </div>
                  ))}
                  {pendingChoice && (
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing decision...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-4 border border-border">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Outcome</div>
                    <p className="text-sm text-foreground leading-relaxed">{outcome}</p>
                    {followUp && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/50 pl-3 mt-3">
                        {followUp}
                      </p>
                    )}
                    {newsHeadline && (
                      <div className="mt-3 p-2 rounded bg-primary/5 border border-primary/20">
                        <span className="text-xs font-mono text-muted-foreground">WIRE SERVICE: </span>
                        <span className="text-xs font-semibold text-foreground">"{newsHeadline}"</span>
                      </div>
                    )}
                  </div>
                  <button onClick={next} className="gp-btn-primary w-full text-sm">
                    Next Scenario →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Failed to load scenario.</p>
              <button onClick={loadScenario} className="gp-btn-secondary text-xs">
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Advisor + News + Timeline panels */}
      <div className="space-y-3">
        <AdvisorPanel
          stats={stats}
          currentScenario={scenario?.description}
          decisionHistory={decisions}
        />
        <NewsPanel
          stats={stats}
          recentDecisions={decisions.slice(-5)}
          worldEvents={worldEvents}
          refreshTrigger={newsFeedTrigger}
        />
        <TimelineLog entries={timeline} />
      </div>
    </div>
  );
}
