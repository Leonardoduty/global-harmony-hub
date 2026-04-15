import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Globe, Radio } from "lucide-react";
import CommunityStories from "@/components/CommunityStories";
import { engineGetWorldState } from "@/lib/apiEngine";

export const Route = createFileRoute("/situation-room")({
  head: () => ({
    meta: [
      { title: "Situation Room — Global Pulse" },
      { name: "description", content: "Emergency briefings and community success stories." },
    ],
  }),
  component: SituationRoomPage,
});

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
    async function load() {
      try {
        const res = await engineGetWorldState();
        if (alive && res.ok && res.data?.state) {
          setState(res.data.state as WorldState);
        }
      } catch {}
      if (alive) setLoading(false);
    }
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { state, loading };
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

function SituationRoomPage() {
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

        <div>
          <h2 className="font-mono text-xl font-bold text-white mb-4 uppercase tracking-wider">Community Success Stories</h2>
          <CommunityStories />
        </div>
      </div>
    </div>
  );
}
