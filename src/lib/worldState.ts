export type WorldState = {
  active_conflicts: string[];
  resolved_conflicts: string[];
  alliances: string[];
  global_peace_index: number;
  economic_stability: number;
  war_risk_level: number;
  world_events: string[];
  last_updated: string;
};

const DEFAULT_STATE: WorldState = {
  active_conflicts: [
    "Russia–Ukraine border conflict",
    "Israel–Gaza crisis",
    "Sudan civil war",
    "Myanmar military conflict",
    "Haiti political instability",
  ],
  resolved_conflicts: ["Colombia FARC peace process", "Mozambique insurgency ceasefire"],
  alliances: ["NATO", "G7", "BRICS", "ASEAN", "African Union", "SCO"],
  global_peace_index: 72,
  economic_stability: 65,
  war_risk_level: 40,
  world_events: [],
  last_updated: new Date().toISOString(),
};

let _state: WorldState = { ...DEFAULT_STATE };

export function getWorldState(): WorldState {
  return _state;
}

export function updateWorldState(patch: Partial<WorldState>): WorldState {
  _state = { ..._state, ...patch, last_updated: new Date().toISOString() };
  return _state;
}

export function applyDecisionImpact(impact: {
  diplomacy?: number;
  economy?: number;
  security?: number;
  approval?: number;
  headline?: string;
}): WorldState {
  const s = getWorldState();

  const peaceChange = Math.round((impact.diplomacy ?? 0) * 0.4);
  const econChange = Math.round((impact.economy ?? 0) * 0.3);
  const riskChange = Math.round(-(impact.security ?? 0) * 0.3);

  const newPeace = Math.max(0, Math.min(100, s.global_peace_index + peaceChange));
  const newEconomy = Math.max(0, Math.min(100, s.economic_stability + econChange));
  const newRisk = Math.max(0, Math.min(100, s.war_risk_level + riskChange));

  const newEvents = impact.headline
    ? [...s.world_events, impact.headline].slice(-20)
    : s.world_events;

  return updateWorldState({
    global_peace_index: newPeace,
    economic_stability: newEconomy,
    war_risk_level: newRisk,
    world_events: newEvents,
  });
}

export function getWorldStateSnapshot(): string {
  const s = getWorldState();
  return `CURRENT WORLD STATE:
- Global Peace Index: ${s.global_peace_index}/100
- Economic Stability: ${s.economic_stability}/100
- War Risk Level: ${s.war_risk_level}/100
- Active Conflicts: ${s.active_conflicts.join(", ") || "None"}
- Active Alliances: ${s.alliances.slice(0, 4).join(", ")}
- Recent Events: ${s.world_events.slice(-5).join("; ") || "None yet"}`;
}
