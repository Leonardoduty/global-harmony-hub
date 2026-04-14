import { motion } from "framer-motion";
import { type SimCountry, useSimulation } from "@/context/SimulationContext";

type Country = SimCountry & { themeGradient: string; glowColor: string };

const PLAYABLE_COUNTRIES: Country[] = [
  {
    name: "United States",
    code: "US",
    flag: "🇺🇸",
    difficulty: "Easy",
    leader: "Joe Biden",
    leaderTitle: "President",
    region: "North America",
    themeGradient: "from-blue-950 via-blue-900 to-slate-900",
    glowColor: "rgba(59,130,246,0.35)",
  },
  {
    name: "China",
    code: "CN",
    flag: "🇨🇳",
    difficulty: "Medium",
    leader: "Xi Jinping",
    leaderTitle: "General Secretary",
    region: "East Asia",
    themeGradient: "from-red-950 via-red-900 to-slate-900",
    glowColor: "rgba(220,38,38,0.35)",
  },
  {
    name: "Russia",
    code: "RU",
    flag: "🇷🇺",
    difficulty: "Hard",
    leader: "Vladimir Putin",
    leaderTitle: "President",
    region: "Eastern Europe",
    themeGradient: "from-slate-800 via-slate-900 to-zinc-950",
    glowColor: "rgba(148,163,184,0.3)",
  },
  {
    name: "India",
    code: "IN",
    flag: "🇮🇳",
    difficulty: "Easy",
    leader: "Narendra Modi",
    leaderTitle: "Prime Minister",
    region: "South Asia",
    themeGradient: "from-orange-950 via-orange-900 to-slate-900",
    glowColor: "rgba(234,88,12,0.35)",
  },
  {
    name: "Germany",
    code: "DE",
    flag: "🇩🇪",
    difficulty: "Medium",
    leader: "Olaf Scholz",
    leaderTitle: "Chancellor",
    region: "Western Europe",
    themeGradient: "from-zinc-800 via-zinc-900 to-slate-950",
    glowColor: "rgba(212,212,212,0.2)",
  },
  {
    name: "United Kingdom",
    code: "GB",
    flag: "🇬🇧",
    difficulty: "Medium",
    leader: "Rishi Sunak",
    leaderTitle: "Prime Minister",
    region: "Western Europe",
    themeGradient: "from-blue-950 via-indigo-900 to-slate-900",
    glowColor: "rgba(99,102,241,0.35)",
  },
  {
    name: "North Korea",
    code: "KP",
    flag: "🇰🇵",
    difficulty: "Hard",
    leader: "Kim Jong-un",
    leaderTitle: "Supreme Leader",
    region: "East Asia",
    themeGradient: "from-red-950 via-slate-900 to-zinc-950",
    glowColor: "rgba(239,68,68,0.4)",
  },
  {
    name: "Brazil",
    code: "BR",
    flag: "🇧🇷",
    difficulty: "Easy",
    leader: "Luiz Inácio Lula da Silva",
    leaderTitle: "President",
    region: "South America",
    themeGradient: "from-green-950 via-green-900 to-slate-900",
    glowColor: "rgba(22,163,74,0.35)",
  },
  {
    name: "Israel",
    code: "IL",
    flag: "🇮🇱",
    difficulty: "Hard",
    leader: "Benjamin Netanyahu",
    leaderTitle: "Prime Minister",
    region: "Middle East",
    themeGradient: "from-blue-950 via-slate-800 to-zinc-950",
    glowColor: "rgba(96,165,250,0.3)",
  },
];

const DIFFICULTY_STYLES = {
  Easy: {
    badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
    label: "EASY",
  },
  Medium: {
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    label: "MEDIUM",
  },
  Hard: {
    badge: "bg-red-500/20 text-red-300 border border-red-500/40",
    label: "HARD",
  },
};

export default function CountrySelectionScreen() {
  const { setSelectedCountry } = useSimulation();

  return (
    <div className="min-h-screen bg-[#0a0c0f] text-white px-4 py-10 flex flex-col items-center">
      {/* Title block */}
      <motion.div
        className="text-center mb-10 max-w-2xl"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-mono text-xs tracking-[0.25em] text-emerald-400 mb-2 uppercase">
          ▶ COMMAND INITIALISATION
        </p>
        <h1
          className="font-display text-4xl md:text-5xl font-black tracking-tight mb-3"
          style={{ textShadow: "0 0 40px rgba(16,185,129,0.3)" }}
        >
          SELECT YOUR NATION
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Choose the country you will lead. Each nation carries its own geopolitical pressures,
          strategic alliances, and difficulty. Your decisions shape world history.
        </p>
      </motion.div>

      {/* Country grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
        {PLAYABLE_COUNTRIES.map((country, idx) => {
          const diff = DIFFICULTY_STYLES[country.difficulty];
          return (
            <motion.button
              key={country.code}
              onClick={() => setSelectedCountry(country)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-xl text-left bg-gradient-to-br ${country.themeGradient} border border-white/10 p-5 cursor-pointer group transition-all duration-200 hover:border-white/25`}
              style={{
                boxShadow: `0 0 0 0 ${country.glowColor}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  `0 0 32px 0 ${country.glowColor}, 0 4px 24px rgba(0,0,0,0.5)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  `0 0 0 0 ${country.glowColor}`;
              }}
            >
              {/* Corner scanner line on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Flag + difficulty row */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-4xl"
                  style={{
                    background: `radial-gradient(circle, ${country.glowColor} 0%, transparent 70%)`,
                    boxShadow: `inset 0 0 20px ${country.glowColor}`,
                  }}
                >
                  {country.flag}
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-widest ${diff.badge}`}
                >
                  {diff.label}
                </span>
              </div>

              {/* Country name */}
              <h3 className="font-display text-lg font-bold text-white leading-tight mb-0.5 group-hover:text-white/90 transition-colors">
                {country.name}
              </h3>

              {/* Leader info */}
              <p className="text-xs text-slate-400 font-mono mb-3">
                {country.leaderTitle}: {country.leader}
              </p>

              {/* Region tag */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {country.region}
                </span>
              </div>

              {/* "Assume Command" CTA on hover */}
              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <span className="text-xs font-mono text-emerald-400 tracking-wider">
                  ▶ ASSUME COMMAND →
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer note */}
      <motion.p
        className="mt-10 text-xs font-mono text-slate-600 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        AI-driven crisis scenarios adapt to your decisions. All outcomes are fictional simulations.
      </motion.p>
    </div>
  );
}
