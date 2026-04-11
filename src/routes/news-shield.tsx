import { createFileRoute } from "@tanstack/react-router";
import NewsShield from "@/components/NewsShield";
import FactChecker from "@/components/FactChecker";

export const Route = createFileRoute("/news-shield")({
  head: () => ({
    meta: [
      { title: "News Shield — Global Pulse" },
      { name: "description", content: "Verified global news and AI-powered fact checking." },
    ],
  }),
  component: NewsShieldPage,
});

function NewsShieldPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="gp-section-title mb-6">Global News Shield</h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">AI-verified news coverage and fact-checking tools to combat misinformation.</p>
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Latest Verified News</h2>
          <NewsShield />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold mb-4">AI Fact Checker</h2>
          <FactChecker />
        </div>
      </div>
    </div>
  );
}
