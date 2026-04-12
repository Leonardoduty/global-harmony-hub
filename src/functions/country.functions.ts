import { createServerFn } from "@tanstack/react-start";
import { geminiGenerateFromMessages, getGeminiApiKey, stripJsonMarkdown } from "@/lib/gemini";
import { getMockCountryInfo } from "@/lib/mockCountryData";

function unwrapRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const inner = o.country ?? o.data ?? o.result;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return o;
}

function normalizeCountryInfo(raw: unknown, fallbackName: string) {
  const o = unwrapRecord(raw);
  if (!o) return null;

  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : fallbackName;
  let stabilityScore =
    typeof o.stabilityScore === "number" ? o.stabilityScore : Number(String(o.stabilityScore ?? ""));
  if (!Number.isFinite(stabilityScore)) stabilityScore = 50;
  stabilityScore = Math.max(0, Math.min(100, Math.round(stabilityScore)));

  const summary =
    typeof o.summary === "string" && o.summary.trim()
      ? o.summary.trim()
      : "Geopolitical summary unavailable.";

  const mapConflict = (c: unknown) => {
    if (!c || typeof c !== "object") return null;
    const x = c as Record<string, unknown>;
    return {
      name: typeof x.name === "string" ? x.name : "Conflict",
      status: typeof x.status === "string" ? x.status : "active",
      years: typeof x.years === "string" ? x.years : "",
      description: typeof x.description === "string" ? x.description : "",
    };
  };

  const mapPeace = (p: unknown) => {
    if (!p || typeof p !== "object") return null;
    const x = p as Record<string, unknown>;
    return {
      name: typeof x.name === "string" ? x.name : "Initiative",
      year: typeof x.year === "string" ? x.year : "",
      description: typeof x.description === "string" ? x.description : "",
    };
  };

  const mapHist = (h: unknown) => {
    if (!h || typeof h !== "object") return null;
    const x = h as Record<string, unknown>;
    return {
      year: typeof x.year === "string" ? x.year : "",
      event: typeof x.event === "string" ? x.event : "",
    };
  };

  const mapLeader = (l: unknown) => {
    if (!l || typeof l !== "object") return undefined;
    const x = l as Record<string, unknown>;
    return {
      name: typeof x.name === "string" ? x.name : "Unknown",
      title: typeof x.title === "string" ? x.title : "Head of State",
      personality: typeof x.personality === "string" ? x.personality : "",
      politicalStance: typeof x.politicalStance === "string" ? x.politicalStance : "",
    };
  };

  const mapRelationships = (r: unknown) => {
    if (!r || typeof r !== "object") return undefined;
    const x = r as Record<string, unknown>;
    const toArr = (v: unknown) =>
      Array.isArray(v) ? (v.filter((s) => typeof s === "string") as string[]) : [];
    return {
      allied: toArr(x.allied),
      hostile: toArr(x.hostile),
      neutral: toArr(x.neutral),
    };
  };

  const conflicts = Array.isArray(o.conflicts)
    ? (o.conflicts.map(mapConflict).filter(Boolean) as { name: string; status: string; years: string; description: string }[])
    : [];
  const peaceInitiatives = Array.isArray(o.peaceInitiatives)
    ? (o.peaceInitiatives.map(mapPeace).filter(Boolean) as { name: string; year: string; description: string }[])
    : [];
  const history = Array.isArray(o.history)
    ? (o.history.map(mapHist).filter(Boolean) as { year: string; event: string }[])
    : [];
  const leader = mapLeader(o.leader);
  const relationships = mapRelationships(o.relationships);
  const currentSituation =
    typeof o.currentSituation === "string" && o.currentSituation.trim() ? o.currentSituation.trim() : undefined;
  const playerRelationship =
    typeof o.playerRelationship === "string" && o.playerRelationship.trim()
      ? o.playerRelationship.trim()
      : undefined;

  return {
    name,
    conflicts,
    peaceInitiatives,
    history,
    stabilityScore,
    summary,
    leader,
    relationships,
    currentSituation,
    playerRelationship,
  };
}

export const getCountryInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string; gameContext?: string }) => {
    const countryName = typeof input?.countryName === "string" ? input.countryName.trim() : "";
    if (!countryName || countryName.length > 100) {
      throw new Error("Invalid country name");
    }
    const gameContext =
      typeof input?.gameContext === "string" && input.gameContext.trim()
        ? input.gameContext.trim().slice(0, 4000)
        : undefined;
    return { countryName, gameContext };
  })
  .handler(async ({ data }) => {
    const serveMock = (reason: string) => {
      console.warn(`[CountryInfo] ${reason} — mock briefing for:`, data.countryName);
      const mockInfo = getMockCountryInfo(data.countryName);
      return {
        info: mockInfo,
        error: null as string | null,
        source: "mock" as const,
        loadWarning: reason,
      };
    };

    try {
      const apiKey = getGeminiApiKey();

      if (!apiKey) {
        return serveMock("No API key configured — offline reference briefing.");
      }

      const contextBlock = data.gameContext
        ? `

The analyst is briefing a head-of-state whose administration context is:
${data.gameContext}

Adjust "relationships" (allied/hostile/neutral toward OTHER states) and "playerRelationship" to stay plausible given that context — these are simulator-facing ties, not personal opinions. Keep country names in English and match common map labels (e.g. "United States", "Russia").`
        : "";

      const result = await geminiGenerateFromMessages({
        apiKey,
        responseMimeType: "application/json",
        messages: [
          {
            role: "system",
            content: `You are a geopolitical analyst. When given a country name, provide a concise analysis in this exact JSON format:
{
  "name": "country name",
  "conflicts": [
    { "name": "conflict name", "status": "active|resolved|frozen", "years": "e.g. 2022-present", "description": "1-2 sentences" }
  ],
  "peaceInitiatives": [
    { "name": "initiative name", "year": "year or period", "description": "1-2 sentences" }
  ],
  "history": [
    { "year": "year or period", "event": "brief historical event" }
  ],
  "stabilityScore": number (0-100),
  "summary": "2-3 sentence geopolitical summary",
  "currentSituation": "one sentence: war, peace, crisis, sanctions, normalization talks, etc.",
  "playerRelationship": "one sentence: how this country likely relates to the player's administration right now",
  "leader": {
    "name": "current leader name",
    "title": "their official title",
    "personality": "3-4 word personality description",
    "politicalStance": "brief political stance"
  },
  "relationships": {
    "allied": ["Country1", "Country2"],
    "hostile": ["Country3"],
    "neutral": ["Country4", "Country5"]
  }
}

Include 2-5 items per array. Focus on real, factual data. For stabilityScore: 0=failed state, 100=perfectly stable.${contextBlock}`,
          },
          {
            role: "user",
            content: `Provide geopolitical analysis for: ${data.countryName}`,
          },
        ],
      });

      if (!result.ok) {
        console.error(`[CountryInfo] Gemini API error ${result.status}: ${result.message}`);
        return serveMock(`Gemini error ${result.status}: ${result.message}`);
      }

      const cleaned = stripJsonMarkdown(result.text);
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("[CountryInfo] JSON parse error:", parseErr, "Raw response:", cleaned.slice(0, 400));
        return serveMock("Model returned invalid JSON");
      }

      const info = normalizeCountryInfo(parsed, data.countryName);
      if (!info) {
        console.warn("[CountryInfo] Normalization failed for:", data.countryName);
        return serveMock("Could not normalize model output");
      }

      return { info, error: null as string | null, source: "ai" as const, loadWarning: null as string | null };
    } catch (error) {
      console.error("[CountryInfo] Unexpected server error:", error);
      return serveMock(error instanceof Error ? error.message : "Unexpected server error");
    }
  });
