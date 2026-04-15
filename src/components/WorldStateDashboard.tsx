import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Globe, Shield, TrendingUp, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { fetchWorldState } from "@/functions/world-state.functions";

type WorldState = {
  active_conflicts: string[];
  resolved_conflicts: string[];
  alliances: string[];
  global_peace_index: number;
  economic_stability: number;
  war_risk_level: number;
  world_events: string[];
  last_updated: string;
};

function StatBar({ value, label, icon: Icon, color }: { value: number; label: string; icon: React.ElementType; color: string }) {
  const barColor = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <motion.div
          className={`h-1.5 rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function WorldStateDashboard() {
  const [state, setState] = useState<WorldState | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const fetchFn = useServerFn(fetchWorldState);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchFn();
      setState(res.state);
      setLastRefresh(new Date());
    } catch (e) {
      console.warn("[WorldState]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60_000);
    const handler = () => load();
    if (typeof window !== "undefined") window.addEventListener("gp-sim-updated", handler);
    return () => {
      clearInterval(iv);
      if (typeof window !== "undefined") window.removeEventListener("gp-sim-updated", handler);
    };
  }, []);

  if (loading && !state) {
    return (
      <div className="gp-card flex items-center justify-center gap-2 py-8">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-mono">Loading world state...</span>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="gp-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">Global Intelligence State</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">LIVE</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Core metrics */}
      <div className="space-y-3">
        <StatBar value={state.global_peace_index} label="Global Peace Index" icon={Globe} color="text-primary" />
        <StatBar value={state.economic_stability} label="Economic Stability" icon={TrendingUp} color="text-amber-400" />
        <StatBar
          value={100 - state.war_risk_level}
          label="Security Index"
          icon={Shield}
          color="text-red-400"
        />
      </div>

      {/* War risk callout */}
      {state.war_risk_level > 60 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300 font-mono">HIGH WAR RISK — {state.war_risk_level}% escalation probability</span>
        </div>
      )}

      {/* Active conflicts */}
      <div>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
          Active Conflicts ({state.active_conflicts.length})
        </p>
        <div className="space-y-1">
          {state.active_conflicts.slice(0, 5).map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-xs text-foreground">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent world events */}
      {state.world_events.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3 h-3 text-primary" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Sim-Generated Events
            </p>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {[...state.world_events].reverse().slice(0, 6).map((ev, i) => (
              <p key={i} className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">{ev}</p>
            ))}
          </div>
        </div>
      )}

      {/* Alliances */}
      <div>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Active Alliances</p>
        <div className="flex flex-wrap gap-1">
          {state.alliances.map((a) => (
            <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              {a}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[9px] font-mono text-muted-foreground/50 text-right">
        Updated {lastRefresh.toLocaleTimeString()}
      </p>
    </div>
  );
}
