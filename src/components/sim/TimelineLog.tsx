import { Clock, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

export type TimelineEntry = {
  id: number;
  scenarioTitle: string;
  decision: string;
  outcome: string;
  newsHeadline?: string;
  statChanges: Record<string, number>;
  timestamp: string;
  imageDataUrl?: string;
};

type Props = {
  entries: TimelineEntry[];
};

function StatChange({ statKey: k, value }: { statKey: string; value: number }) {
  if (value === 0) return null;
  const pos = value > 0;
  const labels: Record<string, string> = { diplomacy: "DIP", economy: "ECO", security: "SEC", approval: "APP" };
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono px-1 py-0.5 rounded ${pos ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
      {pos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {labels[k] ?? k} {pos ? "+" : ""}{value}
    </span>
  );
}

export default function TimelineLog({ entries }: Props) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">Decision Timeline</span>
          <span className="text-xs font-mono bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full">
            {entries.length}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-3">
          <div className="max-h-80 overflow-y-auto pr-1 space-y-0">
            {[...entries].reverse().map((entry, idx) => (
              <div key={entry.id} className="relative pl-6 pb-4 last:pb-0">
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                {idx < entries.length - 1 && (
                  <div className="absolute left-1.5 top-4 bottom-0 w-px bg-border" />
                )}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{entry.timestamp}</span>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{entry.scenarioTitle}</div>
                  <div className="text-sm font-medium text-foreground">{entry.decision}</div>
                  {entry.imageDataUrl && (
                    <div className="rounded-md overflow-hidden border border-border mt-2">
                      <img src={entry.imageDataUrl} alt="" className="w-full max-h-40 object-cover" />
                    </div>
                  )}
                  {entry.newsHeadline && (
                    <div className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                      "{entry.newsHeadline}"
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(entry.statChanges)
                      .filter(([, v]) => v !== 0)
                      .map(([k, v]) => (
                        <StatChange key={k} statKey={k} value={v} />
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
