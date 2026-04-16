import { useState, useEffect, useCallback } from "react";
import { Newspaper, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { engineGenerateHeadlines, type HeadlineItem } from "@/lib/apiEngine";

type Props = {
  stats: Record<string, number>;
  recentDecisions: string[];
  worldEvents: string[];
  refreshTrigger?: number;
  leadImageUrl?: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  diplomacy: "text-primary bg-primary/10",
  military: "text-destructive bg-destructive/10",
  economy: "text-amber-400 bg-amber-400/10",
  humanitarian: "text-green-400 bg-green-400/10",
  security: "text-orange-400 bg-orange-400/10",
  politics: "text-purple-400 bg-purple-400/10",
  disaster: "text-red-500 bg-red-500/10",
  global: "text-muted-foreground bg-muted",
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  "CONFIRMED":    { color: "text-green-400 border-green-400/40 bg-green-400/10",   icon: <ShieldCheck className="w-3 h-3" /> },
  "LIKELY TRUE":  { color: "text-blue-400 border-blue-400/40 bg-blue-400/10",      icon: <ShieldCheck className="w-3 h-3" /> },
  "UNCERTAIN":    { color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10", icon: <ShieldQuestion className="w-3 h-3" /> },
  "DISPUTED":     { color: "text-orange-400 border-orange-400/40 bg-orange-400/10", icon: <ShieldAlert className="w-3 h-3" /> },
  "LIKELY FAKE":  { color: "text-red-400 border-red-400/40 bg-red-400/10",          icon: <ShieldAlert className="w-3 h-3" /> },
};

const URGENCY_COLORS: Record<string, string> = {
  "LOW": "text-muted-foreground", "MEDIUM": "text-yellow-400",
  "HIGH": "text-orange-400", "CRITICAL": "text-red-400",
};

const FALLBACK_ITEMS: HeadlineItem[] = [
  {
    headline: "Global Stability Index Under Scrutiny As Tensions Rise",
    region: "Global", source: "Reuters", category: "global", time: "1h ago",
    summary: "Analysts monitoring multiple flashpoints report elevated tension indicators across several regions. No single trigger has been identified.",
    credibility_score: 78, fake_risk: 12, status: "LIKELY TRUE",
    impact_level: "MEDIUM", urgency: "MEDIUM", key_signals: ["Multiple wire services", "No official statement"],
  },
  {
    headline: "International Community Monitors Regional Developments Closely",
    region: "Eastern Europe", source: "AP", category: "diplomacy", time: "3h ago",
    summary: "Diplomatic observers are tracking developments following an unannounced military exercise near a disputed border. Statements from both governments are contradictory.",
    credibility_score: 65, fake_risk: 28, status: "UNCERTAIN",
    impact_level: "HIGH", urgency: "MEDIUM", key_signals: ["Conflicting government statements", "Satellite imagery unconfirmed"],
  },
  {
    headline: "Economic Forecasters Divided On Near-Term Outlook",
    region: "Global", source: "Bloomberg", category: "economy", time: "5h ago",
    summary: "Major financial institutions are publishing divergent GDP growth forecasts for the coming quarter. Trade disruptions are cited as the primary variable.",
    credibility_score: 82, fake_risk: 8, status: "CONFIRMED",
    impact_level: "MEDIUM", urgency: "LOW", key_signals: ["Published institutional reports", "Data-backed projections"],
  },
];

export default function NewsPanel({ stats, recentDecisions, worldEvents, refreshTrigger, leadImageUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [headlines, setHeadlines] = useState<HeadlineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"ai" | "mock" | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchHeadlines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await engineGenerateHeadlines(recentDecisions);
      if (res.ok && res.data?.headlines) {
        setHeadlines(res.data.headlines);
        setDataSource(res.data.source === "ai" ? "ai" : "mock");
      } else throw new Error("No data");
    } catch {
      setHeadlines(FALLBACK_ITEMS);
      setDataSource("mock");
    } finally {
      setLoading(false);
    }
  }, [stats, recentDecisions, worldEvents]);

  useEffect(() => {
    if (open && headlines.length === 0) fetchHeadlines();
  }, [open, headlines.length, fetchHeadlines]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && open) fetchHeadlines();
  }, [refreshTrigger, open, fetchHeadlines]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">Intelligence Wire</span>
          {headlines.length > 0 && (
            <span className="text-xs font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {headlines.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dataSource === "ai" ? (
            <Wifi className="w-3 h-3 text-primary" />
          ) : dataSource === "mock" ? (
            <WifiOff className="w-3 h-3 text-muted-foreground" />
          ) : null}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Live Intelligence Feed</span>
            <button
              onClick={fetchHeadlines}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {leadImageUrl && (
            <div className="rounded-md overflow-hidden border border-border mb-2">
              <img src={leadImageUrl} alt="" className="w-full max-h-36 object-cover" />
              <p className="text-[10px] font-mono text-muted-foreground px-2 py-1 bg-muted/50">Field visual — latest major event</p>
            </div>
          )}

          {loading && headlines.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-md bg-muted h-16" />)}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {headlines.map((item, i) => {
                const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG["UNCERTAIN"];
                const isOpen = expanded === i;
                return (
                  <div
                    key={i}
                    className="rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <div className="flex items-start gap-2 p-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {item.status}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.global}`}>
                            {item.category}
                          </span>
                          {item.urgency === "CRITICAL" || item.urgency === "HIGH" ? (
                            <span className={`text-[10px] font-mono font-bold ${URGENCY_COLORS[item.urgency]}`}>
                              ⚡ {item.urgency}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs font-semibold text-foreground leading-snug">{item.headline}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-mono">{item.region}</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.source}</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.time}</span>
                          <span className="ml-auto flex items-center gap-2">
                            <span className="text-[10px] font-mono text-green-400">
                              {item.credibility_score ?? "--"}<span className="text-muted-foreground">/100</span>
                            </span>
                            <span className="text-[10px] font-mono text-red-400">
                              Fake: {item.fake_risk ?? "--"}%
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border/50 mt-0 pt-2">
                        {item.summary && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                        )}
                        {item.key_signals?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Key Signals</p>
                            <ul className="space-y-0.5">
                              {item.key_signals.map((sig, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                  <span className="text-primary mt-0.5 shrink-0">▸</span>
                                  {sig}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Impact: <span className="text-foreground">{item.impact_level}</span>
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Urgency: <span className={URGENCY_COLORS[item.urgency]}>{item.urgency}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
