import { createFileRoute } from "@tanstack/react-router";
import WorldMapDashboard from "@/components/WorldMapDashboard";

export const Route = createFileRoute("/conflict-map")({
  head: () => ({
    meta: [
      { title: "World Map — Global Pulse" },
      { name: "description", content: "Interactive world map with Doomsday Clock, country intelligence briefings, and global risk monitoring." },
    ],
  }),
  component: ConflictMapPage,
});

function ConflictMapPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="gp-section-title mb-1">World Intelligence Map</h1>
        <p className="text-muted-foreground text-sm max-w-2xl font-mono">
          Click any country to view its intelligence briefing, historical timeline, active conflicts, and diplomatic relationships.
          The Doomsday Clock updates in real-time based on the selected nation's risk profile.
        </p>
      </div>
      <WorldMapDashboard />
    </div>
  );
}
