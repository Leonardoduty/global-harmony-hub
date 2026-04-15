import { useState, useEffect, useRef, useMemo } from "react";
import { Shield, Zap, Heart, DollarSign, Loader as Loader2, RotateCcw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "@/context/SimulationContext";
import { engineGenerateScenario, engineFinalizeDecision } from "@/lib/apiEngine";
import AdvisorPanel from "@/components/sim/AdvisorPanel";
import NewsPanel from "@/components/sim/NewsPanel";
import DecisionPreview from "@/components/sim/DecisionPreview";
import TimelineLog, { type TimelineEntry } from "@/components/sim/TimelineLog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { selectedCountry } = useSimulation();
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
  const [resolvingChoice, setResolvingChoice] = useState(false);
  const [confirmOption, setConfirmOption] = useState<Scenario["options"][0] | null>(null);
  const [outcomeImageUrl, setOutcomeImageUrl] = useState<string | null>(null);


  const latestEventImage = useMemo(() => {
    for (let i = timeline.length - 1; i >= 0; i--) {
      const u = timeline[i]?.imageDataUrl;
      if (u) return u;
    }
    return null;
  }, [timeline]);

  const illustCancelRef = useRef<boolean>(false);

  useEffect(() => {
    saveState({ stats, decisions, scenarioCount, timeline, worldEvents });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gp-sim-updated"));
    }
  }, [stats, decisions, scenarioCount, timeline, worldEvents]);

  useEffect(() => {
    if (!scenario) {
      setIllustrations([]);
      setIllustLoading(false);
      return;
    }
    illustCancelRef.current = false;
    setIllustrations([]);
    setIllustLoading(false);
    return () => {
      illustCancelRef.current = true;
    };
  }, [scenario]);

  const loadScenario = async () => {
    setLoading(true);
    setOutcome(null);
    setFollowUp(null);
    setNewsHeadline(null);
    setHoveredOption(null);
    setResolvingChoice(false);
    setConfirmOption(null);
    setOutcomeImageUrl(null);

    try {
      const res = await engineGenerateScenario({
        stats,
        previousDecisions: decisions,
        scenarioCount,
        worldEvents: worldEvents.slice(-5),
        country: selectedCountry?.name,
      });
      if (res.ok && res.data?.scenario) {
        setScenario(res.data.scenario as Scenario);
        setDataSource(res.data.source === "ai" ? "ai" : "fallback");
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

  const confirmChoice = async (option: Scenario["options"][0]) => {
    if (!scenario || resolvingChoice) return;
    setConfirmOption(null);
    setResolvingChoice(true);

    const prevStats = { ...stats };
    const decisionText = `${scenario.title}: ${option.label}`;
    const newDecisions = [...decisions, decisionText];

    const preview = option.preview ?? option.effects;
    let headlineText: string | null = null;
    let followUpText: string | null = null;
    let narrative = option.outcome;
    let applied = { ...option.effects };

    try {
      const res = await engineFinalizeDecision({
        scenarioTitle: scenario.title,
        scenarioDescription: scenario.description,
        choiceLabel: option.label,
        suggestedOutcome: option.outcome,
        previewEffects: preview,
        stats: prevStats,
        decisionHistory: newDecisions.slice(-8),
      });
      if (res.ok && res.data) {
        applied = res.data.appliedEffects ?? applied;
        narrative = res.data.narrativeOutcome || option.outcome;
        followUpText = res.data.followUp ?? null;
        headlineText = res.data.newsHeadline ?? null;
      }
    } catch (e) {
      console.error("[PresidentialSim] finalizeDecision failed:", e);
    }

    const newStats = {
      diplomacy: Math.max(0, Math.min(100, prevStats.diplomacy + (applied.diplomacy || 0))),
      economy: Math.max(0, Math.min(100, prevStats.economy + (applied.economy || 0))),
      security: Math.max(0, Math.min(100, prevStats.security + (applied.security || 0))),
      approval: Math.max(0, Math.min(100, prevStats.approval + (applied.approval || 0))),
    };

    setStats(newStats);
    setOutcome(narrative);
    setFollowUp(followUpText);
    setNewsHeadline(headlineText);

    setDecisions(newDecisions);
    setScenarioCount((c) => c + 1);

    const statChanges: Record<string, number> = {};
    for (const key of Object.keys(applied)) {
      statChanges[key] = newStats[key as keyof typeof newStats] - prevStats[key as keyof typeof prevStats];
    }

    const entryId = Date.now();
    const entry: TimelineEntry = {
      id: entryId,
      scenarioTitle: scenario.title,
      decision: option.label,
      outcome: narrative,
      newsHeadline: headlineText ?? undefined,
      statChanges,
      timestamp: formatTimestamp(),
    };

    setTimeline((prev) => [...prev, entry]);

    if (headlineText) {
      setWorldEvents((prev) => [...prev, headlineText as string].slice(-20));
    }

    setNewsFeedTrigger((n) => n + 1);
    setResolvingChoice(false);
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
    setConfirmOption(null);
    setOutcomeImageUrl(null);
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => loadScenario(), 100);
  };

  const gameOver = Object.values(stats).some((v) => v <= 0);

  return (
    <div className="space-y-6">
      <Dialog open={!!confirmOption} onOpenChange={(o) => !o && setConfirmOption(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirm decision</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Staff projections are estimates — consequences may shift once orders are executed.
            </p>
          </DialogHeader>
          {confirmOption && scenario && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{confirmOption.label}</p>
              <DecisionPreview option={confirmOption} currentStats={stats} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <button type="button" className="gp-btn-secondary text-sm" onClick={() => setConfirmOption(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="gp-btn-primary text-sm"
              disabled={!confirmOption || resolvingChoice}
              onClick={() => confirmOption && confirmChoice(confirmOption)}
            >
              {resolvingChoice ? "Executing…" : "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
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
            </motion.div>
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
        <motion.div
          className="gp-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
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
                      <AnimatePresence>
                      {illustrations.map((src, i) => (
                        <motion.img
                          key={`${i}-${src.slice(0, 30)}`}
                          src={src}
                          alt=""
                          className="w-full object-cover max-h-52"
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                        />
                      ))}
                      </AnimatePresence>
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
                        onClick={() => setConfirmOption(opt)}
                        onMouseEnter={() => setHoveredOption(i)}
                        onMouseLeave={() => setHoveredOption(null)}
                        className="w-full text-left gp-btn-secondary text-sm transition-all duration-150 hover:border-primary/50"
                        disabled={resolvingChoice}
                      >
                        <span className="font-semibold">{opt.label}</span>
                      </button>
                      {hoveredOption === i && (
                        <DecisionPreview option={opt} currentStats={stats} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-4 border border-border">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Outcome</div>
                    {outcomeImageUrl && (
                      <div className="rounded-md overflow-hidden border border-border mb-3">
                        <motion.img
                          src={outcomeImageUrl}
                          alt=""
                          className="w-full max-h-48 object-cover"
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                        />
                      </div>
                    )}
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
        </motion.div>
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
          leadImageUrl={latestEventImage ?? outcomeImageUrl}
        />
        <TimelineLog entries={timeline} />
      </div>
    </div>
  );
}
