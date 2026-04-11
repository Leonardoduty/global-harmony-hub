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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="gp-section-title mb-2">Presidential Simulation</h1>
      <p className="text-muted-foreground mb-6">Make critical decisions as a world leader. Every choice has consequences.</p>
      <PresidentialSim />
    </div>
  );
}
