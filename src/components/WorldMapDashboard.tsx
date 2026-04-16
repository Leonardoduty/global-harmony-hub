import { useState, useCallback, useEffect, useRef } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, Objects } from "topojson-client";
import {
  X, Clock, Users, MapPin, AlertTriangle, ChevronRight,
  Shield, Radio, Globe, Layers, TrendingUp,
} from "lucide-react";
import DoomsdayClock from "@/components/DoomsdayClock";
import {
  COUNTRY_DATABASE, getCountryData, computeGlobalRiskSeconds, computeRiskForCountry,
  RISK_LABELS, RISK_COLORS, type CountryRecord,
} from "@/lib/countryDatabase";

const MAP_W = 960;
const MAP_H = 480;

type GeoFeature = {
  type: string;
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: unknown;
};

type TopoData = Topology<Objects<{ name?: string; NAME?: string }>>;

function useWorldGeo() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls = [
        "/geo/countries-110m.json",
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const topo = (await r.json()) as TopoData;
          if (cancelled) return;
          const col = feature(topo, topo.objects.countries as Parameters<typeof feature>[1]);
          const feats = "features" in col ? (col.features as GeoFeature[]) : [];
          if (feats.length > 0) {
            setFeatures(feats);
            setLoaded(true);
            return;
          }
        } catch {}
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  return { features, loaded };
}

function getCountryNameFromFeature(f: GeoFeature): string {
  if (!f.properties) return "";
  return (
    (f.properties["name"] as string | undefined) ??
    (f.properties["NAME"] as string | undefined) ??
    ""
  );
}

function getRiskFill(name: string, selected: string | null, hovered: string | null): string {
  const isSelected = selected === name;
  const isHovered = hovered === name && !isSelected;
  if (isSelected) return "rgba(99,179,237,0.85)";
  if (isHovered) return "rgba(147,197,253,0.7)";

  const record = getCountryData(name);
  if (!record) return "rgba(180,180,160,0.5)";
  const c = RISK_COLORS[record.riskLevel];
  return c + "aa";
}

function AlertOverlay({ level }: { level: number }) {
  if (level < 0.25) return null;
  const opacity = (level - 0.25) * 0.5;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 30%, rgba(180,10,10,${opacity}) 100%)`,
        mixBlendMode: "multiply",
      }}
    />
  );
}

function RiskBadge({ level }: { level: number }) {
  const color = RISK_COLORS[level];
  const label = RISK_LABELS[level];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
      style={{ background: color + "30", color, border: `1px solid ${color}55` }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}

function CountryPanel({
  record, name, onClose, onNavigate,
}: {
  record: CountryRecord;
  name: string;
  onClose: () => void;
  onNavigate: (n: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "timeline" | "conflicts">("overview");
  const color = RISK_COLORS[record.riskLevel];

  return (
    <div
      className="absolute top-0 right-0 h-full w-full md:w-[380px] flex flex-col shadow-2xl z-20"
      style={{
        background: "rgba(8,8,18,0.97)",
        borderLeft: `2px solid ${color}55`,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="flex items-start justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${color}44`, background: `${color}18` }}
      >
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-mono font-bold text-base text-white leading-tight">{name}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <RiskBadge level={record.riskLevel} />
            <span className="font-mono text-[10px] text-white/40">{record.region}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex border-b border-white/10 shrink-0">
        {(["overview", "timeline", "conflicts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors"
            style={{
              color: tab === t ? color : "rgba(255,255,255,0.35)",
              borderBottom: tab === t ? `2px solid ${color}` : "2px solid transparent",
              background: tab === t ? `${color}10` : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "overview" && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-blue-400/70" />
                  <span className="font-mono text-[9px] text-white/40 uppercase">Capital</span>
                </div>
                <p className="font-mono text-xs text-white/90 leading-tight">{record.capital}</p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-purple-400/70" />
                  <span className="font-mono text-[9px] text-white/40 uppercase">Population</span>
                </div>
                <p className="font-mono text-xs text-white/90">{record.population}</p>
              </div>
            </div>

            <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-yellow-400/70" />
                <span className="font-mono text-[9px] text-white/40 uppercase">Leadership</span>
              </div>
              <p className="font-mono text-xs text-white/90">{record.leader.name}</p>
              <p className="font-mono text-[10px] text-white/40">{record.leader.title}</p>
            </div>

            <div>
              <p className="font-mono text-[9px] text-white/40 uppercase mb-1.5">Stability Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${record.stabilityScore}%`,
                      background: `linear-gradient(90deg, ${color}, ${RISK_COLORS[Math.max(1, record.riskLevel - 2)]})`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs font-bold" style={{ color }}>{record.stabilityScore}/100</span>
              </div>
            </div>

            <div>
              <p className="font-mono text-[9px] text-white/40 uppercase mb-1.5">Situation</p>
              <p className="text-xs text-white/70 leading-relaxed">{record.currentSituation}</p>
            </div>

            <p className="text-xs text-white/55 leading-relaxed border-t border-white/5 pt-3">{record.summary}</p>

            {(record.allies.length > 0 || record.rivals.length > 0) && (
              <div className="space-y-2 border-t border-white/5 pt-3">
                {record.allies.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-green-400/60 uppercase mb-1">Allied with</p>
                    <div className="flex flex-wrap gap-1">
                      {record.allies.slice(0, 6).map((a) => (
                        <button
                          key={a}
                          onClick={() => onNavigate(a)}
                          className="font-mono text-[10px] px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {record.rivals.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-red-400/60 uppercase mb-1">In tension with</p>
                    <div className="flex flex-wrap gap-1">
                      {record.rivals.slice(0, 6).map((r) => (
                        <button
                          key={r}
                          onClick={() => onNavigate(r)}
                          className="font-mono text-[10px] px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div className="p-4">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }} />
              <div className="space-y-4 pl-8">
                {record.timeline.map((e, i) => (
                  <div key={i} className="relative">
                    <div
                      className="absolute -left-5 top-1 w-2 h-2 rounded-full"
                      style={{ background: i === 0 ? color : `${color}66`, border: `1px solid ${color}` }}
                    />
                    <span className="font-mono text-[10px] font-bold" style={{ color }}>{e.year}</span>
                    <p className="text-xs text-white/65 leading-relaxed mt-0.5">{e.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "conflicts" && (
          <div className="p-4 space-y-3">
            {record.conflicts.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-8 h-8 text-green-400/40 mx-auto mb-2" />
                <p className="font-mono text-xs text-white/30">No active conflicts recorded</p>
              </div>
            ) : (
              record.conflicts.map((c, i) => {
                const statusColor = c.status === "active" ? "#ef4444" : c.status === "frozen" ? "#facc15" : "#22c55e";
                return (
                  <div
                    key={i}
                    className="rounded-lg p-3"
                    style={{ background: `${statusColor}08`, border: `1px solid ${statusColor}33` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-white/85">{c.name}</span>
                      <span
                        className="font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold"
                        style={{ background: `${statusColor}25`, color: statusColor }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-white/40">Since {c.since}</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div
      className="absolute bottom-3 left-3 rounded-xl p-3 z-10"
      style={{ background: "rgba(5,5,15,0.82)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
    >
      <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider mb-2">Risk Level</p>
      <div className="space-y-1">
        {([
          [1, "Stable"],
          [4, "Moderate"],
          [7, "Very High"],
          [10, "Extreme"],
        ] as [number, string][]).map(([level, label]) => (
          <div key={level} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: RISK_COLORS[level] }} />
            <span className="font-mono text-[9px] text-white/55">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-white/5 pt-1 mt-1">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-gray-500/40" />
          <span className="font-mono text-[9px] text-white/35">Unknown</span>
        </div>
      </div>
    </div>
  );
}

function StatsBar({ selectedRecord }: { selectedRecord: CountryRecord | null }) {
  const allRecords = Object.values(COUNTRY_DATABASE);
  const extremeCount = allRecords.filter((r) => r.riskLevel >= 9).length;
  const highCount = allRecords.filter((r) => r.riskLevel >= 7 && r.riskLevel < 9).length;
  const stableCount = allRecords.filter((r) => r.riskLevel <= 2).length;
  const activeConflicts = allRecords.reduce((sum, r) => sum + r.conflicts.filter((c) => c.status === "active").length, 0);

  return (
    <div
      className="flex items-center gap-0 border-b"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(5,5,15,0.9)" }}
    >
      {selectedRecord ? (
        <>
          <StatItem icon={<TrendingUp className="w-3 h-3" />} label="Stability" value={`${selectedRecord.stabilityScore}/100`} color={RISK_COLORS[selectedRecord.riskLevel]} />
          <StatItem icon={<MapPin className="w-3 h-3" />} label="Capital" value={selectedRecord.capital.split("/")[0].trim()} color="#60a5fa" />
          <StatItem icon={<Users className="w-3 h-3" />} label="Population" value={selectedRecord.population} color="#a78bfa" />
          <StatItem icon={<AlertTriangle className="w-3 h-3" />} label="Conflicts" value={String(selectedRecord.conflicts.length)} color={selectedRecord.conflicts.some((c) => c.status === "active") ? "#ef4444" : "#4ade80"} />
        </>
      ) : (
        <>
          <StatItem icon={<Globe className="w-3 h-3" />} label="Monitored" value={`${Object.keys(COUNTRY_DATABASE).length} nations`} color="#60a5fa" />
          <StatItem icon={<AlertTriangle className="w-3 h-3" />} label="Extreme Risk" value={String(extremeCount)} color="#7f1d1d" />
          <StatItem icon={<Radio className="w-3 h-3" />} label="High Risk" value={String(highCount)} color="#ef4444" />
          <StatItem icon={<Shield className="w-3 h-3" />} label="Active Conflicts" value={String(activeConflicts)} color="#f97316" />
          <StatItem icon={<Globe className="w-3 h-3" />} label="Stable Nations" value={String(stableCount)} color="#22c55e" />
        </>
      )}
    </div>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-r" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <span style={{ color: `${color}aa` }}>{icon}</span>
      <div>
        <p className="font-mono text-[8px] text-white/30 uppercase leading-none">{label}</p>
        <p className="font-mono text-[11px] font-bold leading-tight" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

export default function WorldMapDashboard() {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [showTerrain, setShowTerrain] = useState(true);
  const [doomsdaySecs, setDoomsdaySecs] = useState(computeGlobalRiskSeconds);
  const [alertLevel, setAlertLevel] = useState(0.5);
  const { features, loaded } = useWorldGeo();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const projection = geoNaturalEarth1()
    .scale(MAP_W / (2 * Math.PI) * 0.92)
    .translate([MAP_W / 2, MAP_H / 2]);
  const pathGen = geoPath(projection);

  const handleSelect = useCallback((name: string) => {
    setSelectedName(name);
    const record = getCountryData(name);
    if (record) {
      const risk = computeRiskForCountry(record);
      const adjustedSecs = Math.round(computeGlobalRiskSeconds() * (1 - risk * 0.35));
      setDoomsdaySecs(Math.max(15, adjustedSecs));
      setAlertLevel(risk);
    } else {
      setDoomsdaySecs(computeGlobalRiskSeconds());
      setAlertLevel(0.4);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedName(null);
    setDoomsdaySecs(computeGlobalRiskSeconds());
    setAlertLevel(0.5);
  }, []);

  const selectedRecord = selectedName ? (getCountryData(selectedName) ?? null) : null;

  return (
    <div
      className="flex flex-col w-full rounded-xl overflow-hidden"
      style={{ background: "#05050f", border: "1px solid rgba(255,255,255,0.07)", fontFamily: "var(--font-mono, monospace)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0 gap-3"
        style={{ background: "rgba(5,5,18,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="font-mono text-xs font-bold text-white/80 tracking-widest uppercase truncate">Global Pulse — Live Monitor</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DoomsdayClock secondsToMidnight={doomsdaySecs} alertLevel={alertLevel} />
          <button
            onClick={() => setShowTerrain((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-colors"
            style={{
              background: showTerrain ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.05)",
              color: showTerrain ? "#60a5fa" : "rgba(255,255,255,0.35)",
              border: `1px solid ${showTerrain ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <Layers className="w-3 h-3" />
            Terrain
          </button>
        </div>
      </div>

      <StatsBar selectedRecord={selectedRecord} />

      <div className="relative" style={{ aspectRatio: "2/1", background: "#05050f" }}>
        {showTerrain && (
          <img
            src="/world-terrain.png"
            alt="World terrain"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.45, mixBlendMode: "luminosity" }}
            draggable={false}
          />
        )}

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="font-mono text-xs text-white/30">Loading geospatial data...</span>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="absolute inset-0 w-full h-full"
          style={{ background: showTerrain ? "transparent" : "oklch(0.15 0.03 250)" }}
        >
          <defs>
            <filter id="country-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {loaded && features.map((geo, i) => {
            const name = getCountryNameFromFeature(geo);
            const isSelected = selectedName === name;
            const isHovered = hoveredName === name;
            const fill = getRiskFill(name, selectedName, hoveredName);
            const d = pathGen(geo as Parameters<typeof pathGen>[0]);
            if (!d) return null;

            return (
              <path
                key={i}
                d={d}
                fill={fill}
                stroke={isSelected ? "#93c5fd" : isHovered ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.4}
                className="cursor-pointer"
                style={{ transition: "fill 0.15s, stroke 0.15s", filter: isSelected ? "url(#country-glow)" : undefined }}
                onClick={() => { if (name) handleSelect(name); }}
                onMouseEnter={(e) => {
                  setHoveredName(name);
                  if (tooltipRef.current) {
                    const svg = svgRef.current;
                    const rect = svg?.getBoundingClientRect();
                    if (rect) {
                      tooltipRef.current.style.display = "block";
                      tooltipRef.current.style.left = `${e.clientX - rect.left + 8}px`;
                      tooltipRef.current.style.top = `${e.clientY - rect.top - 28}px`;
                      const record = getCountryData(name);
                      tooltipRef.current.innerHTML = name
                        ? `<span style="color:white;font-weight:bold">${name}</span>${record ? ` <span style="color:${RISK_COLORS[record.riskLevel]};font-size:9px"> · ${RISK_LABELS[record.riskLevel]}</span>` : ""}`
                        : "";
                    }
                  }
                }}
                onMouseLeave={() => {
                  setHoveredName(null);
                  if (tooltipRef.current) tooltipRef.current.style.display = "none";
                }}
              />
            );
          })}
        </svg>

        <div
          ref={tooltipRef}
          className="absolute pointer-events-none z-30 px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap"
          style={{
            display: "none",
            background: "rgba(5,5,20,0.92)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(4px)",
          }}
        />

        <AlertOverlay level={alertLevel} />

        <MapLegend />

        {hoveredName && !selectedName && (
          <div
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px]"
            style={{ background: "rgba(5,5,20,0.85)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          >
            <ChevronRight className="w-3 h-3" />
            Click to open briefing
          </div>
        )}

        {selectedRecord && selectedName && (
          <CountryPanel
            record={selectedRecord}
            name={selectedName}
            onClose={handleClose}
            onNavigate={(n) => handleSelect(n)}
          />
        )}

        {!selectedRecord && selectedName && (
          <div className="absolute top-0 right-0 h-full w-full md:w-[380px] flex flex-col items-center justify-center z-20"
            style={{ background: "rgba(8,8,18,0.95)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-center px-8">
              <Globe className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="font-mono text-sm text-white/50 font-bold">{selectedName}</p>
              <p className="font-mono text-xs text-white/25 mt-1">No detailed data available for this territory.</p>
              <button
                onClick={handleClose}
                className="mt-4 font-mono text-xs px-3 py-1.5 rounded hover:bg-white/10 transition-colors text-white/40"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className="px-4 py-2 flex items-center justify-between shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,5,12,0.9)" }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-white/20" />
          <span className="font-mono text-[9px] text-white/20 uppercase tracking-wider">
            All data is hardcoded for offline operation · No external APIs
          </span>
        </div>
        <span className="font-mono text-[9px] text-white/15">
          {Object.keys(COUNTRY_DATABASE).length} nations indexed
        </span>
      </div>
    </div>
  );
}
