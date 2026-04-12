import { useState, useEffect } from "react";
import { CheckCircle, Clock, Shield, Loader2, RefreshCw, Globe } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateNews } from "@/functions/news.functions";

type Story = {
  headline: string;
  source: string;
  time: string;
  summary: string;
  category: string;
  region: string;
  verified: boolean;
  verificationNote?: string;
};

const categoryColors: Record<string, string> = {
  conflict: "bg-destructive/15 text-destructive",
  diplomacy: "bg-primary/15 text-primary",
  economy: "bg-gold/15 text-gold",
  humanitarian: "bg-accent/15 text-accent-foreground",
  environment: "bg-primary/15 text-primary",
  politics: "bg-secondary text-secondary-foreground",
};

export default function NewsShield() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const newsFn = useServerFn(generateNews);

  const loadNews = async (category?: string) => {
    setLoading(true);
    try {
      const result = await newsFn({ data: { category: category || undefined } });
      if (result.stories) {
        setStories(result.stories);
      }
    } catch {
      console.error("Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = filter ? stories.filter((s) => s.category === filter) : stories;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">AI-Verified News Feed</span>
        </div>
        <button onClick={() => loadNews(filter || undefined)} disabled={loading} className="flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilter(null)} className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors ${!filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {["conflict", "diplomacy", "economy", "humanitarian", "politics"].map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`text-xs px-2.5 py-1 rounded-full font-mono capitalize transition-colors ${filter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="font-mono text-sm text-muted-foreground">Generating verified news briefing...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => (
            <div key={idx} className="gp-card">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono capitalize ${categoryColors[item.category] || "bg-muted text-muted-foreground"}`}>
                      {item.category}
                    </span>
                    {item.region && (
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {item.region}
                      </span>
                    )}
                  </div>
                  <h4 className="font-display text-sm font-bold mb-1">{item.headline}</h4>
                  <p className="text-sm text-foreground mb-2">{item.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    <span>{item.source}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                    <span className="gp-badge-verified gp-badge">VERIFIED</span>
                  </div>
                  {item.verificationNote && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{item.verificationNote}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
