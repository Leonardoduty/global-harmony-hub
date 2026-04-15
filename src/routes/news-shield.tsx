import { createFileRoute } from "@tanstack/react-router";
import NewsShield from "@/components/NewsShield";
import NewsVerifier from "@/components/NewsVerifier";
import WorldStateDashboard from "@/components/WorldStateDashboard";

export const Route = createFileRoute("/news-shield")({
  head: () => ({
    meta: [
      { title: "News Shield — Global Pulse" },
      { name: "description", content: "AI-powered news verification and global intelligence." },
    ],
  }),
  component: NewsShieldPage,
});

function NewsShieldPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="gp-section-title mb-2">Global News Shield</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-sm">
        AI-powered news verification cross-referenced against the live global simulation state.
        Every claim is evaluated for credibility, consistency, and geopolitical realism.
      </p>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="font-display text-xl font-bold mb-4">AI News Verification</h2>
            <NewsVerifier />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold mb-4">Latest Verified Stories</h2>
            <NewsShield />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">World Intelligence State</h2>
          <WorldStateDashboard />
        </div>
      </div>
    </div>
  );
}
