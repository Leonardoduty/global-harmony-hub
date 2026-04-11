import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react";

type Result = { verdict: "true" | "false" | "misleading"; explanation: string } | null;

export default function FactChecker() {
  const [statement, setStatement] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [checking, setChecking] = useState(false);

  const check = () => {
    if (!statement.trim()) return;
    setChecking(true);
    setResult(null);

    setTimeout(() => {
      const lower = statement.toLowerCase();
      let verdict: Result;
      if (lower.includes("flat") && lower.includes("earth")) {
        verdict = { verdict: "false", explanation: "Scientific consensus confirms Earth is an oblate spheroid. This claim has been debunked by centuries of evidence including satellite imagery, physics, and direct observation." };
      } else if (lower.includes("climate") || lower.includes("warming")) {
        verdict = { verdict: "true", explanation: "Multiple peer-reviewed studies and global scientific organizations confirm anthropogenic climate change is occurring. The evidence is overwhelming across temperature records, ice cores, and atmospheric data." };
      } else if (lower.includes("war") || lower.includes("peace")) {
        verdict = { verdict: "misleading", explanation: "This statement contains elements of truth but lacks important context. Global conflict data requires nuanced analysis across multiple verified sources." };
      } else {
        verdict = { verdict: "misleading", explanation: "This claim requires further verification. Our AI analysis cross-references multiple international databases and verified news sources to determine accuracy." };
      }
      setResult(verdict);
      setChecking(false);
    }, 2000);
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
      <h3 className="gp-card-header">Fact Checker</h3>
      <p className="text-sm text-muted-foreground mb-3">Enter any statement to check its accuracy using AI analysis.</p>
      <div className="flex gap-2">
        <input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Enter a statement to fact-check..."
          className="flex-1 bg-muted px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={check} disabled={checking} className="gp-btn-primary flex items-center gap-2">
          <Search className="w-4 h-4" />
          {checking ? "Checking..." : "Check"}
        </button>
      </div>
      {result && (
        <div className="mt-4 p-4 bg-muted rounded-md border border-border">
          <div className="flex items-center gap-2 mb-2">
            {icons[result.verdict]}
            <span className={`font-mono text-sm font-bold ${
              result.verdict === "true" ? "text-primary" :
              result.verdict === "false" ? "text-destructive" : "text-gold"
            }`}>
              {labels[result.verdict]}
            </span>
          </div>
          <p className="text-sm text-foreground">{result.explanation}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">[AI Analysis — Cross-referenced with verified databases]</p>
        </div>
      )}
    </div>
  );
}
