export type EngineType =
  | "chat"
  | "decision"
  | "verify_news"
  | "generate_headlines"
  | "world_state"
  | "country_info"
  | "debug";

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

const _env = (import.meta as { env?: { VITE_API_URL?: string; DEV?: boolean } }).env ?? {};
const API_BASE: string = _env.VITE_API_URL || (_env.DEV ? "" : "https://global-harmony-hub.onrender.com");

async function callEngine<T = unknown>(
  type: EngineType,
  payload: Record<string, unknown> = {}
): Promise<EngineResponse<T>> {
  const requestPayload = { type, ...payload };
  const body = JSON.stringify(requestPayload);

  console.log("🚀 API REQUEST SENT:", requestPayload);

  try {
    const res = await fetch(`${API_BASE}/api/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json();

    console.log("📡 RAW RESPONSE:", res.status, res.statusText);
    console.log("📦 PARSED JSON:", data);

    if (type === "chat") {
      console.log("💬 EXTRACTED REPLY:", data?.data?.reply);
    }

    if (!data.ok) {
      console.error("❌ INVALID RESPONSE STRUCTURE:", data);
    }

    return data as EngineResponse<T>;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Network error";
    console.error("❌ API ERROR:", err);
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
  region: string;
  source: string;
  category: string;
  time: string;
  summary: string;
  credibility_score: number;
  fake_risk: number;
  status: "CONFIRMED" | "LIKELY TRUE" | "UNCERTAIN" | "DISPUTED" | "LIKELY FAKE";
  impact_level: "LOW" | "MEDIUM" | "HIGH" | "GLOBAL CRISIS";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  key_signals: string[];
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
    capital: string;
    population: string;
    region: string;
    riskLevel: number;
    stabilityScore: number;
    leader: { name: string; title: string };
    summary: string;
    currentSituation: string;
    timeline: { year: string; event: string }[];
    conflicts: { name: string; status: string; since: string }[];
    allies: string[];
    rivals: string[];
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

export type EngineDebugData = {
  system_status: string;
  openai_connected: boolean;
  engine_hits: number;
  uptime_ms: number;
  latency_ms_avg: number;
  total_requests: number;
  ai_calls: number;
  world_state_size: number;
  last_request: unknown;
  errors: { type: string; error: string; timestamp: string }[];
};

export const engineGetDebug = () =>
  callEngine<EngineDebugData>("debug", {});

export async function fetchDebugLogs(): Promise<DebugLog[]> {
  try {
    const res = await fetch(`${API_BASE}/api/debug/logs`);
    const json = await res.json();
    return json.logs ?? [];
  } catch {
    return [];
  }
}

export async function clearDebugLogs(): Promise<void> {
  await fetch(`${API_BASE}/api/debug/logs`, { method: "DELETE" });
}
