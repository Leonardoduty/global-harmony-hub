import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Shield, Zap, Users, AlertTriangle, ArrowRight, Clock, Radio, Globe, Activity, Paintbrush, Code2, ChevronDown, Info } from "lucide-react";
import { engineGetWorldState } from "@/lib/apiEngine";
import { navigate } from "@/lib/router";

type WorldState = {
  global_peace_index: number;
  war_risk_level: number;
  economic_stability: number;
  active_conflicts: string[];
  alliances: string[];
};

function useLiveWorldState() {
  const [state, setState] = useState<WorldState | null>(null);
  useEffect(() => {
    let alive = true;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const res = await engineGetWorldState();
        if (alive && res.ok && res.data?.state) setState(res.data.state as WorldState);
      } catch {}
      pending = false;
    }
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return state;
}

function AnimatedBackground({ peaceIndex }: { peaceIndex: number }) {
  const risk = 100 - peaceIndex;
  const r = Math.round(5 + risk * 0.8);
  const g = Math.round(5 + peaceIndex * 0.3);
  const b = Math.round(15 + peaceIndex * 0.5);
  const glow1 = risk > 50 ? `rgba(180,10,10,${(risk - 50) * 0.003})` : `rgba(10,80,180,${(50 - risk) * 0.004})`;
  const glow2 = risk > 30 ? `rgba(239,68,68,${risk * 0.002})` : `rgba(34,197,94,${(100 - risk) * 0.003})`;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      animate={{
        background: [
          `radial-gradient(ellipse 120% 60% at 20% 50%, ${glow1} 0%, rgb(${r},${g},${b}) 60%)`,
          `radial-gradient(ellipse 120% 60% at 80% 50%, ${glow2} 0%, rgb(${r},${g},${b}) 60%)`,
          `radial-gradient(ellipse 120% 60% at 50% 30%, ${glow1} 0%, rgb(${r},${g},${b}) 60%)`,
        ],
      }}
      transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    />
  );
}

function LiveMapPreview({ conflicts }: { conflicts: string[] }) {
  const baseHotspots = [
    { label: "Ukraine", x: "56%", y: "30%", color: "#ef4444" },
    { label: "Sudan", x: "54%", y: "53%", color: "#ef4444" },
    { label: "Gaza", x: "55%", y: "38%", color: "#f97316" },
    { label: "Russia", x: "65%", y: "22%", color: "#dc2626" },
    { label: "Myanmar", x: "76%", y: "44%", color: "#ef4444" },
    { label: "China", x: "75%", y: "33%", color: "#f97316" },
    { label: "USA", x: "18%", y: "33%", color: "#facc15" },
    { label: "EU", x: "51%", y: "27%", color: "#22c55e" },
  ];

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/8" style={{ aspectRatio: "2/1", background: "#05050f" }}>
      <img
        src="/world-terrain.png"
        alt="World map"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45, mixBlendMode: "luminosity" }}
        draggable={false}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(180,10,10,0.06) 0%, rgba(5,5,15,0.5) 100%)" }} />

      {baseHotspots.map((h, i) => {
        const isActive = conflicts.some(c => c.toLowerCase().includes(h.label.toLowerCase()));
        return (
          <motion.div
            key={h.label}
            className="absolute flex items-center gap-1"
            style={{ left: h.x, top: h.y, transform: "translate(-50%,-50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
          >
            <motion.span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: h.color, boxShadow: `0 0 ${isActive ? "12px" : "6px"} ${h.color}` }}
              animate={{ scale: [1, isActive ? 1.6 : 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: isActive ? 1.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="font-mono text-[9px] text-white/60 hidden sm:inline">{h.label}</span>
          </motion.div>
        );
      })}

      <motion.div
        className="absolute top-2 right-2 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg"
        style={{ background: "rgba(5,5,20,0.9)", border: "1px solid rgba(239,68,68,0.4)" }}
        animate={{ borderColor: ["rgba(239,68,68,0.4)", "rgba(239,68,68,0.9)", "rgba(239,68,68,0.4)"] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Clock className="w-3 h-3 text-red-400" />
        <span className="font-mono text-[9px] text-red-400 font-bold">1:45</span>
        <span className="font-mono text-[7px] text-white/30">TO MIDNIGHT</span>
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="font-mono text-xs text-white/50 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.1)" }}
        >
          <Map className="w-3 h-3" />
          Open Interactive Map
        </motion.div>
      </div>
    </div>
  );
}

function StabilityRing({ value }: { value: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value > 70 ? "#22c55e" : value > 45 ? "#facc15" : "#ef4444";

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono text-2xl font-black"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {value}
        </motion.span>
        <span className="font-mono text-[9px] text-white/40 uppercase">/ 100</span>
      </div>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.1, type: "spring", stiffness: 220, damping: 22 },
  }),
};

function GlowCard({ children, className = "", style = {}, delay = 0, to }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  to: string;
}) {
  return (
    <motion.div
      custom={delay}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.03, boxShadow: "0 0 40px rgba(96,165,250,0.28), 0 12px 48px rgba(0,0,0,0.6)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={className}
      style={{ ...style, transition: "border-color 0.3s ease" }}
    >
      <a
        href={to}
        onClick={(e) => { e.preventDefault(); navigate(to); }}
        className="block w-full h-full"
      >
        {children}
      </a>
    </motion.div>
  );
}

function ConflictTicker({ conflicts }: { conflicts: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (conflicts.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % conflicts.length), 3000);
    return () => clearInterval(id);
  }, [conflicts.length]);

  if (!conflicts.length) return null;

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest shrink-0 flex items-center gap-1">
        <motion.span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
        LIVE
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="font-mono text-[10px] text-white/60 truncate"
        >
          {conflicts[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

const CREATORS = [
  { name: "Lavanya N. Gajbhiye", role: "Web Developer", icon: Code2, color: "#60a5fa", glow: "rgba(96,165,250,0.28)" },
  { name: "Hasan Rauf", role: "Web Designer", icon: Paintbrush, color: "#c084fc", glow: "rgba(192,132,252,0.28)" },
];

function AboutCard() {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      custom={5}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-xl p-5 cursor-pointer group"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(96,165,250,0.15)", backdropFilter: "blur(12px)" }}
      whileHover={{ y: -4, scale: 1.03, boxShadow: "0 0 40px rgba(96,165,250,0.2), 0 12px 48px rgba(0,0,0,0.6)" }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-blue-400" />
        <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">About the Creators</span>
        <motion.div
          className="ml-auto"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ChevronDown className="w-4 h-4 text-blue-400/60" />
        </motion.div>
      </div>

      <div className="space-y-2 mb-4">
        {CREATORS.map(({ name, role, icon: Icon, color }, i) => (
          <motion.div
            key={name}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: `${color}0d`, border: `1px solid ${color}20` }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="font-mono text-[10px] text-white/85 font-semibold">{name}</span>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-wider" style={{ color }}>{role}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="bio"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="font-mono text-[10px] text-white/60 leading-relaxed mb-4 pt-1 border-t border-white/8">
              Lavanya N. Gajbhiye and Hasan Rauf are talented Class 9 students at Bal Bhawan School, Bhopal — a dedicated web dev and design team with 60+ hours invested in this platform. Emerging innovators in the Bhopal tech community.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1 text-xs font-mono text-blue-400 group-hover:gap-2 transition-all">
        {open ? "Show Less" : "Meet the Team"} <ArrowRight className="w-3 h-3" />
      </div>
    </motion.div>
  );
}

export default function Index() {
  const ws = useLiveWorldState();
  const peaceIndex = ws?.global_peace_index ?? 72;
  const warRisk = ws?.war_risk_level ?? 40;
  const conflicts = ws?.active_conflicts ?? [];
  const econ = ws?.economic_stability ?? 65;

  return (
    <div className="relative min-h-screen" style={{ background: "#05050f" }}>
      <AnimatedBackground peaceIndex={peaceIndex} />

      <div className="relative z-10">
        {/* Hero */}
        <section className="relative h-[46vh] min-h-[360px] flex items-center justify-center overflow-hidden">
          <img src="/world-terrain.png" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.18 }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,15,0.3) 0%, rgba(5,5,15,0.85) 100%)" }} />

          <div className="relative z-10 text-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <motion.h1
                className="font-mono text-5xl md:text-7xl font-black tracking-[0.15em] text-white uppercase"
                style={{ textShadow: "0 0 40px rgba(96,165,250,0.4), 0 0 80px rgba(96,165,250,0.15)" }}
                animate={{ textShadow: [
                  "0 0 40px rgba(96,165,250,0.4), 0 0 80px rgba(96,165,250,0.15)",
                  "0 0 60px rgba(96,165,250,0.7), 0 0 120px rgba(96,165,250,0.25)",
                  "0 0 40px rgba(96,165,250,0.4), 0 0 80px rgba(96,165,250,0.15)",
                ]}}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                GLOBAL PULSE
              </motion.h1>
              <motion.p
                className="font-mono text-sm md:text-base tracking-[0.5em] text-blue-300/70 uppercase mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Harmony Monitor
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-6 flex items-center justify-center gap-6 flex-wrap"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/50">
                <Activity className="w-3 h-3 text-green-400" />
                <span>Peace Index: <span className="text-green-400 font-bold">{peaceIndex}</span></span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/50">
                <Radio className="w-3 h-3 text-red-400" />
                <span>War Risk: <span className="text-red-400 font-bold">{warRisk}%</span></span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/50">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>Econ Stability: <span className="text-blue-400 font-bold">{econ}</span></span>
              </div>
            </motion.div>

            {conflicts.length > 0 && (
              <motion.div
                className="mt-4 mx-auto max-w-sm px-4 py-2 rounded-full"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <ConflictTicker conflicts={conflicts} />
              </motion.div>
            )}
          </div>
        </section>

        {/* Dashboard Grid */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Map Card */}
            <GlowCard
              to="/conflict-map"
              delay={0}
              className="lg:col-span-2 rounded-xl p-5 cursor-pointer group"
              style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(96,165,250,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                  <Map className="w-4 h-4 text-blue-400" />
                </motion.div>
                <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">Global Situation Map</span>
                <span className="ml-auto font-mono text-[9px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  LIVE
                </span>
              </div>
              <LiveMapPreview conflicts={conflicts} />
              <div className="flex items-center gap-1 mt-3 text-xs font-mono text-blue-400 group-hover:gap-2 transition-all">
                Open Intelligence Map <ArrowRight className="w-3 h-3" />
              </div>
            </GlowCard>

            {/* Stability */}
            <GlowCard
              to="/situation-room"
              delay={1}
              className="rounded-xl p-5 cursor-pointer group flex flex-col"
              style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(250,204,21,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">Situation Briefing</span>
              </div>
              <StabilityRing value={peaceIndex} />
              <p className="font-mono text-[10px] text-white/40 text-center mt-3 uppercase tracking-wider">Global Stability</p>
              <div className="mt-4 space-y-1.5">
                {[
                  { label: "War Risk", value: warRisk, color: "#ef4444" },
                  { label: "Econ", value: econ, color: "#60a5fa" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-white/35 w-14">{label}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </div>
                    <span className="font-mono text-[9px] font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-4 text-xs font-mono text-yellow-400 group-hover:gap-2 transition-all">
                Enter Situation Room <ArrowRight className="w-3 h-3" />
              </div>
            </GlowCard>

            {/* News Shield */}
            <GlowCard
              to="/news-shield"
              delay={2}
              className="rounded-xl p-5 cursor-pointer group"
              style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(34,197,94,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">News Shield</span>
              </div>
              <div className="space-y-2">
                {["AI Fact-Checking", "Credibility Score", "Source Analysis"].map((f, i) => (
                  <motion.div
                    key={f}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    />
                    <span className="font-mono text-[10px] text-white/85">{f}</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-4 text-xs font-mono text-green-400 group-hover:gap-2 transition-all">
                Verify News <ArrowRight className="w-3 h-3" />
              </div>
            </GlowCard>

            {/* Presidential Sim */}
            <GlowCard
              to="/presidential-sim"
              delay={3}
              className="rounded-xl p-5 cursor-pointer group"
              style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(250,204,21,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                </motion.div>
                <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">Presidential Sim</span>
              </div>
              <div className="space-y-2 mb-4">
                {["War escalation", "Trade deals", "Cyber attacks", "Climate crisis"].map((s, i) => (
                  <motion.div
                    key={s}
                    className="font-mono text-[10px] text-white/85 flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
                  >
                    <span className="w-1 h-1 rounded-full bg-yellow-400/60 shrink-0" />
                    {s}
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs font-mono text-yellow-400 group-hover:gap-2 transition-all">
                Start Simulation <ArrowRight className="w-3 h-3" />
              </div>
            </GlowCard>

            {/* About the Creators */}
            <AboutCard />

            {/* Active Conflicts */}
            <GlowCard
              to="/situation-room"
              delay={4}
              className="rounded-xl p-5 cursor-pointer group"
              style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(239,68,68,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-red-400" />
                <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">Active Conflicts</span>
                <span className="ml-auto font-mono text-xs font-black text-red-400">{conflicts.length}</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                <AnimatePresence>
                  {conflicts.slice(0, 5).map((c, i) => (
                    <motion.div
                      key={c}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                      style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      />
                      <span className="font-mono text-[10px] text-white/55 leading-tight">{c}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!conflicts.length && (
                  <p className="font-mono text-[10px] text-white/25 text-center py-4">Loading conflict data...</p>
                )}
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs font-mono text-red-400 group-hover:gap-2 transition-all">
                View Briefing <ArrowRight className="w-3 h-3" />
              </div>
            </GlowCard>

          </div>
        </section>
      </div>
    </div>
  );
}
