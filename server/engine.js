import { openAIChat, stripJsonFences, getOpenAIKey } from "./openai.js";
import {
  getWorldState,
  updateWorldState,
  resetWorldState,
  applyDecisionImpact,
  getWorldStateSnapshot,
} from "./worldState.js";

const FALLBACK_HEADLINES = [
  { headline: "UN Security Council Convenes Emergency Session on Regional Tensions", source: "Reuters", category: "diplomacy", credibility: 85, time: "2h ago" },
  { headline: "Global Markets Steady Amid Geopolitical Uncertainty", source: "AP", category: "economy", credibility: 82, time: "4h ago" },
  { headline: "Ceasefire Negotiations Resume Between Warring Factions", source: "BBC", category: "conflict", credibility: 80, time: "6h ago" },
  { headline: "NATO Members Reaffirm Collective Defense Commitments", source: "AFP", category: "security", credibility: 88, time: "8h ago" },
  { headline: "Aid Convoy Reaches Conflict Zone After Days of Delay", source: "Al Jazeera", category: "humanitarian", credibility: 79, time: "12h ago" },
];

const ADVISOR_PROMPTS = {
  "Diplomatic Advisor": "You are a senior Diplomatic Advisor with 30 years of UN and foreign ministry experience. You specialize in international law, treaty negotiation, and conflict mediation. Keep responses concise (2-4 sentences).",
  "Economic Advisor": "You are a Chief Economic Advisor and former IMF economist. You analyze global markets, trade relationships, sanctions regimes, and economic warfare. Keep responses concise (2-4 sentences).",
  "Military Advisor": "You are a retired Joint Chiefs-level Military Advisor with expertise in defense strategy, deterrence theory, and conflict escalation dynamics. Keep responses concise (2-4 sentences).",
  "General": "You are the Global Governance AI — a diplomatic intelligence assistant specializing in global conflicts, geopolitics, and international relations. Provide factual, balanced analysis. Keep responses concise (2-4 sentences).",
};

export async function handleChat({ messages, advisor = "General" }) {
  const worldContext = getWorldStateSnapshot();
  const prompt = ADVISOR_PROMPTS[advisor] ?? ADVISOR_PROMPTS["General"];

  const result = await openAIChat({
    temperature: 0.75,
    messages: [
      {
        role: "system",
        content: `${prompt}\n\n${worldContext}\n\nIf asked something outside geopolitics, politely redirect.`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  if (!result.ok) {
    return {
      reply: "I'm having trouble connecting right now. Please try again.",
      confidence: 0,
      advisor,
      ai_used: false,
      error: result.message,
      model: null,
    };
  }

  return { reply: result.text, confidence: 0.92, advisor, ai_used: true, model: result.model, error: null };
}

export async function handleVerifyNews({ headline, content }) {
  const worldContext = getWorldStateSnapshot();

  const result = await openAIChat({
    json: true,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are a news verification AI for the Global Governance Simulator. Assess news credibility against the current world state.

${worldContext}

Respond ONLY with JSON (no markdown):
{
  "verified": boolean,
  "credibility_score": number (0-100),
  "classification": "Verified" | "Unverified" | "Misleading" | "Fake",
  "reason": "1-3 sentence explanation",
  "key_claims": ["claim1", "claim2"],
  "confidence": number (0-1)
}

Scoring: 80-100=Verified, 50-79=Unverified, 20-49=Misleading, 0-19=Fake`,
      },
      {
        role: "user",
        content: `Verify:\nHEADLINE: "${headline}"${content ? `\nCONTENT: ${content}` : ""}`,
      },
    ],
  });

  const fallback = {
    verified: false, credibility_score: 50, classification: "Unverified",
    reason: "AI verification unavailable. Try again later.", key_claims: [], confidence: 0,
  };

  if (!result.ok) return { result: fallback, ai_used: false, model: null, error: result.message };

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    return { result: parsed, ai_used: true, model: result.model, error: null };
  } catch {
    return { result: fallback, ai_used: false, model: null, error: "JSON parse failed" };
  }
}

export async function handleGenerateHeadlines({ recentDecisions = [] }) {
  const worldContext = getWorldStateSnapshot();

  const result = await openAIChat({
    json: true,
    temperature: 0.9,
    messages: [
      {
        role: "system",
        content: `You are a global news wire generator for the Global Governance Simulator.

${worldContext}
Recent player decisions: ${recentDecisions.slice(-3).join("; ") || "None"}

Respond ONLY with JSON:
{ "headlines": [{ "headline": "...", "source": "Reuters|AP|BBC|AFP|Al Jazeera", "category": "diplomacy|military|economy|humanitarian|security", "credibility": number(75-100), "time": "Xh ago" }] }

Generate 5 headlines. Vary timestamps 1-24h ago.`,
      },
      { role: "user", content: "Generate current headlines." },
    ],
  });

  if (!result.ok) return { headlines: FALLBACK_HEADLINES, source: "fallback", ai_used: false, model: null, error: result.message };

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    const headlines = Array.isArray(parsed.headlines) && parsed.headlines.length > 0
      ? parsed.headlines
      : FALLBACK_HEADLINES;
    return { headlines, source: "ai", ai_used: true, model: result.model, error: null };
  } catch {
    return { headlines: FALLBACK_HEADLINES, source: "fallback", ai_used: false, model: null, error: "JSON parse failed" };
  }
}

export async function handleWorldState({ action = "get", patch = null }) {
  if (action === "patch" && patch && typeof patch === "object") {
    const { state, changes } = updateWorldState(patch);
    return { state, changes, action: "patch" };
  }
  if (action === "reset") {
    const state = resetWorldState();
    return { state, action: "reset" };
  }
  return { state: getWorldState(), action: "get" };
}

export async function handleCountryInfo({ countryName, gameContext = "" }) {
  const worldContext = getWorldStateSnapshot();
  const contextBlock = gameContext ? `\n\nPlayer game context: ${gameContext}` : "";

  const result = await openAIChat({
    json: true,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `You are a geopolitical intelligence analyst for the Global Governance Simulator. Provide a detailed JSON brief on the given country.

${worldContext}${contextBlock}

Respond ONLY with this JSON:
{
  "name": "country name",
  "summary": "2-3 sentence overview",
  "stabilityScore": number(0-100),
  "conflicts": ["conflict1", "conflict2"],
  "peaceInitiatives": ["initiative1"],
  "history": "2-3 sentences of relevant recent history",
  "currentSituation": "one sentence: current political/security situation",
  "playerRelationship": "one sentence: how this country relates to the player",
  "leader": { "name": "...", "title": "...", "personality": "3-4 words", "politicalStance": "brief stance" },
  "relationships": { "allied": ["Country1"], "hostile": ["Country2"], "neutral": ["Country3"] }
}`,
      },
      { role: "user", content: `Provide geopolitical analysis for: ${countryName}` },
    ],
  });

  const fallback = {
    name: countryName, summary: "Intelligence data unavailable for this region.",
    stabilityScore: 50, conflicts: [], peaceInitiatives: [], history: "Data unavailable.",
    currentSituation: "Situation unclear.", playerRelationship: "Neutral stance.",
    leader: { name: "Unknown", title: "Head of State", personality: "Unknown", politicalStance: "Undetermined" },
    relationships: { allied: [], hostile: [], neutral: [] },
  };

  if (!result.ok) return { info: fallback, source: "fallback", ai_used: false, model: null, error: result.message };

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    return { info: parsed, source: "ai", ai_used: true, model: result.model, error: null };
  } catch {
    return { info: fallback, source: "fallback", ai_used: false, model: null, error: "JSON parse failed" };
  }
}

export async function handleDecision({ action, ...payload }) {
  switch (action) {
    case "generate_scenario": return generateScenario(payload);
    case "finalize_decision": return finalizeDecision(payload);
    case "get_advisor_suggestion": return getAdvisorSuggestion(payload);
    default: return { error: `Unknown decision action: ${action}`, ai_used: false };
  }
}

async function generateScenario({ stats = {}, previousDecisions = [], scenarioCount = 0, worldEvents = [], country = "Global" }) {
  const worldContext = getWorldStateSnapshot();
  const statEntries = Object.entries(stats).map(([k, v]) => `${k}: ${v}/100`).join(", ");
  const weakest = Object.entries(stats).sort(([, a], [, b]) => a - b)[0]?.[0] ?? "diplomacy";

  const result = await openAIChat({
    json: true,
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content: `You are a geopolitical crisis engine for the Global Governance Simulator. Generate a realistic multi-choice crisis scenario.

${worldContext}
Player country: ${country}
Player stats: ${statEntries}
Weakest stat (target): ${weakest}
Scenario #${scenarioCount + 1}
Previous decisions: ${previousDecisions.slice(-3).join("; ") || "None"}

Respond ONLY with JSON:
{
  "title": "Crisis title",
  "description": "2-3 sentence situation brief",
  "imagePrompt": "cinematic news-style scene, no text",
  "urgencyLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "affectedRegions": ["region1"],
  "options": [
    {
      "label": "Option label",
      "description": "What this action entails",
      "effects": { "diplomacy": number(-20 to 20), "economy": number(-20 to 20), "security": number(-20 to 20), "approval": number(-20 to 20) },
      "outcome": "Expected outcome narrative",
      "riskLevel": "LOW|MEDIUM|HIGH"
    }
  ]
}

Provide exactly 3 options. Make the scenario unique from previous decisions. Target the weakest stat for added challenge.`,
      },
      { role: "user", content: "Generate the next crisis scenario." },
    ],
  });

  if (!result.ok) {
    return { scenario: buildFallbackScenario(scenarioCount), source: "fallback", ai_used: false, model: null, error: result.message };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    return { scenario: parsed, source: "ai", ai_used: true, model: result.model, error: null };
  } catch {
    return { scenario: buildFallbackScenario(scenarioCount), source: "fallback", ai_used: false, model: null, error: "JSON parse failed" };
  }
}

async function finalizeDecision({ scenarioTitle, scenarioDescription, choiceLabel, suggestedOutcome, previewEffects, stats }) {
  const worldContext = getWorldStateSnapshot();

  const result = await openAIChat({
    json: true,
    temperature: 0.75,
    messages: [
      {
        role: "system",
        content: `You are a geopolitical outcome engine. Generate the consequences of a presidential decision.

${worldContext}

Respond ONLY with JSON:
{
  "narrativeOutcome": "3-4 sentence dramatic narrative of what happened",
  "followUp": "1-2 sentences on immediate next steps/consequences",
  "newsHeadline": "One realistic wire-service style headline about this decision",
  "appliedEffects": { "diplomacy": number(-20 to 20), "economy": number(-20 to 20), "security": number(-20 to 20), "approval": number(-20 to 20) }
}`,
      },
      {
        role: "user",
        content: `Crisis: "${scenarioTitle}"\n\nSituation: ${scenarioDescription}\n\nDecision made: "${choiceLabel}"\nExpected outcome: ${suggestedOutcome}\nProjected effects: ${JSON.stringify(previewEffects)}\nCurrent stats: ${JSON.stringify(stats)}`,
      },
    ],
  });

  if (!result.ok) {
    const effects = previewEffects ?? { diplomacy: 0, economy: 0, security: 0, approval: -5 };
    return {
      appliedEffects: effects,
      narrativeOutcome: `Your administration's decision regarding ${scenarioTitle} has been implemented.`,
      followUp: "The international community is watching closely.",
      newsHeadline: `World Leaders React to ${scenarioTitle} Decision`,
      source: "fallback", ai_used: false, model: null, error: result.message,
    };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    const { state, changes } = applyDecisionImpact({
      diplomacy: parsed.appliedEffects?.diplomacy,
      economy: parsed.appliedEffects?.economy,
      security: parsed.appliedEffects?.security,
      headline: parsed.newsHeadline,
    });
    return { ...parsed, worldState: state, worldStateChanges: changes, source: "ai", ai_used: true, model: result.model, error: null };
  } catch {
    return {
      appliedEffects: previewEffects ?? {},
      narrativeOutcome: `Decision on ${scenarioTitle} has been executed.`,
      followUp: "Consequences are still unfolding.",
      newsHeadline: `${scenarioTitle}: Administration Acts`,
      source: "fallback", ai_used: false, model: null, error: "JSON parse failed",
    };
  }
}

async function getAdvisorSuggestion({ question, stats, currentScenario, decisionHistory }) {
  const worldContext = getWorldStateSnapshot();

  const result = await openAIChat({
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are a senior presidential advisor in the Global Governance Simulator. Give concise, strategic advice.

${worldContext}
Player stats: ${JSON.stringify(stats)}
Current scenario: ${currentScenario || "None"}
Decision history: ${decisionHistory?.slice(-3).join("; ") || "None"}

Keep advice to 2-3 sentences. Be direct and strategic.`,
      },
      { role: "user", content: question },
    ],
  });

  if (!result.ok) return { suggestion: "I'm unable to advise at this time. Trust your instincts.", ai_used: false, model: null, error: result.message };
  return { suggestion: result.text, ai_used: true, model: result.model, error: null };
}

let _engineHits = 0;
let _lastRequest = null;
let _errors = [];
const _engineStartTime = Date.now();

export function recordEngineHit(type, payload) {
  _engineHits++;
  _lastRequest = { type, payload, timestamp: new Date().toISOString() };
}

export function recordEngineError(type, error) {
  _errors.unshift({ type, error, timestamp: new Date().toISOString() });
  if (_errors.length > 20) _errors.splice(20);
}

export async function handleDebug() {
  const { getLogs } = await import("./debug.js");
  const logs = getLogs();
  const aiLogs = logs.filter((l) => l.ai_used);
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) / logs.length)
    : 0;
  const errors = logs.filter((l) => l.error).map((l) => ({ type: l.type, error: l.error, timestamp: l.timestamp }));
  const state = getWorldState();

  return {
    system_status: "healthy",
    openai_connected: !!getOpenAIKey(),
    engine_hits: _engineHits,
    uptime_ms: Date.now() - _engineStartTime,
    latency_ms_avg: avgLatency,
    total_requests: logs.length,
    ai_calls: aiLogs.length,
    world_state_size: Object.keys(state).length,
    last_request: _lastRequest,
    errors: errors.slice(0, 10),
    ai_used: false,
    model: null,
    error: null,
  };
}

function buildFallbackScenario(count) {
  const scenarios = [
    {
      title: "Regional Maritime Dispute Escalates",
      description: "Tensions in disputed waters have escalated after a naval incident. Three nations are now mobilizing forces and demanding immediate territorial concessions.",
      imagePrompt: "dramatic aerial view of naval vessels in disputed waters at sunset",
      urgencyLevel: "HIGH",
      affectedRegions: ["Asia-Pacific"],
      options: [
        { label: "Diplomatic Mediation", description: "Call for multilateral talks under UN auspices.", effects: { diplomacy: 12, economy: -3, security: 5, approval: 8 }, outcome: "Negotiations begin, tensions ease.", riskLevel: "LOW" },
        { label: "Naval Presence", description: "Deploy patrol vessels to assert navigation rights.", effects: { diplomacy: -8, economy: -5, security: 12, approval: 5 }, outcome: "Deters aggression but risks escalation.", riskLevel: "HIGH" },
        { label: "Economic Leverage", description: "Impose targeted trade restrictions.", effects: { diplomacy: -5, economy: 8, security: 3, approval: -4 }, outcome: "Economic pressure forces negotiation.", riskLevel: "MEDIUM" },
      ],
    },
    {
      title: "Humanitarian Crisis on the Border",
      description: "A surge of refugees crossing into your territory has overwhelmed local resources. International agencies are calling for immediate action.",
      imagePrompt: "humanitarian aid camp at dawn with refugees and aid workers",
      urgencyLevel: "CRITICAL",
      affectedRegions: ["Eastern Europe", "Middle East"],
      options: [
        { label: "Open Borders Policy", description: "Accept refugees and request international aid.", effects: { diplomacy: 15, economy: -10, security: -5, approval: 3 }, outcome: "Humanitarian crisis addressed, costs high.", riskLevel: "MEDIUM" },
        { label: "Controlled Entry", description: "Implement processing camps and screening.", effects: { diplomacy: 5, economy: -5, security: 8, approval: -2 }, outcome: "Balanced approach with moderate outcomes.", riskLevel: "LOW" },
        { label: "Border Reinforcement", description: "Strengthen border security temporarily.", effects: { diplomacy: -12, economy: 5, security: 10, approval: -8 }, outcome: "Crisis exported, international backlash.", riskLevel: "HIGH" },
      ],
    },
  ];
  return scenarios[count % scenarios.length];
}
