import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Effects = {
  diplomacy: number;
  economy: number;
  security: number;
  approval: number;
};

type Option = {
  label: string;
  effects: Effects;
  preview?: Effects;
};

type Props = {
  option: Option;
  currentStats: Record<string, number>;
};

const STAT_LABELS: Record<string, string> = {
  diplomacy: "Diplomacy",
  economy: "Economy",
  security: "Security",
  approval: "Approval",
};

function StatDelta({ value, label }: { value: number; label: string }) {
  if (value === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" />
        <span className="font-mono">{label}</span>
        <span className="font-mono text-muted-foreground">±0</span>
      </div>
    );
  }
  const positive = value > 0;
  return (
    <div className={`flex items-center gap-1.5 text-xs ${positive ? "text-primary" : "text-destructive"}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="font-mono">{label}</span>
      <span className="font-mono font-semibold">{positive ? "+" : ""}{value}</span>
    </div>
  );
}

export default function DecisionPreview({ option, currentStats }: Props) {
  const effects = option.preview ?? option.effects;

  const nonZero = Object.entries(effects).filter(([, v]) => v !== 0);
  if (nonZero.length === 0) return null;

  const projectedStats = Object.fromEntries(
    Object.entries(currentStats).map(([k, v]) => [k, Math.max(0, Math.min(100, v + (effects[k as keyof Effects] || 0)))])
  );

  return (
    <div className="mt-2 p-2.5 rounded-md bg-muted/50 border border-border/60">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Predicted Impact</span>
        {option.preview && (
          <span className="text-xs font-mono text-muted-foreground italic ml-auto">(estimate)</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(effects).map(([key, value]) => (
          <StatDelta key={key} value={value} label={STAT_LABELS[key] ?? key} />
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-border/40">
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(projectedStats).map(([key, val]) => (
            <div key={key} className="flex-1 min-w-[60px]">
              <div className="text-xs font-mono text-muted-foreground mb-0.5">{STAT_LABELS[key]?.slice(0, 4)}</div>
              <div className="w-full bg-border rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    val <= 20 ? "bg-destructive" : val >= 70 ? "bg-primary" : "bg-gold"
                  }`}
                  style={{ width: `${val}%` }}
                />
              </div>
              <div className="text-xs font-mono text-foreground mt-0.5">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
