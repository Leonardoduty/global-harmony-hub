import { callAI, stripJsonFences, getProviderStatus } from "./openai.js";
import {
  getWorldState,
  updateWorldState,
  resetWorldState,
  applyDecisionImpact,
  getWorldStateSnapshot,
} from "./worldState.js";

const FALLBACK_HEADLINES = [
  {
    headline: "UN Security Council Convenes Emergency Session on Regional Tensions",
    region: "Global", source: "Reuters", category: "diplomacy", time: "2h ago",
    summary: "An emergency session was called following a sudden escalation of hostilities in a disputed border region. Representatives from 15 nations are in attendance. No resolution has been passed yet.",
    credibility_score: 85, fake_risk: 10, status: "LIKELY TRUE",
    impact_level: "HIGH", urgency: "HIGH",
    key_signals: ["Multiple wire services reporting", "Official UN agenda posted", "Ambassador statements confirmed"],
  },
  {
    headline: "Global Markets Steady Amid Geopolitical Uncertainty",
    region: "Global", source: "AP", category: "economy", time: "4h ago",
    summary: "Despite elevated conflict risk indicators, major indices held their ground through the trading session. Analysts caution that this calm may be temporary pending diplomatic outcomes.",
    credibility_score: 82, fake_risk: 8, status: "CONFIRMED",
    impact_level: "MEDIUM", urgency: "LOW",
    key_signals: ["Live market data corroborates", "Multiple financial analysts cited"],
  },
  {
    headline: "Ceasefire Negotiations Resume Between Warring Factions",
    region: "Middle East", source: "BBC", category: "diplomacy", time: "6h ago",
    summary: "Delegations from both sides have returned to the table following a three-day breakdown. Mediators from a neutral third party are facilitating. Outcome remains uncertain.",
    credibility_score: 74, fake_risk: 18, status: "UNCERTAIN",
    impact_level: "HIGH", urgency: "MEDIUM",
    key_signals: ["Single source reporting", "No official joint statement yet", "Social media activity elevated"],
  },
  {
    headline: "NATO Members Reaffirm Collective Defense Commitments",
    region: "Europe", source: "AFP", category: "security", time: "8h ago",
    summary: "Following a joint ministerial meeting, all member states reaffirmed Article 5 obligations. The statement comes amid heightened pressure on the alliance's eastern flank.",
    credibility_score: 92, fake_risk: 4, status: "CONFIRMED",
    impact_level: "HIGH", urgency: "MEDIUM",
    key_signals: ["Official NATO press release", "Multiple state media confirmed", "Video of signing ceremony available"],
  },
  {
    headline: "Unverified Reports: Militia Forces Seize Strategic Crossing",
    region: "Sub-Saharan Africa", source: "OSINT", category: "military", time: "1h ago",
    summary: "Social media accounts are circulating footage purportedly showing armed groups controlling a key border crossing. No government or international body has confirmed the claim.",
    credibility_score: 34, fake_risk: 62, status: "DISPUTED",
    impact_level: "HIGH", urgency: "CRITICAL",
    key_signals: ["No official confirmation", "Single social media origin", "Video metadata unverified", "Conflicting local reports"],
  },
];

const ADVISOR_PROMPTS = {
  "Diplomatic Advisor": "You are a senior Diplomatic Advisor with 30 years of UN and foreign ministry experience. You specialize in international law, treaty negotiation, and conflict mediation. Keep responses concise (2-4 sentences).",
  "Economic Advisor": "You are a Chief Economic Advisor and former IMF economist. You analyze global markets, trade relationships, sanctions regimes, and economic warfare. Keep responses concise (2-4 sentences).",
  "Military Advisor": "You are a retired Joint Chiefs-level Military Advisor with expertise in defense strategy, deterrence theory, and conflict escalation dynamics. Keep responses concise (2-4 sentences).",
  "General": "You are the Global Governance AI — a diplomatic intelligence assistant specializing in global conflicts, geopolitics, and international relations. Provide factual, balanced analysis. Keep responses concise (2-4 sentences).",
};

export async function handleChat(payload) {
  const messages = payload?.messages || [
    {
      role: "user",
      content: payload?.prompt || ""
    }
  ];

  const advisor = payload?.advisor || "General";

  const worldContext = getWorldStateSnapshot();
  const prompt = ADVISOR_PROMPTS[advisor] ?? ADVISOR_PROMPTS["General"];

  const builtMessages = [
    {
      role: "system",
      content: `${prompt}\n\n${worldContext}\n\nIf asked something outside geopolitics, politely redirect.`,
    },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const result = await callAI(builtMessages, { temperature: 0.75 });

  if (!result.ok) {
    return {
      reply: "I'm having trouble connecting right now. Please try again.",
      confidence: 0,
      advisor,
      ai_used: false,
      model: null,
      provider: "none",
      ai_flow: result.ai_flow,
      error: result.message,
    };
  }

  return {
    reply: result.text,
    confidence: 0.92,
    advisor,
    ai_used: true,
    model: result.model,
    provider: result.provider,
    ai_flow: result.ai_flow,
    error: null,
  };
}


export async function handleVerifyNews({ headline, content }) {
  const worldContext = getWorldStateSnapshot();

  const builtMessages = [
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
  ];

  const result = await callAI(builtMessages, { json: true, temperature: 0.3 });

  const fallback = {
    verified: false, credibility_score: 50, classification: "Unverified",
    reason: "AI verification unavailable. Try again later.", key_claims: [], confidence: 0,
  };

  if (!result.ok) {
    return { result: fallback, ai_used: false, model: null, provider: "none", ai_flow: result.ai_flow, error: result.message };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    return { result: parsed, ai_used: true, model: result.model, provider: result.provider, ai_flow: result.ai_flow, error: null };
  } catch {
    return { result: fallback, ai_used: false, model: null, provider: result.provider, ai_flow: result.ai_flow, error: "JSON parse failed" };
  }
}

export async function handleGenerateHeadlines({ recentDecisions = [] }) {
  const worldContext = getWorldStateSnapshot();

  const builtMessages = [
    {
      role: "system",
      content: `You are the Situation Room Live Intelligence System inside a geopolitical simulation.

Your job is to continuously generate viral global news events in real time and present them as an intelligence feed for a dashboard.

${worldContext}
Recent player decisions: ${recentDecisions.slice(-3).join("; ") || "None"}

For each news event:
- Generate realistic global headlines (politics, war, economy, disasters, diplomacy)
- Include both VERIFIED and UNCONFIRMED viral claims
- Do NOT assume everything is true or fake
- Evaluate credibility like an intelligence agency
- Detect misinformation patterns when applicable
- Mix real-world plausibility with uncertainty
- Some events may be viral misinformation
- Some may be partially true but exaggerated
- Major geopolitical events should NEVER be instantly marked 100% true unless strongly confirmed
- Think like: Reuters + UN Situation Room + OSINT analyst

Respond ONLY with this JSON (no markdown):
{
  "headlines": [
    {
      "headline": "...",
      "region": "e.g. Eastern Europe | Middle East | Global | Asia-Pacific | Sub-Saharan Africa | etc.",
      "category": "diplomacy|military|economy|humanitarian|security|politics|disaster",
      "source": "Reuters|AP|BBC|AFP|Al Jazeera|OSINT|Unverified",
      "time": "Xh ago",
      "summary": "2-3 sentence neutral explanation of the event",
      "credibility_score": number(0-100),
      "fake_risk": number(0-100),
      "status": "CONFIRMED|LIKELY TRUE|UNCERTAIN|DISPUTED|LIKELY FAKE",
      "impact_level": "LOW|MEDIUM|HIGH|GLOBAL CRISIS",
      "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
      "key_signals": ["signal1", "signal2", "signal3"]
    }
  ]
}

Generate exactly 5 intelligence items. Vary timestamps 1-24h ago. Include at least one DISPUTED or UNCERTAIN item. Vary regions and categories.`,
    },
    { role: "user", content: "Generate current intelligence feed." },
  ];

  const result = await callAI(builtMessages, { json: true, temperature: 0.9 });

  if (!result.ok) {
    return { headlines: FALLBACK_HEADLINES, source: "fallback", ai_used: false, model: null, provider: "none", ai_flow: result.ai_flow, error: result.message };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    const headlines = Array.isArray(parsed.headlines) && parsed.headlines.length > 0
      ? parsed.headlines
      : FALLBACK_HEADLINES;
    return { headlines, source: "ai", ai_used: true, model: result.model, provider: result.provider, ai_flow: result.ai_flow, error: null };
  } catch {
    return { headlines: FALLBACK_HEADLINES, source: "fallback", ai_used: false, model: null, provider: result.provider, ai_flow: result.ai_flow, error: "JSON parse failed" };
  }
}

export async function handleWorldState({ action = "get", patch = null }) {
  if (action === "patch" && patch && typeof patch === "object") {
    const { state, changes } = updateWorldState(patch);
    return { state, changes, action: "patch", ai_used: false };
  }
  if (action === "reset") {
    const state = resetWorldState();
    return { state, action: "reset", ai_used: false };
  }
  return { state: getWorldState(), action: "get", ai_used: false };
}

export async function handleCountryInfo({ countryName, gameContext = "" }) {
  const worldContext = getWorldStateSnapshot();
  const contextBlock = gameContext ? `\n\nGame context: ${gameContext}` : "";

  const builtMessages = [
    {
      role: "system",
      content: `You are a geopolitical intelligence analyst. Generate a realistic country intelligence brief that EXACTLY matches this JSON structure — no extra fields, no renamed fields:

{
  "name": "country name (string)",
  "capital": "capital city (string)",
  "population": "e.g. '50 million' or '1.4 billion' (string)",
  "region": "e.g. 'West Africa' or 'Southeast Asia' (string)",
  "riskLevel": number between 1 and 10 (1=stable, 10=extreme conflict),
  "stabilityScore": number between 0 and 100 (0=failed state, 100=perfectly stable),
  "leader": { "name": "current leader name", "title": "official title" },
  "summary": "2-3 sentence geopolitical overview",
  "currentSituation": "one concise sentence describing the current political/security situation",
  "timeline": [
    { "year": "year as string", "event": "brief description of key historical event" }
  ],
  "conflicts": [
    { "name": "conflict name", "status": "active|frozen|resolved", "since": "year as string" }
  ],
  "allies": ["Country1", "Country2"],
  "rivals": ["Country3", "Country4"]
}

Rules:
- riskLevel and stabilityScore must be inversely correlated (high risk = low stability)
- timeline: 4-7 entries covering key historical moments
- conflicts: 0-4 entries (empty array if none)
- allies and rivals: 2-6 entries each
- All values must be realistic and factual
- Respond ONLY with the JSON object above, no markdown, no explanation

${worldContext}${contextBlock}`,
    },
    { role: "user", content: `Generate intelligence brief for: ${countryName}` },
  ];

  const result = await callAI(builtMessages, { json: true, temperature: 0.5 });

  const fallback = {
    name: countryName,
    capital: "Unknown",
    population: "Unknown",
    region: "Unknown",
    riskLevel: 5,
    stabilityScore: 50,
    leader: { name: "Unknown", title: "Head of State" },
    summary: "Intelligence data unavailable for this territory.",
    currentSituation: "Current situation unclear.",
    timeline: [{ year: "N/A", event: "No historical data available." }],
    conflicts: [],
    allies: [],
    rivals: [],
  };

  if (!result.ok) {
    return { info: fallback, source: "fallback", ai_used: false, model: null, provider: "none", ai_flow: result.ai_flow, error: result.message };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));

    // Validate and normalize the parsed result to match CountryRecord structure
    const info = {
      name: typeof parsed.name === "string" ? parsed.name : countryName,
      capital: typeof parsed.capital === "string" ? parsed.capital : "Unknown",
      population: typeof parsed.population === "string" ? parsed.population : "Unknown",
      region: typeof parsed.region === "string" ? parsed.region : "Unknown",
      riskLevel: Math.min(10, Math.max(1, Math.round(Number(parsed.riskLevel) || 5))),
      stabilityScore: Math.min(100, Math.max(0, Math.round(Number(parsed.stabilityScore) || 50))),
      leader: {
        name: typeof parsed.leader?.name === "string" ? parsed.leader.name : "Unknown",
        title: typeof parsed.leader?.title === "string" ? parsed.leader.title : "Head of State",
      },
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      currentSituation: typeof parsed.currentSituation === "string" ? parsed.currentSituation : fallback.currentSituation,
      timeline: Array.isArray(parsed.timeline)
        ? parsed.timeline.filter(e => e && typeof e.year === "string" && typeof e.event === "string")
        : fallback.timeline,
      conflicts: Array.isArray(parsed.conflicts)
        ? parsed.conflicts.filter(c => c && typeof c.name === "string").map(c => ({
            name: c.name,
            status: ["active", "frozen", "resolved"].includes(c.status) ? c.status : "active",
            since: typeof c.since === "string" ? c.since : "Unknown",
          }))
        : [],
      allies: Array.isArray(parsed.allies) ? parsed.allies.filter(a => typeof a === "string") : [],
      rivals: Array.isArray(parsed.rivals) ? parsed.rivals.filter(r => typeof r === "string") : [],
    };

    return { info, source: "ai", ai_used: true, model: result.model, provider: result.provider, ai_flow: result.ai_flow, error: null };
  } catch {
    return { info: fallback, source: "fallback", ai_used: false, model: null, provider: result.provider, ai_flow: result.ai_flow, error: "JSON parse failed" };
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

  const builtMessages = [
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
  ];

  const result = await callAI(builtMessages, { json: true, temperature: 0.85 });

  if (!result.ok) {
    return { scenario: buildFallbackScenario(scenarioCount), source: "fallback", ai_used: false, model: null, provider: "none", ai_flow: result.ai_flow, error: result.message };
  }

  try {
    const parsed = JSON.parse(stripJsonFences(result.text));
    return { scenario: parsed, source: "ai", ai_used: true, model: result.model, provider: result.provider, ai_flow: result.ai_flow, error: null };
  } catch {
    return { scenario: buildFallbackScenario(scenarioCount), source: "fallback", ai_used: false, model: null, provider: result.provider, ai_flow: result.ai_flow, error: "JSON parse failed" };
  }
}

async function finalizeDecision({ scenarioTitle, scenarioDescription, choiceLabel, suggestedOutcome, previewEffects, stats }) {
  const worldContext = getWorldStateSnapshot();

  const builtMessages = [
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
  ];

  const result = await callAI(builtMessages, { json: true, temperature: 0.75 });

  if (!result.ok) {
    const effects = previewEffects ?? { diplomacy: 0, economy: 0, security: 0, approval: -5 };
    return {
      appliedEffects: effects,
      narrativeOutcome: `Your administration's decision regarding ${scenarioTitle} has been implemented.`,
      followUp: "The international community is watching closely.",
      newsHeadline: `World Leaders React to ${scenarioTitle} Decision`,
      source: "fallback", ai_used: false, model: null, provider: "none", ai_flow: result.ai_flow, error: result.message,
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
    return { ...parsed, worldState: state, worldStateChanges: changes, source: "ai", ai_used: true, model: result.model, provider: result.provider, ai_flow: result.ai_flow, error: null };
  } catch {
    return {
      appliedEffects: previewEffects ?? {},
      narrativeOutcome: `Decision on ${scenarioTitle} has been executed.`,
      followUp: "Consequences are still unfolding.",
      newsHeadline: `${scenarioTitle}: Administration Acts`,
      source: "fallback", ai_used: false, model: null, provider: result.provider, ai_flow: result.ai_flow, error: "JSON parse failed",
    };
  }
}

async function getAdvisorSuggestion({ question, stats, currentScenario, decisionHistory }) {
  const worldContext = getWorldStateSnapshot();

  const builtMessages = [
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
  ];

  const result = await callAI(builtMessages, { temperature: 0.7 });

  if (!result.ok) {
    return { suggestion: "I'm unable to advise at this time. Trust your instincts.", ai_used: false, model: null, provider: "none", ai_flow: result.ai_flow, error: result.message };
  }

  return { suggestion: result.text, ai_used: true, model: result.model, provider: result.provider, ai_flow: result.ai_flow, error: null };
}

let _engineHits = 0;
let _lastRequest = null;
const _engineStartTime = Date.now();

export function recordEngineHit(type, payload) {
  _engineHits++;
  _lastRequest = { type, payload, timestamp: new Date().toISOString() };
}

export function recordEngineError(type, error) {}

export async function handleDebug() {
  const { getLogs } = await import("./debug.js");
  const logs = getLogs();
  const aiLogs = logs.filter((l) => l.ai_used);
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) / logs.length)
    : 0;
  const errors = logs.filter((l) => l.error).map((l) => ({ type: l.type, error: l.error, timestamp: l.timestamp }));
  const state = getWorldState();

  const ai_status = await getProviderStatus();

  return {
    system_status: "healthy",
    ai_status,
    openai_connected: ai_status.openai === "working" || ai_status.openrouter === "working",
    engine_hits: _engineHits,
    uptime_ms: Date.now() - _engineStartTime,
    latency_ms_avg: avgLatency,
    total_requests: logs.length,
    ai_calls: aiLogs.length,
    world_state_size: Object.keys(state).length,
    last_request: _lastRequest,
    last_errors: errors.slice(0, 10),
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
