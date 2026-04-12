import { createServerFn } from "@tanstack/react-start";
import {
  geminiGenerateFromMessages,
  geminiGenerateImage,
  getGeminiApiKey,
  stripJsonMarkdown,
} from "@/lib/gemini";

function normalizeScenario(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (!title || !description) return null;
  const imagePrompt = typeof o.imagePrompt === "string" ? o.imagePrompt.trim() : "";

  const mapOpt = (x: unknown) => {
    if (!x || typeof x !== "object") return null;
    const opt = x as Record<string, unknown>;
    const label = typeof opt.label === "string" ? opt.label.trim() : "";
    const outcome = typeof opt.outcome === "string" ? opt.outcome.trim() : "";
    const eff =
      opt.effects && typeof opt.effects === "object" && !Array.isArray(opt.effects)
        ? (opt.effects as Record<string, unknown>)
        : {};
    const num = (k: string) => {
      const v = eff[k];
      return typeof v === "number" && Number.isFinite(v) ? v : Number(v);
    };
    const effects = {
      diplomacy: num("diplomacy") || 0,
      economy: num("economy") || 0,
      security: num("security") || 0,
      approval: num("approval") || 0,
    };
    const preview = opt.preview as Record<string, unknown> | undefined;
    const mapPrev = (p: unknown): { diplomacy: number; economy: number; security: number; approval: number } | undefined => {
      if (!p || typeof p !== "object") return undefined;
      const px = p as Record<string, unknown>;
      const n2 = (k: string) => { const v = px[k]; return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0; };
      return { diplomacy: n2("diplomacy"), economy: n2("economy"), security: n2("security"), approval: n2("approval") };
    };
    if (!label || !outcome) return null;
    return { label, effects, outcome, preview: preview ? mapPrev(preview) : undefined };
  };

  const rawOpts = Array.isArray(o.options) ? o.options : [];
  const options = rawOpts.map(mapOpt).filter(Boolean) as {
    label: string;
    effects: Record<string, number>;
    outcome: string;
    preview?: Record<string, number>;
  }[];
  if (options.length < 2) return null;

  return { title, description, imagePrompt, options: options.slice(0, 5) };
}

const FALLBACK_SCENARIOS = [
  {
    title: "Border Refugee Crisis",
    description: "Neighboring country reports mass displacement. 50,000 civilians are heading toward your border. Your advisors are divided on how to respond.",
    imagePrompt: "Dawn at a tense national border: aid tents, long lines of people in winter coats, military vehicles in silhouette, dust and cold light, emotional but dignified news illustration.",
    options: [
      { label: "Open borders & provide humanitarian aid", effects: { diplomacy: 20, economy: -10, security: -5, approval: 15 }, outcome: "International praise pours in. Humanitarian organizations laud the decision. However, opposition parties raise concerns about resource strain and security vetting.", preview: { diplomacy: 20, economy: -10, security: -5, approval: 15 } },
      { label: "Deploy military to secure border", effects: { diplomacy: -15, economy: 5, security: 20, approval: -10 }, outcome: "Border is secured but international community condemns the action. Sanctions are threatened by the UN Human Rights Council.", preview: { diplomacy: -15, economy: 5, security: 20, approval: -10 } },
      { label: "Negotiate joint processing with neighbor", effects: { diplomacy: 15, economy: -5, security: 10, approval: 10 }, outcome: "Bilateral talks begin. A shared processing center is established. Both nations share the burden while maintaining security.", preview: { diplomacy: 15, economy: -5, security: 10, approval: 10 } },
    ],
  },
  {
    title: "Cyber Attack on Infrastructure",
    description: "A sophisticated cyber attack has disabled power grids in three major cities. Intelligence suggests a state-sponsored actor is responsible.",
    imagePrompt: "Night city skyline with darkened towers, red emergency lighting, holographic data streams collapsing, analysts in a crisis room lit by monitors, dramatic noir palette.",
    options: [
      { label: "Launch retaliatory cyber operation", effects: { diplomacy: -20, economy: -5, security: 15, approval: 5 }, outcome: "Your cyber team successfully disrupts the attacker's infrastructure. However, escalation fears rise globally.", preview: { diplomacy: -20, economy: -5, security: 15, approval: 5 } },
      { label: "Engage diplomatic channels first", effects: { diplomacy: 15, economy: 0, security: -5, approval: -5 }, outcome: "Diplomatic talks begin but progress is slow. Critics accuse you of weakness while power remains out for citizens.", preview: { diplomacy: 15, economy: 0, security: -5, approval: -5 } },
      { label: "Declare emergency & rebuild defenses", effects: { diplomacy: 5, economy: -15, security: 10, approval: 10 }, outcome: "Massive investment in cyber infrastructure begins. Grid is restored in 48 hours with significantly improved defenses.", preview: { diplomacy: 5, economy: -15, security: 10, approval: 10 } },
    ],
  },
  {
    title: "Economic Sanctions Threat",
    description: "A powerful trading bloc threatens economic sanctions unless you comply with their demands on human rights and trade policies. Your economy is already under strain.",
    imagePrompt: "Tense meeting room in glass skyscraper, suited negotiators at long table, city skyline in background, stacks of documents, flags on stands, cold blue lighting.",
    options: [
      { label: "Accept partial compliance", effects: { diplomacy: 10, economy: 15, security: 0, approval: -5 }, outcome: "Trade relations stabilize but domestic critics call it a capitulation. Your sovereignty narrative takes a hit.", preview: { diplomacy: 10, economy: 15, security: 0, approval: -5 } },
      { label: "Refuse and seek alternative partners", effects: { diplomacy: -10, economy: -20, security: 5, approval: 10 }, outcome: "National pride surges but economic pain increases. New partnerships with non-Western nations begin forming.", preview: { diplomacy: -10, economy: -20, security: 5, approval: 10 } },
      { label: "Call international mediation", effects: { diplomacy: 20, economy: -5, security: 0, approval: 5 }, outcome: "A neutral forum is established. The dispute enters prolonged negotiation but immediate sanctions are delayed.", preview: { diplomacy: 20, economy: -5, security: 0, approval: 5 } },
    ],
  },
];

export const generateScenario = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      stats: Record<string, number>;
      previousDecisions: string[];
      scenarioCount: number;
      worldEvents?: string[];
    }) => {
      if (!input.stats || typeof input.scenarioCount !== "number") throw new Error("Invalid input");
      if (input.previousDecisions.length > 100) throw new Error("Too many previous decisions");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      console.warn("[PresidentialSim] GEMINI_API_KEY not set — using fallback scenario");
      const scenario = FALLBACK_SCENARIOS[data.scenarioCount % FALLBACK_SCENARIOS.length];
      return { scenario, error: null, source: "fallback" as const };
    }

    try {
      const recentDecisions = data.previousDecisions.slice(-8);
      const worldContext = data.worldEvents?.slice(-5).join("; ") || "";

      const result = await geminiGenerateFromMessages({
        apiKey,
        responseMimeType: "application/json",
        messages: [
          {
            role: "system",
            content: `You are a presidential crisis scenario generator for an immersive geopolitical simulation game. The player is acting as the head of state.

Current player stats:
- Diplomacy: ${data.stats.diplomacy}/100 (${data.stats.diplomacy < 30 ? "dangerously low" : data.stats.diplomacy > 70 ? "strong" : "moderate"})
- Economy: ${data.stats.economy}/100 (${data.stats.economy < 30 ? "in recession" : data.stats.economy > 70 ? "thriving" : "stable"})
- Security: ${data.stats.security}/100 (${data.stats.security < 30 ? "critical vulnerability" : data.stats.security > 70 ? "well defended" : "adequate"})
- Approval: ${data.stats.approval}/100 (${data.stats.approval < 30 ? "political crisis" : data.stats.approval > 70 ? "strong mandate" : "contested"})

Previous decisions (most recent): ${recentDecisions.join("; ") || "None yet — this is the first scenario."}
${worldContext ? `Recent world events context: ${worldContext}` : ""}
This is scenario #${data.scenarioCount + 1}.

CRITICAL RULES:
1. REACT to and BUILD on previous decisions — if player was aggressive, show escalation; if diplomatic, show cooperation
2. Target the player's weakest stat with pressure (create drama around it)
3. Make all 3 options feel viable with genuine tradeoffs
4. Never make one option obviously "best"
5. Decisions should feel consequential and connected to the evolving narrative

Respond in this exact JSON format (no markdown, pure JSON):
{
  "title": "Short, punchy crisis title (3-6 words)",
  "description": "2-3 vivid sentences describing the crisis, referencing relevant history if applicable",
  "imagePrompt": "Dense paragraph describing a cinematic editorial illustration: specific setting, generic human silhouettes (NO named politicians), mood, lighting, key symbolic objects, color palette. No text or logos in scene.",
  "options": [
    {
      "label": "Action label (5-9 words)",
      "effects": { "diplomacy": integer(-25 to 25), "economy": integer(-25 to 25), "security": integer(-25 to 25), "approval": integer(-25 to 25) },
      "preview": { "diplomacy": integer(-25 to 25), "economy": integer(-25 to 25), "security": integer(-25 to 25), "approval": integer(-25 to 25) },
      "outcome": "2-3 vivid sentences describing what happens after this choice"
    }
  ]
}

The "preview" should show estimated effects visible BEFORE the player decides. Make them slightly different from actual "effects" for realism (actual consequences can be worse or better than predicted).
Generate exactly 3 options.`,
          },
          {
            role: "user",
            content: `Generate a compelling crisis scenario for decision #${data.scenarioCount + 1}.`,
          },
        ],
      });

      if (!result.ok) {
        console.error(`[PresidentialSim] Gemini error ${result.status}: ${result.message} — using fallback`);
        const scenario = FALLBACK_SCENARIOS[data.scenarioCount % FALLBACK_SCENARIOS.length];
        return { scenario, error: null, source: "fallback" as const };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonMarkdown(result.text));
      } catch (parseErr) {
        console.error("[PresidentialSim] JSON parse error:", parseErr);
        const scenario = FALLBACK_SCENARIOS[data.scenarioCount % FALLBACK_SCENARIOS.length];
        return { scenario, error: null, source: "fallback" as const };
      }

      const scenario = normalizeScenario(parsed);
      if (!scenario) {
        console.warn("[PresidentialSim] Scenario normalization failed — using fallback");
        const fallback = FALLBACK_SCENARIOS[data.scenarioCount % FALLBACK_SCENARIOS.length];
        return { scenario: fallback, error: null, source: "fallback" as const };
      }

      return { scenario, error: null, source: "ai" as const };
    } catch (error) {
      console.error("[PresidentialSim] Unexpected error:", error, "— using fallback");
      const scenario = FALLBACK_SCENARIOS[data.scenarioCount % FALLBACK_SCENARIOS.length];
      return { scenario, error: null, source: "fallback" as const };
    }
  });

export const generateOutcome = createServerFn({ method: "POST" })
  .inputValidator((input: { scenario: string; choice: string; stats: Record<string, number>; decisionHistory: string[] }) => {
    if (!input.scenario || !input.choice) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return { followUp: null, newsHeadline: null };

    try {
      const result = await geminiGenerateFromMessages({
        apiKey,
        responseMimeType: "application/json",
        messages: [
          {
            role: "system",
            content: `You are a presidential simulation narrator and news generator. Given a scenario decision, generate:
1. A dramatic teaser about what consequences follow next
2. A realistic news headline about this decision

Respond in JSON:
{
  "followUp": "1-2 sentence dramatic teaser hinting at next scenario consequences",
  "newsHeadline": "Realistic AP/Reuters-style news headline about this decision (10-15 words)"
}`,
          },
          {
            role: "user",
            content: `Scenario: ${data.scenario}\nChoice made: ${data.choice}\nCurrent stats: ${JSON.stringify(data.stats)}\nDecision history: ${data.decisionHistory.slice(-3).join("; ")}`,
          },
        ],
      });

      if (!result.ok) return { followUp: null, newsHeadline: null };

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonMarkdown(result.text));
      } catch {
        return { followUp: result.text?.slice(0, 200) || null, newsHeadline: null };
      }

      const p = parsed as Record<string, unknown>;
      return {
        followUp: typeof p.followUp === "string" ? p.followUp : null,
        newsHeadline: typeof p.newsHeadline === "string" ? p.newsHeadline : null,
      };
    } catch {
      return { followUp: null, newsHeadline: null };
    }
  });

export const generateScenarioIllustrations = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; description: string; imagePrompt?: string }) => {
    if (!input.title?.trim() || !input.description?.trim()) throw new Error("Invalid input");
    if (input.title.length > 200 || input.description.length > 4000) throw new Error("Input too long");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return { imageDataUrls: [] as string[], error: "AI service not configured" };
    }

    const visual =
      data.imagePrompt?.trim() ||
      `Crisis scene for a head-of-state simulation: ${data.title}. ${data.description}`;

    const prompt = [
      "Create a single editorial illustration, painterly or print-news style.",
      "No readable text, no logos, no real-world politician or celebrity likenesses.",
      "Subject and composition:",
      visual.slice(0, 1200),
    ].join(" ");

    const result = await geminiGenerateImage({ apiKey, prompt });
    if (!result.ok) {
      console.error(`[PresidentialSim] Image generation error ${result.status}: ${result.message}`);
      return { imageDataUrls: [] as string[], error: result.message };
    }
    return { imageDataUrls: result.dataUrls, error: null as string | null };
  });

export const getAdvisorSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      question: string;
      stats: Record<string, number>;
      currentScenario?: string;
      decisionHistory: string[];
    }) => {
      if (!input.question?.trim()) throw new Error("Question required");
      if (input.question.length > 500) throw new Error("Question too long");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      return {
        advice: `As your chief advisor, I recommend a balanced approach considering your current stats. Your diplomacy is at ${data.stats.diplomacy}, economy at ${data.stats.economy}, security at ${data.stats.security}, and approval at ${data.stats.approval}. Focus on strengthening your weakest area while maintaining alliances. (AI service not configured — this is placeholder advice)`,
        source: "mock" as const,
      };
    }

    try {
      const result = await geminiGenerateFromMessages({
        apiKey,
        messages: [
          {
            role: "system",
            content: `You are the player's chief strategic advisor in a presidential simulation. You have access to all classified intel and speak frankly.

Player's current stats: Diplomacy=${data.stats.diplomacy}/100, Economy=${data.stats.economy}/100, Security=${data.stats.security}/100, Approval=${data.stats.approval}/100.
${data.currentScenario ? `Current crisis: ${data.currentScenario}` : ""}
Recent decisions: ${data.decisionHistory.slice(-5).join("; ") || "None yet"}

Provide strategic, contextual advice. Be direct and opinionated. Consider the political consequences. Keep response to 3-5 sentences max. Sound like a seasoned political operative, not a textbook.`,
          },
          {
            role: "user",
            content: data.question,
          },
        ],
      });

      if (!result.ok) {
        return { advice: "I'm unable to provide advice at this moment. Please try again.", source: "error" as const };
      }

      return { advice: result.text || "No advice available.", source: "ai" as const };
    } catch {
      return { advice: "Advisor system temporarily unavailable.", source: "error" as const };
    }
  });

export const generateNewsHeadlines = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      stats: Record<string, number>;
      recentDecisions: string[];
      worldEvents: string[];
    }) => {
      if (!input.stats) throw new Error("Stats required");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();

    const mockHeadlines = [
      { headline: "Global Stability Index Falls to Three-Year Low", source: "Reuters", category: "global", time: "2h ago" },
      { headline: "UN Security Council Calls Emergency Session on Regional Tensions", source: "AP News", category: "diplomacy", time: "4h ago" },
      { headline: "Economic Markets Volatile Amid Geopolitical Uncertainty", source: "Bloomberg", category: "economy", time: "6h ago" },
      { headline: "Humanitarian Aid Organizations Scale Up Operations in Conflict Zones", source: "BBC", category: "humanitarian", time: "8h ago" },
    ];

    if (!apiKey) {
      return { headlines: mockHeadlines, source: "mock" as const };
    }

    try {
      const result = await geminiGenerateFromMessages({
        apiKey,
        responseMimeType: "application/json",
        messages: [
          {
            role: "system",
            content: `You are a global news wire generator for a geopolitical simulation. Based on the current game state, generate 4-6 realistic, evolving news headlines that reflect the world's reaction to the player's decisions.

Current game state:
- Diplomacy: ${data.stats.diplomacy}/100
- Economy: ${data.stats.economy}/100
- Security: ${data.stats.security}/100
- Approval: ${data.stats.approval}/100
- Recent player decisions: ${data.recentDecisions.slice(-3).join("; ") || "None yet"}
- World events: ${data.worldEvents.slice(-5).join("; ") || "None yet"}

Respond with JSON:
{
  "headlines": [
    {
      "headline": "News headline (10-15 words)",
      "source": "News agency name",
      "category": "diplomacy|military|economy|humanitarian|domestic",
      "time": "Xh ago"
    }
  ]
}

Make headlines feel like real wire service reporting. Reference the player's decisions where applicable. Vary the time stamps from 1-24 hours ago.`,
          },
          {
            role: "user",
            content: "Generate current global news headlines based on the game state.",
          },
        ],
      });

      if (!result.ok) return { headlines: mockHeadlines, source: "mock" as const };

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonMarkdown(result.text));
      } catch {
        return { headlines: mockHeadlines, source: "mock" as const };
      }

      const p = parsed as Record<string, unknown>;
      if (!Array.isArray(p.headlines)) return { headlines: mockHeadlines, source: "mock" as const };

      const headlines = (p.headlines as unknown[])
        .map((h) => {
          if (!h || typeof h !== "object") return null;
          const x = h as Record<string, unknown>;
          return {
            headline: typeof x.headline === "string" ? x.headline : "Breaking News",
            source: typeof x.source === "string" ? x.source : "Reuters",
            category: typeof x.category === "string" ? x.category : "global",
            time: typeof x.time === "string" ? x.time : "1h ago",
          };
        })
        .filter(Boolean) as typeof mockHeadlines;

      return { headlines: headlines.length > 0 ? headlines : mockHeadlines, source: "ai" as const };
    } catch {
      return { headlines: mockHeadlines, source: "mock" as const };
    }
  });
