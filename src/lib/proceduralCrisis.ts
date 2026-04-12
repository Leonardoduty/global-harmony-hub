/**
 * Deterministic procedural crisis generator — used when AI is unavailable
 * or returns unusable output. Avoids a fixed scripted rotation.
 */

export type ProceduralScenario = {
  title: string;
  description: string;
  imagePrompt: string;
  options: {
    label: string;
    effects: Record<string, number>;
    preview?: Record<string, number>;
    outcome: string;
  }[];
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

function jitterPreview(
  rnd: () => number,
  effects: Record<string, number>
): Record<string, number> {
  const keys = ["diplomacy", "economy", "security", "approval"] as const;
  const out = { ...effects };
  for (const k of keys) {
    const drift = Math.floor(rnd() * 5) - 2;
    out[k] = Math.max(-25, Math.min(25, (out[k] || 0) + drift));
  }
  return out;
}

export function buildProceduralScenario(input: {
  stats: Record<string, number>;
  previousDecisions: string[];
  scenarioCount: number;
}): ProceduralScenario {
  const seed =
    input.scenarioCount * 977 +
    input.previousDecisions.length * 131 +
    (input.previousDecisions[0]?.length ?? 0);
  const rnd = mulberry32(seed);

  const actors = [
    "a neighboring federation",
    "a strategic maritime partner",
    "a regional bloc chair",
    "an emerging tech exporter",
    "a fragile coastal ally",
    "a major energy supplier",
  ];
  const stakes = [
    "humanitarian corridors",
    "rare-earth refining",
    "undersea cable security",
    "currency swap lines",
    "sanctions enforcement",
    "peacekeeper mandates",
  ];
  const pressure = pick(rnd, stakes);
  const actor = pick(rnd, actors);

  const weakest = (["diplomacy", "economy", "security", "approval"] as const).reduce((a, b) =>
    input.stats[a] < input.stats[b] ? a : b
  );

  const angle =
    weakest === "economy"
      ? "Markets are pricing in a downgrade unless you move within 72 hours."
      : weakest === "diplomacy"
        ? "Embassies are quietly signaling a loss of confidence in your coalition."
        : weakest === "security"
          ? "Defense staff warn that readiness is slipping while threats diversify."
          : "Polling firms report your coalition is one scandal away from fracture.";

  const title = pick(rnd, [
    `${pressure.charAt(0).toUpperCase() + pressure.slice(1)} Flashpoint`,
    "Emergency Cabinet Session",
    "Crisis Taskforce Alert",
    "Alliance Stress Test",
    "Regional Shockwave",
  ]);

  const historyHint =
    input.previousDecisions.length > 0
      ? `Your last moves — ${input.previousDecisions[input.previousDecisions.length - 1]?.slice(0, 120)} — still echo in capitals.`
      : "This is the opening hours of your term; no prior crisis decisions bind you.";

  const description = `${historyHint} ${actor} presses for a decision on ${pressure}. ${angle} Intelligence is incomplete; every option carries blowback.`;

  const imagePrompt = `Editorial illustration: tense government situation room at night, maps and anonymized silhouettes, symbolic focus on ${pressure}, cinematic teal and amber light, no readable text, no celebrity likenesses.`;

  const mk = (
    label: string,
    effects: Record<string, number>,
    outcome: string
  ): ProceduralScenario["options"][0] => ({
    label,
    effects,
    preview: jitterPreview(rnd, effects),
    outcome,
  });

  const options = pick(rnd, [
    [
      mk(
        "Prioritize multilateral talks and confidence-building measures",
        { diplomacy: 18, economy: -6, security: -4, approval: 8 },
        "Talks open under global scrutiny. Hardliners call it delay, but markets stabilize slightly."
      ),
      mk(
        "Authorize a limited security surge and border hardening",
        { diplomacy: -12, economy: -4, security: 16, approval: 4 },
        "Forces deploy fast; neighbors protest while your domestic security numbers improve."
      ),
      mk(
        "Channel emergency economic aid and technical assistance",
        { diplomacy: 6, economy: -14, security: 2, approval: 12 },
        "Aid convoys move; treasury groans but citizens see visible action."
      ),
    ],
    [
      mk(
        "Push a surprise summit with neutral mediators",
        { diplomacy: 14, economy: -3, security: 2, approval: 6 },
        "A summit date lands headlines; spoilers work the backchannels overnight."
      ),
      mk(
        "Freeze assets and issue targeted sanctions",
        { diplomacy: -8, economy: 4, security: 6, approval: -6 },
        "Sanctions bite selectively; retaliation risk rises in trade corridors."
      ),
      mk(
        "Launch a domestic transparency initiative to buy time",
        { diplomacy: 4, economy: 2, security: -6, approval: 10 },
        "Auditors fan out; international press tempers criticism for a news cycle."
      ),
    ],
  ]);

  return { title, description, imagePrompt, options };
}
