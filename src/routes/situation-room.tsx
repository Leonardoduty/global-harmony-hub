import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Globe, Radio, ShieldAlert, ShieldCheck, ShieldQuestion, RefreshCw, Rss } from "lucide-react";
import CommunityStories from "@/components/CommunityStories";
import { engineGetWorldState, engineGenerateHeadlines, type HeadlineItem } from "@/lib/apiEngine";

type WorldState = {
  global_peace_index: number;
  war_risk_level: number;
  economic_stability: number;
  active_conflicts: string[];
  resolved_conflicts: string[];
  alliances: string[];
};

function useLiveWorldState() {
  const [state, setState] = useState<WorldState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const res = await engineGetWorldState();
        if (alive && res.ok && res.data?.state) {
          setState(res.data.state as WorldState);
        }
      } catch {}
      if (alive) setLoading(false);
      pending = false;
    }
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { state, loading };
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  "CONFIRMED":   { color: "text-green-400 border-green-400/40 bg-green-400/10",    icon: <ShieldCheck className="w-3 h-3" /> },
  "LIKELY TRUE": { color: "text-blue-400 border-blue-400/40 bg-blue-400/10",       icon: <ShieldCheck className="w-3 h-3" /> },
  "UNCERTAIN":   { color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10", icon: <ShieldQuestion className="w-3 h-3" /> },
  "DISPUTED":    { color: "text-orange-400 border-orange-400/40 bg-orange-400/10", icon: <ShieldAlert className="w-3 h-3" /> },
  "LIKELY FAKE": { color: "text-red-400 border-red-400/40 bg-red-400/10",          icon: <ShieldAlert className="w-3 h-3" /> },
};

const URGENCY_DOT: Record<string, string> = {
  "LOW": "#6b7280", "MEDIUM": "#facc15", "HIGH": "#f97316", "CRITICAL": "#ef4444",
};

function IntelligenceFeed() {
  const [items, setItems] = useState<HeadlineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pendingRef = { current: false };

  const fetch = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    try {
      const res = await engineGenerateHeadlines([]);
      if (res.ok && res.data?.headlines?.length) {
        setItems(res.data.headlines);
        setSource(res.data.source === "ai" ? "ai" : "fallback");
      } else throw new Error();
    } catch {
      setSource("fallback");
    } finally {
      setLoading(false);
      pendingRef.current = false;
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(8,8,20,0.9)", border: "1px solid rgba(96,165,250,0.15)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(96,165,250,0.1)" }}>
        <Rss className="w-4 h-4 text-blue-400" />
        <h2 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Live Intelligence Feed</h2>
        {source === "ai" && (
          <span className="ml-1 font-mono text-[9px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/30">AI-POWERED</span>
        )}
        <button
          onClick={fetch}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading && items.length === 0 ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
          </div>
        ) : items.length === 0 ? (
          <p className="font-mono text-xs text-white/30 text-center py-6">No intelligence data available.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG["UNCERTAIN"];
              const isOpen = expanded === i;
              const urgencyColor = URGENCY_DOT[item.urgency] ?? "#6b7280";
              return (
                <motion.div
                  key={i}
                  className="rounded-lg cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  whileHover={{ background: "rgba(255,255,255,0.055)" }}
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {item.status}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 uppercase">
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: urgencyColor }}>
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: urgencyColor }}
                          animate={{ opacity: item.urgency === "CRITICAL" ? [1, 0.3, 1] : 1 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        {item.urgency}
                      </span>
                    </div>
                    <p className="font-mono text-xs font-semibold text-white/90 leading-snug">{item.headline}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-white/35">{item.region}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] font-mono text-white/35">{item.source}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] font-mono text-white/35">{item.time}</span>
                      <span className="ml-auto flex items-center gap-3">
                        <span className="text-[10px] font-mono">
                          <span className="text-white/30">Cred </span>
                          <span className="text-green-400 font-bold">{item.credibility_score}</span>
                          <span className="text-white/20">/100</span>
                        </span>
                        <span className="text-[10px] font-mono">
                          <span className="text-white/30">Fake </span>
                          <span className="text-red-400 font-bold">{item.fake_risk}%</span>
                        </span>
                      </span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      {item.summary && (
                        <p className="text-xs text-white/50 leading-relaxed pt-2">{item.summary}</p>
                      )}
                      {item.key_signals?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5">Key Signals</p>
                          <ul className="space-y-1">
                            {item.key_signals.map((sig, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-[10px] font-mono text-white/45">
                                <span className="text-blue-400 shrink-0 mt-0.5">▸</span>
                                {sig}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-4 pt-1">
                        <span className="text-[10px] font-mono text-white/30">
                          Impact: <span className="text-white/60">{item.impact_level}</span>
                        </span>
                        <span className="text-[10px] font-mono text-white/30">
                          Urgency: <span style={{ color: urgencyColor }}>{item.urgency}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MetricBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color }} className="shrink-0">{icon}</span>
      <span className="font-mono text-xs text-white/50 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono text-xs font-bold w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export default function SituationRoomPage() {
  const { state, loading } = useLiveWorldState();

  const peaceIndex = state?.global_peace_index ?? 0;
  const warRisk = state?.war_risk_level ?? 0;
  const econStability = state?.economic_stability ?? 0;
  const activeConflicts = state?.active_conflicts ?? [];
  const resolvedConflicts = state?.resolved_conflicts ?? [];
  const alliances = state?.alliances ?? [];

  const statusColor = peaceIndex >= 70 ? "#22c55e" : peaceIndex >= 45 ? "#facc15" : "#ef4444";
  const statusLabel = peaceIndex >= 70 ? "STABLE" : peaceIndex >= 45 ? "ELEVATED TENSION" : "CRITICAL";

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: "#05050f" }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-mono text-3xl font-black text-white uppercase tracking-widest">Situation Room</h1>
          <p className="font-mono text-sm text-white/40 mt-1">Emergency briefings, live world state, and global harmony tracking.</p>
        </div>

        <motion.div
          className="rounded-xl p-5"
          style={{ background: "rgba(8,8,20,0.9)", border: `1px solid ${statusColor}33`, backdropFilter: "blur(12px)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: "#ef4444" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <h2 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Emergency Situation Briefing</h2>
            <span
              className="ml-auto font-mono text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}44` }}
            >
              {loading ? "LOADING..." : statusLabel}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-white/30 font-mono text-sm">
              <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
              Fetching live world state...
            </div>
          ) : (
            <>
              <p className="font-mono text-sm text-white/70 mb-5 leading-relaxed">
                Current global stability index:{" "}
                <strong style={{ color: statusColor }}>{peaceIndex}/100</strong>.{" "}
                {activeConflicts.length} active conflict{activeConflicts.length !== 1 ? "s" : ""} in progress.{" "}
                {resolvedConflicts.length > 0 && `${resolvedConflicts.length} conflict${resolvedConflicts.length !== 1 ? "s" : ""} resolved.`}
              </p>

              <div className="space-y-3 mb-5">
                <MetricBar label="Peace Index" value={peaceIndex} color={statusColor} icon={<Activity className="w-4 h-4" />} />
                <MetricBar label="War Risk" value={warRisk} color="#ef4444" icon={<AlertTriangle className="w-4 h-4" />} />
                <MetricBar label="Econ Stability" value={econStability} color="#60a5fa" icon={<Globe className="w-4 h-4" />} />
              </div>

              {activeConflicts.length > 0 && (
                <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="font-mono text-[10px] text-red-400/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Radio className="w-3 h-3" /> Active Conflicts
                  </p>
                  <div className="space-y-1">
                    {activeConflicts.map((c) => (
                      <div key={c} className="flex items-center gap-2">
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="font-mono text-xs text-white/60">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alliances.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {alliances.map((a) => (
                    <span
                      key={a}
                      className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(96,165,250,0.1)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.2)" }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        <IntelligenceFeed />

        <div>
          <h2 className="font-mono text-xl font-bold text-white mb-4 uppercase tracking-wider">Community Success Stories</h2>
          <CommunityStories />
        </div>
      </div>
    </div>
  );
}
