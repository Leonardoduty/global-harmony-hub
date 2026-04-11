import { Link, useLocation } from "@tanstack/react-router";
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
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Global Pulse" width={40} height={40} />
          <div className="leading-tight">
            <span className="font-display text-lg font-bold tracking-wider text-foreground">GLOBAL PULSE:</span>
            <span className="block text-xs font-mono tracking-[0.3em] text-muted-foreground">HARMONY MONITOR</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`gp-nav-link ${location.pathname === l.to ? "gp-nav-link-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
