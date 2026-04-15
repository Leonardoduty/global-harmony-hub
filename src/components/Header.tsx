import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import logo from "@/assets/logo.png";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/conflict-map", label: "Conflict Map" },
  { to: "/news-shield", label: "News Shield" },
  { to: "/situation-room", label: "Situation Room" },
  { to: "/presidential-sim", label: "Presidential Sim" },
] as const;

export default function Header() {
  const location = useLocation();
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: "rgba(5,5,15,0.88)",
        borderBottom: "1px solid rgba(96,165,250,0.12)",
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5">
        <Link to="/" className="flex items-center gap-3 group">
          <motion.img
            src={logo}
            alt="Global Pulse"
            width={36}
            height={36}
            whileHover={{ rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
          <div className="leading-tight">
            <span
              className="font-mono text-base font-black tracking-widest text-white"
              style={{ textShadow: "0 0 20px rgba(96,165,250,0.5)" }}
            >
              GLOBAL PULSE:
            </span>
            <span className="block text-[10px] font-mono tracking-[0.35em] text-blue-400/60 uppercase">
              Harmony Monitor
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link key={l.to} to={l.to}>
                <motion.span
                  className="relative block px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest rounded-md transition-colors"
                  style={{
                    color: active ? "#60a5fa" : "rgba(255,255,255,0.45)",
                    background: active ? "rgba(96,165,250,0.1)" : "transparent",
                  }}
                  whileHover={{ color: "#93c5fd", background: "rgba(96,165,250,0.08)" }}
                >
                  {active && (
                    <motion.span
                      className="absolute inset-x-2 bottom-0.5 h-px bg-blue-400 rounded-full"
                      layoutId="nav-underline"
                      style={{ boxShadow: "0 0 6px #60a5fa" }}
                    />
                  )}
                  {l.label}
                </motion.span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <motion.div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] uppercase tracking-wider"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            animate={{ borderColor: ["rgba(239,68,68,0.2)", "rgba(239,68,68,0.5)", "rgba(239,68,68,0.2)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Radio className="w-3 h-3" />
            Live
          </motion.div>
        </div>
      </div>
    </header>
  );
}
