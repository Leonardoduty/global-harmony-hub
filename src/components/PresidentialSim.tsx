import { useState } from "react";
import { Shield, Zap, Heart, DollarSign } from "lucide-react";

type Scenario = {
  id: number;
  title: string;
  description: string;
  options: { label: string; effects: Record<string, number>; outcome: string }[];
};

const scenarios: Scenario[] = [
  {
    id: 1,
    title: "Border Crisis",
    description: "Neighboring country reports mass refugee displacement. 50,000 civilians are heading toward your border. Your advisors are divided.",
    options: [
      { label: "Open borders & provide aid", effects: { diplomacy: 20, economy: -10, security: -5, approval: 15 }, outcome: "International praise pours in. Humanitarian organizations laud your decision. However, opposition parties raise concerns about resource strain." },
      { label: "Deploy military to secure border", effects: { diplomacy: -15, economy: 5, security: 20, approval: -10 }, outcome: "Border is secured but international community condemns the action. Sanctions are threatened by the UN Human Rights Council." },
      { label: "Negotiate with neighbor for joint solution", effects: { diplomacy: 15, economy: -5, security: 10, approval: 10 }, outcome: "Bilateral talks begin. A shared processing center is established. Both nations share the burden while maintaining security." },
    ],
  },
  {
    id: 2,
    title: "Cyber Attack on Infrastructure",
    description: "A sophisticated cyber attack has disabled power grids in three major cities. Intelligence suggests a state-sponsored actor is behind it.",
    options: [
      { label: "Launch retaliatory cyber operation", effects: { diplomacy: -20, economy: -5, security: 15, approval: 5 }, outcome: "Your cyber team successfully disrupts the attacker's infrastructure. However, escalation fears rise globally." },
      { label: "Engage in diplomatic channels", effects: { diplomacy: 15, economy: 0, security: -5, approval: -5 }, outcome: "Diplomatic talks begin but progress is slow. Critics accuse you of weakness while power remains out." },
      { label: "Declare state of emergency & rebuild", effects: { diplomacy: 5, economy: -15, security: 10, approval: 10 }, outcome: "Massive investment in cyber infrastructure begins. Grid is restored in 48 hours with improved defenses." },
    ],
  },
];

export default function PresidentialSim() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [stats, setStats] = useState({ diplomacy: 50, economy: 50, security: 50, approval: 50 });
  const [outcome, setOutcome] = useState<string | null>(null);
  const [decisions, setDecisions] = useState(0);

  const scenario = scenarios[currentScenario];

  const choose = (option: (typeof scenario.options)[0]) => {
    setStats((prev) => ({
      diplomacy: Math.max(0, Math.min(100, prev.diplomacy + option.effects.diplomacy)),
      economy: Math.max(0, Math.min(100, prev.economy + (option.effects.economy || 0))),
      security: Math.max(0, Math.min(100, prev.security + option.effects.security)),
      approval: Math.max(0, Math.min(100, prev.approval + option.effects.approval)),
    }));
    setOutcome(option.outcome);
    setDecisions((d) => d + 1);
  };

  const next = () => {
    setCurrentScenario((c) => (c + 1) % scenarios.length);
    setOutcome(null);
  };

  const statConfig = [
    { key: "diplomacy", label: "Diplomacy", icon: Heart, color: "bg-primary" },
    { key: "economy", label: "Economy", icon: DollarSign, color: "bg-gold" },
    { key: "security", label: "Security", icon: Shield, color: "bg-olive-dark" },
    { key: "approval", label: "Approval", icon: Zap, color: "bg-accent" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statConfig.map((s) => (
          <div key={s.key} className="gp-card text-center">
            <s.icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="font-mono text-xs text-muted-foreground uppercase">{s.label}</div>
            <div className="font-display text-2xl font-bold">{stats[s.key]}</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div className={`${s.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${stats[s.key]}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Scenario */}
      <div className="gp-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="gp-badge">Scenario {currentScenario + 1}</span>
          <span className="text-xs text-muted-foreground font-mono">Decisions made: {decisions}</span>
        </div>
        <h3 className="font-display text-xl font-bold mb-2">{scenario.title}</h3>
        <p className="text-sm text-foreground mb-4">{scenario.description}</p>

        {!outcome ? (
          <div className="space-y-2">
            {scenario.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => choose(opt)}
                className="w-full text-left gp-btn-secondary text-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-muted rounded-md p-4">
            <p className="text-sm text-foreground mb-3">{outcome}</p>
            <button onClick={next} className="gp-btn-primary text-sm">Next Scenario →</button>
          </div>
        )}
      </div>
    </div>
  );
}
