import { createFileRoute } from "@tanstack/react-router";
import CommunityStories from "@/components/CommunityStories";

export const Route = createFileRoute("/situation-room")({
  head: () => ({
    meta: [
      { title: "Situation Room — Global Pulse" },
      { name: "description", content: "Emergency briefings and community success stories." },
    ],
  }),
  component: SituationRoomPage,
});

function SituationRoomPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="gp-section-title mb-2">Situation Room</h1>
      <p className="text-muted-foreground mb-6">Emergency briefings, community success stories, and global harmony tracking.</p>
      
      <div className="gp-card mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xl">🕊️</span>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Emergency Situation Briefing</h2>
            <span className="gp-badge">LIVE</span>
          </div>
        </div>
        <p className="text-sm text-foreground">Current global stability index: <strong className="text-primary">72/100</strong>. Three active diplomatic negotiations in progress. Two ceasefire agreements under review.</p>
      </div>

      <h2 className="font-display text-xl font-bold mb-4">Community Success Stories</h2>
      <CommunityStories />
    </div>
  );
}
