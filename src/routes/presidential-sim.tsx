import { createFileRoute } from "@tanstack/react-router";
import PresidentialSim from "@/components/PresidentialSim";

export const Route = createFileRoute("/presidential-sim")({
  head: () => ({
    meta: [
      { title: "Presidential Simulation — Global Pulse" },
      { name: "description", content: "Experience presidential decision-making in global crisis scenarios." },
    ],
  }),
  component: PresidentialSimPage,
});

function PresidentialSimPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-2">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="gp-section-title mb-2">Presidential Simulation</h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Command desk for an AI-driven term: dynamic crises, projected impacts, confirmed consequences, live wire copy, and visual history.
          </p>
        </div>
      </div>
      <PresidentialSim />
    </div>
  );
}
