import { useEffect, useState } from "react";
import { CheckCircle, Clock, Shield, RefreshCw, AlertCircle } from "lucide-react";
import { engineGenerateHeadlines, type HeadlineItem } from "@/lib/apiEngine";
import { motion, AnimatePresence } from "framer-motion";

export default function NewsShield() {
  const [headlines, setHeadlines] = useState<HeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadHeadlines(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await engineGenerateHeadlines();
      if (res.ok && res.data?.headlines?.length) {
        setHeadlines(res.data.headlines);
      } else {
        setError(res.error ?? "Failed to load headlines.");
      }
    } catch {
      setError("Network error loading headlines.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHeadlines();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">AI-generated live world headlines</span>
        <button
          onClick={() => loadHeadlines(true)}
          disabled={refreshing || loading}
          className="ml-auto flex items-center gap-1 font-mono text-[10px] text-primary/60 hover:text-primary transition-colors disabled:opacity-40"
          title="Refresh headlines"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="font-mono text-xs text-muted-foreground">Generating live intelligence headlines...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-red-400 font-mono"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {!loading && headlines.map((item, i) => {
          const credColor = item.credibility >= 80 ? "#22c55e" : item.credibility >= 60 ? "#facc15" : "#ef4444";
          return (
            <motion.div
              key={item.headline}
              className="gp-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.07 }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: credColor }} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm font-bold mb-1 text-foreground leading-snug">{item.headline}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono flex-wrap">
                    <span>{item.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{item.time}
                    </span>
                    <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: `${credColor}18`, color: credColor, border: `1px solid ${credColor}33` }}>
                      {item.category}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: credColor }}>
                      {item.credibility}% credibility
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
