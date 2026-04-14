import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { SimulationProvider, useSimulation } from "@/context/SimulationContext";
import CountrySelectionScreen from "@/components/CountrySelectionScreen";
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

function SimFlow() {
  const { selectedCountry, setSelectedCountry } = useSimulation();

  return (
    <AnimatePresence mode="wait">
      {!selectedCountry ? (
        <motion.div
          key="selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3 }}
        >
          <CountrySelectionScreen />
        </motion.div>
      ) : (
        <motion.div
          key="simulation"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-6xl mx-auto px-4 py-8 space-y-2"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-2xl">{selectedCountry.flag}</span>
                <h1 className="gp-section-title">{selectedCountry.name} — Presidential Simulation</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                Leading as <span className="text-foreground font-semibold">{selectedCountry.leaderTitle} {selectedCountry.leader}</span>.
                Navigate AI-driven crises, manage diplomatic pressures, and shape world history.
              </p>
            </div>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              ← Change Nation
            </button>
          </div>
          <PresidentialSim />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PresidentialSimPage() {
  return (
    <SimulationProvider>
      <SimFlow />
    </SimulationProvider>
  );
}
