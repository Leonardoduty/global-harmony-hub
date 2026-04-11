import { createFileRoute } from "@tanstack/react-router";
import WorldMap from "@/components/WorldMap";

export const Route = createFileRoute("/conflict-map")({
  head: () => ({
    meta: [
      { title: "Conflict Map — Global Pulse" },
      { name: "description", content: "Interactive global conflict and peace monitoring map." },
    ],
  }),
  component: ConflictMapPage,
});

function ConflictMapPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="gp-section-title mb-6">Global Situation Map</h1>
      <p className="text-muted-foreground mb-6 max-w-2xl">Track active conflicts, peace zones, and diplomatic hotspots across the globe in real-time.</p>
      <WorldMap />
      <div className="flex gap-6 mt-4 text-sm font-mono">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> Active Conflict</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" /> Peace Initiative</div>
      </div>
    </div>
  );
}
