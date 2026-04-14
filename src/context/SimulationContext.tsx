import { createContext, useContext, useState, type ReactNode } from "react";

export type SimCountry = {
  name: string;
  code: string;
  flag: string;
  difficulty: "Easy" | "Medium" | "Hard";
  leader: string;
  leaderTitle: string;
  region: string;
};

type SimContextType = {
  selectedCountry: SimCountry | null;
  setSelectedCountry: (c: SimCountry | null) => void;
};

const SimulationContext = createContext<SimContextType | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountry] = useState<SimCountry | null>(null);
  return (
    <SimulationContext.Provider value={{ selectedCountry, setSelectedCountry }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
