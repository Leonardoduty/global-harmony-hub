import { createFileRoute, Link } from "@tanstack/react-router";
import { Map, Shield, Zap, Users, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import heroImg from "@/assets/hero-globe.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Global Pulse — Harmony Monitor" },
      { name: "description", content: "Monitor global conflicts, verify news, simulate presidential decisions, and explore community peace initiatives." },
    ],
  }),
  component: Index,
});

function MapPreview() {
  const hotspots = [
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
    <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: "2/1", background: "#05050f" }}>
      <img
        src="/world-terrain.png"
        alt="World map"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.5, mixBlendMode: "luminosity" }}
        draggable={false}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(180,10,10,0.08) 0%, rgba(5,5,15,0.4) 100%)" }} />

      {hotspots.map((h) => (
        <div
          key={h.label}
          className="absolute flex items-center gap-1"
          style={{ left: h.x, top: h.y, transform: "translate(-50%,-50%)" }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block animate-pulse"
            style={{ background: h.color, boxShadow: `0 0 6px ${h.color}` }}
          />
          <span className="font-mono text-[9px] text-white/60 hidden sm:inline">{h.label}</span>
        </div>
      ))}

      <div
        className="absolute top-2 right-2 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg"
        style={{ background: "rgba(5,5,20,0.85)", border: "1px solid rgba(239,68,68,0.3)" }}
      >
        <Clock className="w-3 h-3 text-red-400" />
        <span className="font-mono text-[9px] text-red-400 font-bold">1:45</span>
        <span className="font-mono text-[7px] text-white/30">TO MIDNIGHT</span>
      </div>

      <div className="absolute bottom-2 left-2 flex gap-2">
        {[
          { color: "#ef4444", label: "Conflict" },
          { color: "#facc15", label: "Elevated" },
          { color: "#22c55e", label: "Stable" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
            <span className="font-mono text-[8px] text-white/40">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="font-mono text-xs text-white/40 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Map className="w-3 h-3" />
          Open Interactive Map
        </div>
      </div>
    </div>
  );
}

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <img src={heroImg} alt="Global network" className="absolute inset-0 w-full h-full object-cover" width={1920} height={600} />
        <div className="gp-hero-overlay" />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-display text-4xl md:text-6xl font-black text-primary-foreground tracking-wider mb-3">
            GLOBAL PULSE
          </h1>
          <p className="font-mono text-sm md:text-base tracking-[0.4em] text-primary-foreground/80 uppercase">
            Harmony Monitor
          </p>
          <p className="mt-4 max-w-lg mx-auto text-sm text-primary-foreground/70">
            Real-time conflict monitoring, verified news, and diplomatic simulations for a more peaceful world.
          </p>
        </div>
      </section>

      {/* Dashboard Grid */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Map Card */}
          <Link to="/conflict-map" className="lg:col-span-2 gp-card group">
            <div className="flex items-center gap-2 mb-3">
              <Map className="w-5 h-5 text-primary" />
              <span className="gp-card-header mb-0">Global Situation Map</span>
            </div>
            <MapPreview />
            <div className="flex items-center gap-1 mt-3 text-sm text-primary font-semibold group-hover:gap-2 transition-all">
              Open Intelligence Map <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Emergency Briefing */}
          <Link to="/situation-room" className="gp-card group flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-gold" />
                <span className="gp-card-header mb-0">Emergency Situation Briefing</span>
              </div>
              <div className="bg-muted rounded-md p-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-3">
                  <span className="text-3xl">🕊️</span>
                </div>
                <p className="text-sm text-foreground">Global Stability Index</p>
                <p className="font-display text-3xl font-bold text-primary">72/100</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm text-primary font-semibold group-hover:gap-2 transition-all">
              Enter Situation Room <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* News Shield */}
          <Link to="/news-shield" className="gp-card group">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary" />
              <span className="gp-card-header mb-0">Global News Shield</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">FACT CHECKLINE</span>
              </div>
              <div className="bg-muted rounded-md p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">✓ VERIFIED STORY</div>
                <p className="text-xs text-muted-foreground font-mono mt-1">[AI Analysis]</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm text-primary font-semibold group-hover:gap-2 transition-all">
              Open News Shield <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Presidential Sim */}
          <Link to="/presidential-sim" className="gp-card group">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-gold" />
              <span className="gp-card-header mb-0">Presidential Simulation</span>
            </div>
            <p className="text-sm text-muted-foreground">Step into the role of a world leader. Make critical decisions that shape global peace.</p>
            <div className="flex items-center gap-1 mt-4 text-sm text-primary font-semibold group-hover:gap-2 transition-all">
              Start Simulation <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Community Stories */}
          <Link to="/situation-room" className="gp-card group">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="gp-card-header mb-0">Community Success Stories</span>
            </div>
            <p className="text-sm text-muted-foreground">Discover how communities worldwide are building peace through grassroots initiatives.</p>
            <div className="flex items-center gap-1 mt-4 text-sm text-primary font-semibold group-hover:gap-2 transition-all">
              Read Stories <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
        Developed in Gwalior, India | Data sourced from verified partners | © 2026 GLOBAL PULSE
      </footer>
    </div>
  );
}
