import { useState, useEffect, useCallback } from "react";
import { Newspaper, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import { engineGenerateHeadlines } from "@/lib/apiEngine";

type Headline = {
  headline: string;
  source: string;
  category: string;
  time: string;
};

type Props = {
  stats: Record<string, number>;
  recentDecisions: string[];
  worldEvents: string[];
  refreshTrigger?: number;
  /** Latest AI scene (e.g. last major decision) */
  leadImageUrl?: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  diplomacy: "text-primary bg-primary/10",
  military: "text-destructive bg-destructive/10",
  economy: "text-gold bg-gold/10",
  humanitarian: "text-olive bg-olive/10",
  domestic: "text-accent-foreground bg-accent/20",
  global: "text-muted-foreground bg-muted",
};

export default function NewsPanel({ stats, recentDecisions, worldEvents, refreshTrigger, leadImageUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"ai" | "mock" | null>(null);

  const fetchHeadlines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await engineGenerateHeadlines(recentDecisions);
      if (res.ok && res.data?.headlines) {
        setHeadlines(res.data.headlines);
        setDataSource(res.data.source === "ai" ? "ai" : "mock");
      } else throw new Error("No data");
    } catch {
      setHeadlines([
        { headline: "Global Stability Index Under Scrutiny As Tensions Rise", source: "Reuters", category: "global", time: "1h ago" },
        { headline: "International Community Monitors Regional Developments Closely", source: "AP News", category: "diplomacy", time: "3h ago" },
        { headline: "Economic Forecasters Divided On Near-Term Outlook", source: "Bloomberg", category: "economy", time: "5h ago" },
      ]);
      setDataSource("mock");
    } finally {
      setLoading(false);
    }
  }, [stats, recentDecisions, worldEvents]);

  useEffect(() => {
    if (open && headlines.length === 0) {
      fetchHeadlines();
    }
  }, [open, headlines.length, fetchHeadlines]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && open) {
      fetchHeadlines();
    }
  }, [refreshTrigger, open, fetchHeadlines]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">Global Wire</span>
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
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Live Feed</span>
            <button
              onClick={fetchHeadlines}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-primary hover:text-olive-dark transition-colors disabled:opacity-50"
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
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-md bg-muted h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {headlines.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-snug">{item.headline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">{item.source}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground font-mono">{item.time}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wide ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.global}`}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
