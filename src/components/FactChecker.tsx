import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Search, Loader2, ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { factCheckStatement } from "@/functions/factcheck.functions";

type Result = {
  verdict: "true" | "false" | "misleading";
  explanation: string;
  confidence: number;
  sources: string[];
  relatedClaims: string[];
} | null;

export default function FactChecker() {
  const [statement, setStatement] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [checking, setChecking] = useState(false);
  const checkFn = useServerFn(factCheckStatement);

  const check = async () => {
    if (!statement.trim() || checking) return;
    setChecking(true);
    setResult(null);

    try {
      const res = await checkFn({ data: { statement } });
      if (res.result) {
        setResult(res.result);
      } else {
        setResult({ verdict: "misleading", explanation: "Unable to verify this statement at this time. Please try again.", confidence: 0, sources: [], relatedClaims: [] });
      }
    } catch {
      setResult({ verdict: "misleading", explanation: "An error occurred during fact-checking. Please try again.", confidence: 0, sources: [], relatedClaims: [] });
    } finally {
      setChecking(false);
    }
  };

  const icons = {
    true: <CheckCircle className="w-6 h-6 text-primary" />,
    false: <XCircle className="w-6 h-6 text-destructive" />,
    misleading: <AlertTriangle className="w-6 h-6 text-gold" />,
  };

  const labels = {
    true: "VERIFIED TRUE",
    false: "FLAGGED FALSE",
    misleading: "MISLEADING / NEEDS CONTEXT",
  };

  return (
    <div className="gp-card">
      <h3 className="gp-card-header">AI Fact Checker</h3>
      <p className="text-sm text-muted-foreground mb-3">Enter any statement to fact-check using Gemini AI analysis.</p>
      <div className="flex gap-2">
        <input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Enter a statement to fact-check..."
          className="flex-1 bg-muted px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={check} disabled={checking} className="gp-btn-primary flex items-center gap-2">
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {checking ? "Analyzing..." : "Check"}
        </button>
      </div>
      {result && (
        <div className="mt-4 p-4 bg-muted rounded-md border border-border space-y-3">
          <div className="flex items-center gap-2">
            {icons[result.verdict]}
            <span className={`font-mono text-sm font-bold ${
              result.verdict === "true" ? "text-primary" :
              result.verdict === "false" ? "text-destructive" : "text-gold"
            }`}>
              {labels[result.verdict]}
            </span>
            {result.confidence > 0 && (
              <span className="ml-auto text-xs font-mono text-muted-foreground">
                Confidence: {result.confidence}%
              </span>
            )}
          </div>
          <p className="text-sm text-foreground">{result.explanation}</p>
          {result.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.sources.map((s, i) => (
                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {s}
                </span>
              ))}
            </div>
          )}
          {result.relatedClaims.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Related claims to check:</p>
              {result.relatedClaims.map((c, i) => (
                <button key={i} onClick={() => { setStatement(c); }} className="text-xs text-primary hover:underline block">
                  → {c}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground font-mono">[AI Analysis — Powered by Gemini]</p>
        </div>
      )}
    </div>
  );
}
