import { createServerFn } from "@tanstack/react-start";
import { geminiGenerateFromMessages, getGeminiApiKey, stripJsonMarkdown } from "@/lib/gemini";

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
      : "Geopolitical summary was not returned in the expected format; try again or pick another country.";

  const mapConflict = (c: unknown) => {
    if (!c || typeof c !== "object") return null;
    const x = c as Record<string, unknown>;
    const nm = typeof x.name === "string" ? x.name : "Conflict";
    const st = typeof x.status === "string" ? x.status : "active";
    const yrs = typeof x.years === "string" ? x.years : "";
    const desc = typeof x.description === "string" ? x.description : "";
    return { name: nm, status: st, years: yrs, description: desc };
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

  const conflicts = Array.isArray(o.conflicts)
    ? (o.conflicts.map(mapConflict).filter(Boolean) as { name: string; status: string; years: string; description: string }[])
    : [];
  const peaceInitiatives = Array.isArray(o.peaceInitiatives)
    ? (o.peaceInitiatives.map(mapPeace).filter(Boolean) as { name: string; year: string; description: string }[])
    : [];
  const history = Array.isArray(o.history)
    ? (o.history.map(mapHist).filter(Boolean) as { year: string; event: string }[])
    : [];

  return {
    name,
    conflicts,
    peaceInitiatives,
    history,
    stabilityScore,
    summary,
  };
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
      return { info: null, error: "AI service not configured (set GEMINI_API_KEY)" };
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
    { "name": "conflict name", "status": "active|resolved|frozen", "years": "e.g. 2022-present", "description": "1 sentence" }
  ],
  "peaceInitiatives": [
    { "name": "initiative name", "year": "year", "description": "1 sentence" }
  ],
  "history": [
    { "year": "year or period", "event": "brief historical event relevant to conflict/peace" }
  ],
  "stabilityScore": number (0-100),
  "summary": "2-3 sentence geopolitical summary"
}

Include 2-5 items per category. Focus on real, factual data. For conflicts, include both internal and external. For peace, include treaties, agreements, and diplomatic efforts. History should cover key events from the last 50+ years relevant to the country's conflict/peace profile.`,
          },
          {
            role: "user",
            content: `Provide geopolitical analysis for: ${data.countryName}`,
          },
        ],
      });

      if (!result.ok) {
        console.error(`Country info API error: ${result.status} ${result.message}`);
        return { info: null, error: "Failed to fetch country info" };
      }

      const cleaned = stripJsonMarkdown(result.text);
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return { info: null, error: "Invalid JSON from model" };
      }
      const info = normalizeCountryInfo(parsed, data.countryName);
      if (!info) {
        return { info: null, error: "Could not parse country analysis" };
      }
      return { info, error: null };
    } catch (error) {
      console.error("Country info error:", error);
      return { info: null, error: "Failed to analyze country" };
    }
  });
