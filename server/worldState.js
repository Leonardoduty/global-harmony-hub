const DEFAULT_STATE = {
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

let _state = { ...DEFAULT_STATE };

export function getWorldState() {
  return { ..._state };
}

export function updateWorldState(patch) {
  const prev = { ..._state };
  _state = { ..._state, ...patch, last_updated: new Date().toISOString() };
  const changed = {};
  for (const key of Object.keys(patch)) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(_state[key])) {
      changed[key] = { from: prev[key], to: _state[key] };
    }
  }
  return { state: { ..._state }, changes: Object.keys(changed).length > 0 ? changed : null };
}

export function resetWorldState() {
  _state = { ...DEFAULT_STATE, last_updated: new Date().toISOString() };
  return { ..._state };
}

export function applyDecisionImpact(impact) {
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

export function getWorldStateSnapshot() {
  const s = getWorldState();
  return `CURRENT WORLD STATE (${s.last_updated}):
- Global Peace Index: ${s.global_peace_index}/100
- Economic Stability: ${s.economic_stability}/100
- War Risk Level: ${s.war_risk_level}/100
- Active Conflicts: ${s.active_conflicts.join(", ")}
- Major Alliances Active: ${s.alliances.join(", ")}
- Recent World Events: ${s.world_events.slice(-5).join("; ") || "None"}`;
}
