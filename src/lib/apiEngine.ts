export type EngineType =
  | "chat"
  | "decision"
  | "verify_news"
  | "generate_headlines"
  | "world_state"
  | "country_info";

export type EngineDebugMeta = {
  id: string;
  latency_ms: number;
  ai_used: boolean;
  model: string | null;
  error: string | null;
};

export type EngineResponse<T = unknown> = {
  ok: boolean;
  type: EngineType;
  data: T;
  debug: EngineDebugMeta;
  error?: string;
};

export type DebugLog = {
  id: string;
  timestamp: string;
  type: string;
  request: unknown;
  response: unknown;
  latency_ms: number;
  ai_used: boolean;
  model: string | null;
  error: string | null;
  worldStateChange: unknown;
};

async function callEngine<T = unknown>(
  type: EngineType,
  payload: Record<string, unknown> = {}
): Promise<EngineResponse<T>> {
  const body = JSON.stringify({ type, ...payload });

  try {
    const res = await fetch("/api/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const json = await res.json();
    return json as EngineResponse<T>;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Network error";
    return {
      ok: false,
      type,
      data: null as unknown as T,
      error: errMsg,
      debug: { id: "", latency_ms: 0, ai_used: false, model: null, error: errMsg },
    };
  }
}

export type ChatData = {
  reply: string;
  confidence: number;
  advisor: string;
  ai_used: boolean;
  model: string | null;
  error: string | null;
};

export const engineChat = (messages: { role: string; content: string }[], advisor?: string) =>
  callEngine<ChatData>("chat", { messages, advisor });

export type VerifyNewsData = {
  result: {
    verified: boolean;
    credibility_score: number;
    classification: "Verified" | "Unverified" | "Misleading" | "Fake";
    reason: string;
    key_claims: string[];
    confidence: number;
  };
  ai_used: boolean;
  model: string | null;
  error: string | null;
};

export const engineVerifyNews = (headline: string, content?: string) =>
  callEngine<VerifyNewsData>("verify_news", { headline, content });

export type HeadlineItem = {
  headline: string;
  source: string;
  category: string;
  credibility: number;
  time: string;
};

export type GenerateHeadlinesData = {
  headlines: HeadlineItem[];
  source: "ai" | "fallback";
  ai_used: boolean;
  model: string | null;
  error: string | null;
};

export const engineGenerateHeadlines = (recentDecisions?: string[]) =>
  callEngine<GenerateHeadlinesData>("generate_headlines", { recentDecisions });

export type WorldStateData = {
  state: {
    active_conflicts: string[];
    resolved_conflicts: string[];
    alliances: string[];
    global_peace_index: number;
    economic_stability: number;
    war_risk_level: number;
    world_events: string[];
    last_updated: string;
  };
  changes?: Record<string, { from: unknown; to: unknown }> | null;
  action: "get" | "patch" | "reset";
};

export const engineGetWorldState = () =>
  callEngine<WorldStateData>("world_state", { action: "get" });

export const enginePatchWorldState = (patch: Partial<WorldStateData["state"]>) =>
  callEngine<WorldStateData>("world_state", { action: "patch", patch });

export type CountryInfoData = {
  info: {
    name: string;
    summary: string;
    stabilityScore: number;
    conflicts: string[];
    peaceInitiatives: string[];
    history: string;
    currentSituation: string;
    playerRelationship: string;
    leader: { name: string; title: string; personality: string; politicalStance: string };
    relationships: { allied: string[]; hostile: string[]; neutral: string[] };
  };
  source: "ai" | "fallback";
  ai_used: boolean;
  model: string | null;
  error: string | null;
};

export const engineGetCountryInfo = (countryName: string, gameContext?: string) =>
  callEngine<CountryInfoData>("country_info", { countryName, gameContext });

export type DecisionData = {
  scenario?: unknown;
  appliedEffects?: Record<string, number>;
  narrativeOutcome?: string;
  followUp?: string;
  newsHeadline?: string;
  suggestion?: string;
  worldState?: WorldStateData["state"];
  worldStateChanges?: unknown;
  source: "ai" | "fallback";
  ai_used: boolean;
  model: string | null;
  error: string | null;
};

export const engineGenerateScenario = (payload: {
  stats: Record<string, number>;
  previousDecisions: string[];
  scenarioCount: number;
  worldEvents?: string[];
  country?: string;
}) => callEngine<DecisionData>("decision", { action: "generate_scenario", ...payload });

export const engineFinalizeDecision = (payload: {
  scenarioTitle: string;
  scenarioDescription: string;
  choiceLabel: string;
  suggestedOutcome: string;
  previewEffects: Record<string, number>;
  stats: Record<string, number>;
  decisionHistory: string[];
}) => callEngine<DecisionData>("decision", { action: "finalize_decision", ...payload });

export const engineGetAdvisorSuggestion = (payload: {
  question: string;
  stats: Record<string, number>;
  currentScenario?: string;
  decisionHistory: string[];
}) => callEngine<DecisionData>("decision", { action: "get_advisor_suggestion", ...payload });

export async function fetchDebugLogs(): Promise<DebugLog[]> {
  try {
    const res = await fetch("/api/debug/logs");
    const json = await res.json();
    return json.logs ?? [];
  } catch {
    return [];
  }
}

export async function clearDebugLogs(): Promise<void> {
  await fetch("/api/debug/logs", { method: "DELETE" });
}
