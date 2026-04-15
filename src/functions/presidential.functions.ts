import { createServerFn } from "@tanstack/react-start";
import { openAIChat, openAIGenerateImage, stripJsonFences, getOpenAIKey } from "@/lib/openai";
import { buildProceduralScenario } from "@/lib/proceduralCrisis";
import { applyDecisionImpact, getWorldStateSnapshot } from "@/lib/worldState";

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
    const mapPrev = (p: unknown) => {
      if (!p || typeof p !== "object") return undefined;
      const px = p as Record<string, unknown>;
      const n2 = (k: string) => { const v = px[k]; return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0; };
      return { diplomacy: n2("diplomacy"), economy: n2("economy"), security: n2("security"), approval: n2("approval") };
    };
    if (!label || !outcome) return null;
    const mappedPreview = preview ? mapPrev(preview) : undefined;
    return {
      label,
      effects,
      outcome,
      preview: mappedPreview ?? { diplomacy: effects.diplomacy, economy: effects.economy, security: effects.security, approval: effects.approval },
    };
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

function clampEffect(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(-25, Math.min(25, Math.round(v)));
}

export const generateScenario = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      stats: Record<string, number>;
      previousDecisions: string[];
      scenarioCount: number;
      worldEvents?: string[];
      country?: string;
    }) => {
      if (!input.stats || typeof input.scenarioCount !== "number") throw new Error("Invalid input");
      if (input.previousDecisions.length > 100) throw new Error("Too many previous decisions");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const apiKey = getOpenAIKey();
    const worldContext = getWorldStateSnapshot();

    if (!apiKey) {
      const scenario = buildProceduralScenario({
        stats: data.stats,
        previousDecisions: data.previousDecisions,
        scenarioCount: data.scenarioCount,
      });
      return { scenario, error: null, source: "fallback" as const };
    }

    try {
      const recentDecisions = data.previousDecisions.slice(-8);
      const worldEvents = data.worldEvents?.slice(-5).join("; ") || "";

      const result = await openAIChat({
        json: true,
        temperature: 0.85,
        messages: [
          {
            role: "system",
            content: `You are a presidential crisis scenario generator for an immersive geopolitical simulation.${data.country ? ` The player leads ${data.country} — scenarios must reflect its real geopolitical pressures, rivals, and alliances.` : ""}

${worldContext}

Player stats:
- Diplomacy: ${data.stats.diplomacy}/100 (${data.stats.diplomacy < 30 ? "dangerously low" : data.stats.diplomacy > 70 ? "strong" : "moderate"})
- Economy: ${data.stats.economy}/100 (${data.stats.economy < 30 ? "in recession" : data.stats.economy > 70 ? "thriving" : "stable"})
- Security: ${data.stats.security}/100 (${data.stats.security < 30 ? "critical vulnerability" : data.stats.security > 70 ? "well defended" : "adequate"})
- Approval: ${data.stats.approval}/100 (${data.stats.approval < 30 ? "political crisis" : data.stats.approval > 70 ? "strong mandate" : "contested"})

Previous decisions: ${recentDecisions.join("; ") || "None yet"}
${worldEvents ? `Recent world events: ${worldEvents}` : ""}
Scenario #${data.scenarioCount + 1}.

RULES: React to previous decisions, target weakest stat, make all 3 options feel viable with real tradeoffs, never make one obviously "best".

Respond ONLY with this exact JSON:
{
  "title": "Short punchy crisis title (3-6 words)",
  "description": "2-3 vivid sentences describing the crisis",
  "imagePrompt": "Dense paragraph: cinematic crisis scene, specific setting, silhouetted figures, mood/lighting, symbolic objects, color palette. NO named politicians, no text.",
  "options": [
    {
      "label": "Action label (5-9 words)",
      "effects": { "diplomacy": int, "economy": int, "security": int, "approval": int },
      "preview": { "diplomacy": int, "economy": int, "security": int, "approval": int },
      "outcome": "2-3 vivid sentences of what happens"
    }
  ]
}
Generate exactly 3 options. All effect values between -25 and 25. Preview slightly differs from effects for realism.`,
          },
          {
            role: "user",
            content: `Generate scenario #${data.scenarioCount + 1}.`,
          },
        ],
      });

      if (!result.ok) {
        const scenario = buildProceduralScenario({ stats: data.stats, previousDecisions: data.previousDecisions, scenarioCount: data.scenarioCount });
        return { scenario, error: null, source: "fallback" as const };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonFences(result.text));
      } catch {
        const scenario = buildProceduralScenario({ stats: data.stats, previousDecisions: data.previousDecisions, scenarioCount: data.scenarioCount });
        return { scenario, error: null, source: "fallback" as const };
      }

      const scenario = normalizeScenario(parsed);
      if (!scenario) {
        const fallback = buildProceduralScenario({ stats: data.stats, previousDecisions: data.previousDecisions, scenarioCount: data.scenarioCount });
        return { scenario: fallback, error: null, source: "fallback" as const };
      }

      return { scenario, error: null, source: "ai" as const };
    } catch (error) {
      const scenario = buildProceduralScenario({ stats: data.stats, previousDecisions: data.previousDecisions, scenarioCount: data.scenarioCount });
      return { scenario, error: null, source: "fallback" as const };
    }
  });

export const finalizeDecision = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      scenarioTitle: string;
      scenarioDescription: string;
      choiceLabel: string;
      suggestedOutcome: string;
      previewEffects: Record<string, number>;
      fallbackEffects: Record<string, number>;
      stats: Record<string, number>;
      decisionHistory: string[];
    }) => {
      if (!input.scenarioDescription?.trim() || !input.choiceLabel?.trim()) throw new Error("Invalid input");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const clampedFallback = {
      diplomacy: clampEffect(data.fallbackEffects?.diplomacy),
      economy: clampEffect(data.fallbackEffects?.economy),
      security: clampEffect(data.fallbackEffects?.security),
      approval: clampEffect(data.fallbackEffects?.approval),
    };

    const wireHeadline = () => {
      const t = data.scenarioTitle.trim();
      const short = t.length > 42 ? `${t.slice(0, 42)}…` : t;
      return `Global Pulse: ${short} — cabinet backs "${data.choiceLabel.slice(0, 32)}${data.choiceLabel.length > 32 ? "…" : ""}"`;
    };

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      applyDecisionImpact({ ...clampedFallback, headline: wireHeadline() });
      return {
        appliedEffects: clampedFallback,
        narrativeOutcome: data.suggestedOutcome,
        followUp: "Capitals recalibrate overnight; expect knock-on pressure in your next briefing.",
        newsHeadline: wireHeadline(),
        source: "procedural" as const,
      };
    }

    try {
      const worldContext = getWorldStateSnapshot();
      const result = await openAIChat({
        json: true,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `Finalize a presidential simulation decision turn.

${worldContext}

Staff estimate deltas: ${JSON.stringify(data.previewEffects)}
Operations baseline deltas: ${JSON.stringify(data.fallbackEffects)}

Return ONLY this JSON:
{
  "appliedEffects": { "diplomacy": int, "economy": int, "security": int, "approval": int },
  "narrativeOutcome": "2-4 vivid sentences — what actually happened on the ground",
  "followUp": "1-2 sentence teaser for the next crisis",
  "newsHeadline": "Wire-service headline, max 14 words, no quotes inside"
}

appliedEffects values between -25 and 25. Usually close to baseline but may deviate slightly for realism.`,
          },
          {
            role: "user",
            content: `Crisis: ${data.scenarioTitle}\nSituation: ${data.scenarioDescription}\nChoice: ${data.choiceLabel}\nDraft outcome: ${data.suggestedOutcome}\nCurrent stats: ${JSON.stringify(data.stats)}\nRecent decisions: ${data.decisionHistory.slice(-5).join(" | ") || "None"}`,
          },
        ],
      });

      if (!result.ok) {
        applyDecisionImpact({ ...clampedFallback, headline: wireHeadline() });
        return { appliedEffects: clampedFallback, narrativeOutcome: data.suggestedOutcome, followUp: null, newsHeadline: wireHeadline(), source: "fallback" as const };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonFences(result.text));
      } catch {
        applyDecisionImpact({ ...clampedFallback, headline: wireHeadline() });
        return { appliedEffects: clampedFallback, narrativeOutcome: data.suggestedOutcome, followUp: null, newsHeadline: wireHeadline(), source: "fallback" as const };
      }

      const p = parsed as Record<string, unknown>;
      const eff = p.appliedEffects;
      let appliedEffects = clampedFallback;
      if (eff && typeof eff === "object" && !Array.isArray(eff)) {
        const e = eff as Record<string, unknown>;
        appliedEffects = {
          diplomacy: clampEffect(e.diplomacy),
          economy: clampEffect(e.economy),
          security: clampEffect(e.security),
          approval: clampEffect(e.approval),
        };
      }

      const headline =
        typeof p.newsHeadline === "string" && p.newsHeadline.trim()
          ? p.newsHeadline.trim()
          : wireHeadline();

      applyDecisionImpact({ ...appliedEffects, headline });

      return {
        appliedEffects,
        narrativeOutcome: typeof p.narrativeOutcome === "string" && p.narrativeOutcome.trim() ? p.narrativeOutcome.trim() : data.suggestedOutcome,
        followUp: typeof p.followUp === "string" && p.followUp.trim() ? p.followUp.trim() : null,
        newsHeadline: headline,
        source: "ai" as const,
      };
    } catch {
      applyDecisionImpact({ ...clampedFallback, headline: wireHeadline() });
      return { appliedEffects: clampedFallback, narrativeOutcome: data.suggestedOutcome, followUp: null, newsHeadline: wireHeadline(), source: "fallback" as const };
    }
  });

export const generateScenarioIllustrations = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; description: string; imagePrompt?: string }) => {
    if (!input.title?.trim() || !input.description?.trim()) throw new Error("Invalid input");
    if (input.title.length > 200 || input.description.length > 4000) throw new Error("Input too long");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      return { imageDataUrls: [] as string[], error: "AI service not configured" };
    }

    const visual =
      data.imagePrompt?.trim() ||
      `Editorial crisis illustration for: ${data.title}. ${data.description.slice(0, 300)}`;

    const prompt = `Cinematic editorial illustration, painterly news style. No text, no logos, no real politician likenesses. ${visual.slice(0, 900)}`;

    try {
      const result = await openAIGenerateImage({ prompt });
      if (!result.ok) return { imageDataUrls: [] as string[], error: result.message };
      return { imageDataUrls: [result.url], error: null as string | null };
    } catch {
      return { imageDataUrls: [] as string[], error: "Image generation failed" };
    }
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
    const apiKey = getOpenAIKey();
    const worldContext = getWorldStateSnapshot();

    if (!apiKey) {
      return {
        advice: `Your current stats: Diplomacy ${data.stats.diplomacy}, Economy ${data.stats.economy}, Security ${data.stats.security}, Approval ${data.stats.approval}. Focus on your weakest pillar.`,
        source: "mock" as const,
      };
    }

    try {
      const result = await openAIChat({
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `You are the player's chief strategic advisor in a presidential simulation. Speak frankly, like a seasoned political operative.

${worldContext}
Player stats: Diplomacy=${data.stats.diplomacy}/100, Economy=${data.stats.economy}/100, Security=${data.stats.security}/100, Approval=${data.stats.approval}/100.
${data.currentScenario ? `Current crisis: ${data.currentScenario}` : ""}
Recent decisions: ${data.decisionHistory.slice(-5).join("; ") || "None yet"}

Be direct and opinionated. 3-5 sentences max.`,
          },
          { role: "user", content: data.question },
        ],
      });

      if (!result.ok) return { advice: "Advisor unavailable. Try again.", source: "error" as const };
      return { advice: result.text || "No advice available.", source: "ai" as const };
    } catch {
      return { advice: "Advisor system temporarily unavailable.", source: "error" as const };
    }
  });

export const generateNewsHeadlines = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { stats: Record<string, number>; recentDecisions: string[]; worldEvents: string[] }) => {
      if (!input.stats) throw new Error("Stats required");
      return input;
    }
  )
  .handler(async ({ data }) => {
    const mockHeadlines = [
      { headline: "Global Stability Index Falls to Three-Year Low", source: "Reuters", category: "global", time: "2h ago" },
      { headline: "UN Security Council Calls Emergency Session on Regional Tensions", source: "AP News", category: "diplomacy", time: "4h ago" },
      { headline: "Economic Markets Volatile Amid Geopolitical Uncertainty", source: "Bloomberg", category: "economy", time: "6h ago" },
      { headline: "Humanitarian Aid Organizations Scale Up Operations in Conflict Zones", source: "BBC", category: "humanitarian", time: "8h ago" },
    ];

    const apiKey = getOpenAIKey();
    const worldContext = getWorldStateSnapshot();
    if (!apiKey) return { headlines: mockHeadlines, source: "mock" as const };

    try {
      const result = await openAIChat({
        json: true,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: `You are a global news wire generator. Generate realistic headlines reflecting the current world simulation state.

${worldContext}
Player decisions (recent): ${data.recentDecisions.slice(-3).join("; ") || "None"}

Respond ONLY with JSON:
{ "headlines": [{ "headline": "...", "source": "Reuters/AP/BBC/AFP/Al Jazeera", "category": "diplomacy|military|economy|humanitarian|domestic", "time": "Xh ago" }] }

Generate 4-6 headlines. Vary timestamps 1-24h ago. Make them feel like real wire service reporting.`,
          },
          { role: "user", content: "Generate current headlines." },
        ],
      });

      if (!result.ok) return { headlines: mockHeadlines, source: "mock" as const };

      let parsed: unknown;
      try { parsed = JSON.parse(stripJsonFences(result.text)); } catch { return { headlines: mockHeadlines, source: "mock" as const }; }

      const p = parsed as Record<string, unknown>;
      if (!Array.isArray(p.headlines)) return { headlines: mockHeadlines, source: "mock" as const };

      const headlines = (p.headlines as unknown[]).map((h) => {
        if (!h || typeof h !== "object") return null;
        const x = h as Record<string, unknown>;
        return {
          headline: typeof x.headline === "string" ? x.headline : "Breaking News",
          source: typeof x.source === "string" ? x.source : "Reuters",
          category: typeof x.category === "string" ? x.category : "global",
          time: typeof x.time === "string" ? x.time : "1h ago",
        };
      }).filter(Boolean) as typeof mockHeadlines;

      return { headlines: headlines.length > 0 ? headlines : mockHeadlines, source: "ai" as const };
    } catch {
      return { headlines: mockHeadlines, source: "mock" as const };
    }
  });
