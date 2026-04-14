import { createServerFn } from "@tanstack/react-start";
import { callAI } from "./ai.server";

// Hardcoded fallback data for when AI fails
const FALLBACK_COUNTRIES: Record<string, CountryData> = {
  "United States": {
    name: "United States",
    leader: { name: "The President", personality: "Pragmatic centrist focused on maintaining global leadership" },
    conflicts: [
      { name: "War on Terror", status: "active", years: "2001-present", description: "Ongoing counterterrorism operations globally." },
      { name: "Ukraine Support", status: "active", years: "2022-present", description: "Military and economic aid to Ukraine." },
    ],
    peaceInitiatives: [
      { name: "Abraham Accords", year: "2020", description: "Normalized relations between Israel and several Arab states." },
    ],
    history: [
      { year: "1945", event: "End of WWII, founding of United Nations" },
      { year: "1991", event: "End of Cold War" },
      { year: "2001", event: "September 11 attacks, War on Terror begins" },
    ],
    alliances: ["NATO", "Five Eyes", "G7", "AUKUS", "UN Security Council (P5)"],
    attributes: { stability: 72, economicStrength: 85, militaryStrength: 95, diplomacyScore: 78, politicalFreedom: 80 },
    economicStatus: "stable",
    politicalSystem: "Federal presidential constitutional republic",
    stabilityScore: 72,
    summary: "The United States is the world's largest economy and most powerful military force, playing a central role in global diplomacy and security alliances.",
    relationships: { allies: ["United Kingdom", "France", "Germany", "Japan", "South Korea", "Canada", "Australia"], enemies: ["Russia", "Iran", "North Korea"], neutral: ["China", "India", "Brazil", "Saudi Arabia"] },
    politicalStance: "Center-right globally, emphasizing free markets, democratic values, and military strength.",
    currentSituation: "Managing tensions with China and Russia while supporting Ukraine and navigating domestic political divisions.",
  },
  "China": {
    name: "China",
    leader: { name: "Xi Jinping", personality: "Authoritarian consolidator focused on national rejuvenation" },
    conflicts: [
      { name: "Taiwan Strait Tensions", status: "frozen", years: "1949-present", description: "Ongoing sovereignty dispute over Taiwan." },
      { name: "South China Sea", status: "active", years: "2010-present", description: "Territorial disputes with multiple neighbors." },
    ],
    peaceInitiatives: [
      { name: "Saudi-Iran Mediation", year: "2023", description: "Brokered diplomatic normalization between Saudi Arabia and Iran." },
    ],
    history: [
      { year: "1949", event: "People's Republic of China established" },
      { year: "1978", event: "Economic reforms under Deng Xiaoping" },
      { year: "2001", event: "Joined World Trade Organization" },
    ],
    alliances: ["SCO", "BRICS", "AIIB"],
    attributes: { stability: 68, economicStrength: 82, militaryStrength: 80, diplomacyScore: 65, politicalFreedom: 20 },
    economicStatus: "growing",
    politicalSystem: "Unitary one-party socialist republic",
    stabilityScore: 68,
    summary: "China is the world's second-largest economy with rapidly modernizing military capabilities, pursuing a multipolar world order.",
    relationships: { allies: ["Russia", "Pakistan", "North Korea"], enemies: ["Taiwan"], neutral: ["United States", "India", "Japan", "European Union"] },
    politicalStance: "State-directed capitalism with strong authoritarian governance and emphasis on sovereignty.",
    currentSituation: "Economic slowdown amid property crisis, increasing military posturing around Taiwan, and expanding global influence through BRI.",
  },
  "Russia": {
    name: "Russia",
    leader: { name: "Vladimir Putin", personality: "Strongman nationalist seeking to restore Russian sphere of influence" },
    conflicts: [
      { name: "Ukraine Invasion", status: "active", years: "2022-present", description: "Full-scale military invasion of Ukraine." },
      { name: "Syria Intervention", status: "active", years: "2015-present", description: "Military support for Assad regime." },
    ],
    peaceInitiatives: [],
    history: [
      { year: "1991", event: "Dissolution of the Soviet Union" },
      { year: "2014", event: "Annexation of Crimea" },
      { year: "2022", event: "Full-scale invasion of Ukraine" },
    ],
    alliances: ["CSTO", "BRICS", "SCO"],
    attributes: { stability: 45, economicStrength: 40, militaryStrength: 75, diplomacyScore: 25, politicalFreedom: 15 },
    economicStatus: "declining",
    politicalSystem: "Federal semi-presidential republic (de facto authoritarian)",
    stabilityScore: 45,
    summary: "Russia is a major nuclear power facing severe international isolation due to its invasion of Ukraine, with a declining economy under heavy sanctions.",
    relationships: { allies: ["China", "Iran", "North Korea", "Belarus", "Syria"], enemies: ["United States", "United Kingdom", "Ukraine", "Poland"], neutral: ["India", "Turkey", "Brazil"] },
    politicalStance: "Nationalist authoritarianism opposing Western liberal order.",
    currentSituation: "Locked in a prolonged war in Ukraine, facing Western sanctions, and deepening ties with China and Iran.",
  },
};

// Generate generic fallback for unknown countries
function getGenericFallback(name: string): CountryData {
  return {
    name,
    leader: { name: "Head of State", personality: "Pragmatic leader focused on national development" },
    conflicts: [],
    peaceInitiatives: [],
    history: [{ year: "Present", event: "Active participant in international affairs" }],
    alliances: ["United Nations"],
    attributes: { stability: 50, economicStrength: 50, militaryStrength: 50, diplomacyScore: 50, politicalFreedom: 50 },
    economicStatus: "stable",
    politicalSystem: "Government",
    stabilityScore: 50,
    summary: `${name} is an active member of the international community.`,
    relationships: { allies: [], enemies: [], neutral: [] },
    politicalStance: "Moderate, multilateral approach to international affairs.",
    currentSituation: "Engaged in standard diplomatic and economic activities.",
  };
}

type CountryData = {
  name: string;
  leader: { name: string; personality: string };
  conflicts: { name: string; status: string; years: string; description: string }[];
  peaceInitiatives: { name: string; year: string; description: string }[];
  history: { year: string; event: string }[];
  alliances: string[];
  attributes: {
    stability: number;
    economicStrength: number;
    militaryStrength: number;
    diplomacyScore: number;
    politicalFreedom: number;
  };
  economicStatus: string;
  politicalSystem: string;
  stabilityScore: number;
  summary: string;
  relationships: { allies: string[]; enemies: string[]; neutral: string[] };
  politicalStance: string;
  currentSituation: string;
};

export const getCountryInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string }) => {
    if (!input.countryName || input.countryName.length > 100) throw new Error("Invalid country name");
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callAI({
        systemPrompt: `You are a geopolitical analyst. When given a country name, provide a detailed analysis in this exact JSON format:
{
  "name": "country name",
  "leader": { "name": "current or fictional AI-generated leader name", "personality": "2 sentence personality description" },
  "conflicts": [
    { "name": "conflict name", "status": "active|resolved|frozen", "years": "e.g. 2022-present", "description": "1 sentence" }
  ],
  "peaceInitiatives": [
    { "name": "initiative name", "year": "year", "description": "1 sentence" }
  ],
  "history": [
    { "year": "year or period", "event": "brief historical event" }
  ],
  "alliances": ["list of major alliances and organizations"],
  "attributes": {
    "stability": number(0-100),
    "economicStrength": number(0-100),
    "militaryStrength": number(0-100),
    "diplomacyScore": number(0-100),
    "politicalFreedom": number(0-100)
  },
  "economicStatus": "growing|stable|declining|crisis",
  "politicalSystem": "description of government type",
  "stabilityScore": number(0-100),
  "summary": "2-3 sentence geopolitical summary",
  "relationships": {
    "allies": ["list of allied/friendly country names"],
    "enemies": ["list of hostile/enemy country names"],
    "neutral": ["list of neutral country names"]
  },
  "politicalStance": "1 sentence political stance description",
  "currentSituation": "1-2 sentence current situation description"
}

Include 2-5 items per category. Focus on real, factual data. For relationships, include 5-8 countries in each category.`,
        userPrompt: `Provide geopolitical analysis for: ${data.countryName}`,
        jsonMode: true,
      });

      const info = JSON.parse(content);
      return { info, error: null, fallback: false };
    } catch (error) {
      console.error("Country info error:", error);
      // Return fallback data instead of failing
      const fallback = FALLBACK_COUNTRIES[data.countryName] || getGenericFallback(data.countryName);
      return { info: fallback, error: null, fallback: true };
    }
  });

export const getCountryTimeline = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string }) => {
    if (!input.countryName || input.countryName.length > 100) throw new Error("Invalid country name");
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callAI({
        systemPrompt: `You are a historian. Given a country, provide a chronological list of 15-25 major wars, peace treaties, and significant political events from 1800 to present.

Return JSON array:
[
  { "year": "1812", "title": "War of 1812", "description": "1-2 sentence description", "type": "war|peace|political|economic" }
]

Focus on the most significant events. Include a mix of wars, peace treaties, independence events, and major political milestones. Order chronologically.`,
        userPrompt: `Provide historical timeline for ${data.countryName} from 1800 to present.`,
        jsonMode: true,
        temperature: 0.5,
      });

      const timeline = JSON.parse(content);
      return { timeline: Array.isArray(timeline) ? timeline : [], error: null };
    } catch (error) {
      console.error("Timeline error:", error);
      return { timeline: [], error: "Failed to load timeline — please try again" };
    }
  });

export const getCountryRelationships = createServerFn({ method: "POST" })
  .inputValidator((input: { countryName: string }) => {
    if (!input.countryName || input.countryName.length > 100) throw new Error("Invalid country name");
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const content = await callAI({
        systemPrompt: `You are a geopolitical analyst. Given a country, return a JSON object mapping country names to their diplomatic relationship status. Use this format:
{
  "relationships": {
    "Country Name": "ally",
    "Country Name": "enemy",
    "Country Name": "neutral"
  }
}
Include at least 30 countries covering all major world regions. Use only these values: "ally", "enemy", "neutral".`,
        userPrompt: `What are the current diplomatic relationships for ${data.countryName}?`,
        jsonMode: true,
        temperature: 0.3,
      });

      const parsed = JSON.parse(content);
      return { relationships: parsed.relationships || {}, error: null };
    } catch (error) {
      console.error("Relationships error:", error);
      return { relationships: {}, error: "Failed to load relationships" };
    }
  });
