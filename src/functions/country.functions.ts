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

  return { name, conflicts, peaceInitiatives, history, stabilityScore, summary, leader, relationships };
}

export const getCountryInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string }) => {
    if (!input.countryName || input.countryName.length > 100) {
      throw new Error("Invalid country name");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      console.warn("[CountryInfo] GEMINI_API_KEY not configured — serving mock data for:", data.countryName);
      const mockInfo = getMockCountryInfo(data.countryName);
      return { info: mockInfo, error: null, source: "mock" as const };
    }

    try {
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

Include 2-5 items per array. Focus on real, factual data. For stabilityScore: 0=failed state, 100=perfectly stable.`,
          },
          {
            role: "user",
            content: `Provide geopolitical analysis for: ${data.countryName}`,
          },
        ],
      });

      if (!result.ok) {
        console.error(`[CountryInfo] Gemini API error ${result.status}: ${result.message} — falling back to mock data`);
        const mockInfo = getMockCountryInfo(data.countryName);
        return { info: mockInfo, error: null, source: "mock" as const };
      }

      const cleaned = stripJsonMarkdown(result.text);
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("[CountryInfo] JSON parse error:", parseErr, "Raw response:", cleaned.slice(0, 300));
        const mockInfo = getMockCountryInfo(data.countryName);
        return { info: mockInfo, error: null, source: "mock" as const };
      }

      const info = normalizeCountryInfo(parsed, data.countryName);
      if (!info) {
        console.warn("[CountryInfo] Normalization failed — falling back to mock data for:", data.countryName);
        const mockInfo = getMockCountryInfo(data.countryName);
        return { info: mockInfo, error: null, source: "mock" as const };
      }

      return { info, error: null, source: "ai" as const };
    } catch (error) {
      console.error("[CountryInfo] Unexpected server error:", error, "— falling back to mock data");
      const mockInfo = getMockCountryInfo(data.countryName);
      return { info: mockInfo, error: null, source: "mock" as const };
    }
  });
