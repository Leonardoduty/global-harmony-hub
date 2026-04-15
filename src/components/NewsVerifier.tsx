import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { engineVerifyNews } from "@/lib/apiEngine";
import { CheckCircle, XCircle, AlertTriangle, Search, Loader2, Shield, Newspaper } from "lucide-react";

type VerifyResult = {
  verified: boolean;
  credibility_score: number;
  classification: "Verified" | "Unverified" | "Misleading" | "Fake";
  reason: string;
  key_claims: string[];
  confidence: number;
};

const CLASSIFICATION_CONFIG = {
  Verified: { icon: CheckCircle, color: "text-emerald-400", bar: "bg-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", label: "✓ VERIFIED" },
  Unverified: { icon: AlertTriangle, color: "text-amber-400", bar: "bg-amber-500", bg: "bg-amber-500/10 border-amber-500/30", label: "⚠ UNVERIFIED" },
  Misleading: { icon: AlertTriangle, color: "text-orange-400", bar: "bg-orange-500", bg: "bg-orange-500/10 border-orange-500/30", label: "⚠ MISLEADING" },
  Fake: { icon: XCircle, color: "text-red-400", bar: "bg-red-500", bg: "bg-red-500/10 border-red-500/30", label: "✕ FLAGGED FAKE" },
};

const SAMPLE_HEADLINES = [
  "Country X launches surprise missile strike on neighboring nation",
  "UN Security Council reaches unanimous peace agreement",
  "Global economy collapses overnight due to new conflict",
  "Major alliance dissolved after summit breakdown",
];

export default function NewsVerifier() {
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const check = async (h?: string) => {
    const target = (h ?? headline).trim();
    if (!target || checking) return;
    if (h) setHeadline(h);
    setChecking(true);
    setResult(null);

    try {
      const res = await engineVerifyNews(target, content.trim() || undefined);
      setResult(res.ok && res.data?.result ? res.data.result : {
        verified: false,
        credibility_score: 0,
        classification: "Unverified",
        reason: "Verification service unavailable. Please try again.",
        key_claims: [],
        confidence: 0,
      });
    } catch {
      setResult({
        verified: false,
        credibility_score: 0,
        classification: "Unverified",
        reason: "Verification service unavailable. Please try again.",
        key_claims: [],
        confidence: 0,
      });
    } finally {
      setChecking(false);
    }
  };

  const cfg = result ? CLASSIFICATION_CONFIG[result.classification] : null;
  const Icon = cfg?.icon;

  return (
    <div className="space-y-4">
      {/* Input area */}
      <div className="gp-card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-sm">AI News Verifier</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">OPENAI POWERED</span>
        </div>
        <p className="text-xs text-muted-foreground">Paste a headline or article. Our AI cross-references it against the live global simulation state.</p>

        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Enter news headline to verify..."
          className="w-full bg-muted px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={checking}
        />

        <button
          onClick={() => setShowContent((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
        >
          {showContent ? "▲ Hide" : "▼ Add"} full article text (optional)
        </button>

        {showContent && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste full article content here for deeper analysis..."
            rows={4}
            className="w-full bg-muted px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            disabled={checking}
          />
        )}

        <button
          onClick={() => check()}
          disabled={!headline.trim() || checking}
          className="gp-btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI Analyzing against world state...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Verify with AI
            </>
          )}
        </button>

        {/* Sample headlines */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Quick test:</p>
          <div className="flex flex-wrap gap-1">
            {SAMPLE_HEADLINES.map((h) => (
              <button
                key={h}
                onClick={() => check(h)}
                className="text-[10px] px-2 py-0.5 rounded border border-border hover:border-primary/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all truncate max-w-[180px]"
                title={h}
              >
                {h.length > 35 ? `${h.slice(0, 35)}…` : h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && cfg && Icon && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={`gp-card border ${cfg.bg} space-y-4`}
          >
            {/* Header + score */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${cfg.color} shrink-0`} />
                <span className={`font-mono font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-display text-2xl font-black ${cfg.color}`}>
                  {result.credibility_score}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">/ 100 CREDIBILITY</div>
              </div>
            </div>

            {/* Credibility bar */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                <span>FAKE</span>
                <span>CREDIBILITY METER</span>
                <span>VERIFIED</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <motion.div
                  className={`h-2.5 rounded-full ${cfg.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${result.credibility_score}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* AI explanation */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">AI Analysis</p>
              <p className="text-sm text-foreground leading-relaxed">{result.reason}</p>
            </div>

            {/* Key claims */}
            {result.key_claims.length > 0 && (
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Key Claims Detected</p>
                <ul className="space-y-1">
                  {result.key_claims.map((claim, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="text-muted-foreground font-mono shrink-0">{i + 1}.</span>
                      {claim}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-[10px] font-mono text-muted-foreground">AI CONFIDENCE: {Math.round(result.confidence * 100)}%</span>
              <span className="text-[10px] font-mono text-muted-foreground">Cross-referenced against live world state</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
