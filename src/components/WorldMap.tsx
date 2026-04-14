import { useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import {
  X, Loader2, AlertTriangle, Heart, Clock, Shield, Swords, DollarSign,
  Globe2, User, MapPin, Flag
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCountryInfo, getCountryRelationships } from "@/functions/country.functions";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const hotspots = [
  { name: "Ukraine", coords: [30.5, 50.4] as [number, number], status: "conflict" },
  { name: "Sudan", coords: [32.5, 15.6] as [number, number], status: "conflict" },
  { name: "Myanmar", coords: [96.0, 21.9] as [number, number], status: "conflict" },
  { name: "Geneva", coords: [6.1, 46.2] as [number, number], status: "peace" },
  { name: "New York (UN)", coords: [-74.0, 40.7] as [number, number], status: "peace" },
];

// Country name mapping from topojson to standard names
const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States of America": "United States",
  "S. Korea": "South Korea",
  "N. Korea": "North Korea",
  "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Czech Rep.": "Czech Republic",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "W. Sahara": "Western Sahara",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern Territories",
  "Solomon Is.": "Solomon Islands",
};

type CountryInfo = {
  name: string;
  leader?: { name: string; personality: string };
  conflicts: { name: string; status: string; years: string; description: string }[];
  peaceInitiatives: { name: string; year: string; description: string }[];
  history: { year: string; event: string }[];
  alliances?: string[];
  attributes?: {
    stability: number;
    economicStrength: number;
    militaryStrength: number;
    diplomacyScore: number;
    politicalFreedom: number;
  };
  economicStatus?: string;
  politicalSystem?: string;
  stabilityScore: number;
  summary: string;
  relationships?: { allies: string[]; enemies: string[]; neutral: string[] };
  politicalStance?: string;
  currentSituation?: string;
};

function AttributeBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="w-20 font-mono text-muted-foreground">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-muted-foreground w-8 text-right">{value}</span>
    </div>
  );
}

const RELATIONSHIP_COLORS = {
  ally: "oklch(0.55 0.15 130)",    // green
  enemy: "oklch(0.55 0.22 25)",    // red
  neutral: "oklch(0.75 0.15 85)",  // yellow/gold
  default: "oklch(0.82 0.06 90)",  // khaki
  selected: "oklch(0.45 0.1 130)", // dark green (selected country)
};

export default function WorldMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [relationships, setRelationships] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "conflicts" | "peace" | "history">("overview");

  const getInfoFn = useServerFn(getCountryInfo);
  const getRelFn = useServerFn(getCountryRelationships);

  const normalizeCountryName = (name: string) => COUNTRY_NAME_MAP[name] || name;

  const getCountryFill = useCallback((geoName: string) => {
    const name = normalizeCountryName(geoName);
    if (!selectedCountry || Object.keys(relationships).length === 0) return RELATIONSHIP_COLORS.default;
    if (name === selectedCountry) return RELATIONSHIP_COLORS.selected;
    const rel = relationships[name];
    if (rel === "ally") return RELATIONSHIP_COLORS.ally;
    if (rel === "enemy") return RELATIONSHIP_COLORS.enemy;
    if (rel === "neutral") return RELATIONSHIP_COLORS.neutral;
    return RELATIONSHIP_COLORS.default;
  }, [selectedCountry, relationships]);

  const handleCountryClick = async (countryName: string) => {
    if (loading) return;
    const normalized = normalizeCountryName(countryName);
    setSelectedCountry(normalized);
    setCountryInfo(null);
    setRelationships({});
    setLoading(true);
    setActiveTab("overview");
    setIsFallback(false);

    try {
      // Fetch country info and relationships in parallel
      const [infoResult, relResult] = await Promise.all([
        getInfoFn({ data: { countryName: normalized } }).catch((e) => {
          console.error("Country info fetch failed:", e);
          return null;
        }),
        getRelFn({ data: { countryName: normalized } }).catch((e) => {
          console.error("Relationships fetch failed:", e);
          return null;
        }),
      ]);

      if (infoResult?.info) {
        setCountryInfo(infoResult.info);
        setIsFallback(!!infoResult.fallback);
        // Use relationships from country info if dedicated endpoint failed
        if (relResult?.relationships && Object.keys(relResult.relationships).length > 0) {
          setRelationships(relResult.relationships);
        } else if (infoResult.info.relationships) {
          // Build from country info
          const relMap: Record<string, string> = {};
          for (const a of infoResult.info.relationships.allies || []) relMap[a] = "ally";
          for (const e of infoResult.info.relationships.enemies || []) relMap[e] = "enemy";
          for (const n of infoResult.info.relationships.neutral || []) relMap[n] = "neutral";
          setRelationships(relMap);
        }
      }
    } catch (error) {
      console.error("Failed to load country data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="w-full aspect-[2/1] bg-sand rounded-lg overflow-hidden border border-border">
        <ComposableMap projectionConfig={{ scale: 140 }} className="w-full h-full">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties?.name || "";
                return (
                  <Geography
                    key={geo.rpiKey || name}
                    geography={geo}
                    fill={getCountryFill(name)}
                    stroke="oklch(0.7 0.04 80)"
                    strokeWidth={0.5}
                    onClick={() => { if (name) handleCountryClick(name); }}
                    style={{
                      default: { outline: "none", transition: "fill 0.3s ease" },
                      hover: { fill: "oklch(0.65 0.12 130)", outline: "none", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    className="cursor-pointer"
                  />
                );
              })
            }
          </Geographies>
          {hotspots.map((h) => (
            <Marker key={h.name} coordinates={h.coords}>
              <circle
                r={5}
                fill={h.status === "conflict" ? "oklch(0.55 0.22 25)" : "oklch(0.55 0.15 130)"}
                stroke="oklch(0.98 0.005 80)"
                strokeWidth={1.5}
                className="cursor-pointer"
                onClick={() => handleCountryClick(h.name.replace(" (UN)", ""))}
              />
              <text textAnchor="middle" y={-10} style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "oklch(0.3 0.03 60)" }}>
                {h.name}
              </text>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      {/* Legend */}
      {selectedCountry && Object.keys(relationships).length > 0 && (
        <div className="flex gap-4 mt-3 text-xs font-mono flex-wrap">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: RELATIONSHIP_COLORS.ally }} /> Allied</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: RELATIONSHIP_COLORS.enemy }} /> Hostile</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: RELATIONSHIP_COLORS.neutral }} /> Neutral</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: RELATIONSHIP_COLORS.selected }} /> Selected</div>
        </div>
      )}

      {/* Country Info Panel */}
      {selectedCountry && (
        <div className="absolute top-0 right-0 w-full md:w-[440px] h-full bg-card border border-border rounded-lg shadow-2xl overflow-y-auto z-10">
          <div className="sticky top-0 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <h3 className="font-display font-bold text-sm tracking-wide">{selectedCountry}</h3>
              {isFallback && <span className="text-[10px] font-mono bg-gold/30 text-gold px-1.5 py-0.5 rounded">OFFLINE DATA</span>}
            </div>
            <button onClick={() => { setSelectedCountry(null); setCountryInfo(null); setRelationships({}); }}><X className="w-4 h-4" /></button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-mono text-muted-foreground">Analyzing {selectedCountry}...</span>
            </div>
          ) : countryInfo ? (
            <div className="p-4 space-y-4">
              {/* Leader */}
              {countryInfo.leader && (
                <div className="flex items-start gap-3 bg-muted/50 rounded-md p-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm">{countryInfo.leader.name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{countryInfo.leader.personality}</p>
                  </div>
                </div>
              )}

              {/* Stability Score */}
              <div className="text-center">
                <div className="font-mono text-xs text-muted-foreground uppercase">Stability Score</div>
                <div className={`font-display text-3xl font-bold ${countryInfo.stabilityScore >= 60 ? "text-primary" : countryInfo.stabilityScore >= 30 ? "text-gold" : "text-destructive"}`}>
                  {countryInfo.stabilityScore}/100
                </div>
                {countryInfo.politicalSystem && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">{countryInfo.politicalSystem}</p>
                )}
                {countryInfo.economicStatus && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full mt-1 inline-block ${
                    countryInfo.economicStatus === "growing" ? "bg-primary/15 text-primary" :
                    countryInfo.economicStatus === "stable" ? "bg-muted text-muted-foreground" :
                    countryInfo.economicStatus === "declining" ? "bg-gold/15 text-gold" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    Economy: {countryInfo.economicStatus}
                  </span>
                )}
              </div>

              {/* Political Stance & Situation */}
              {countryInfo.politicalStance && (
                <div className="bg-muted/30 rounded-md p-3 border-l-2 border-primary">
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Political Stance</p>
                  <p className="text-sm text-foreground">{countryInfo.politicalStance}</p>
                </div>
              )}
              {countryInfo.currentSituation && (
                <div className="bg-muted/30 rounded-md p-3 border-l-2 border-gold">
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Current Situation</p>
                  <p className="text-sm text-foreground">{countryInfo.currentSituation}</p>
                </div>
              )}

              <p className="text-sm text-foreground">{countryInfo.summary}</p>

              {/* Attributes */}
              {countryInfo.attributes && (
                <div className="space-y-2 bg-muted/50 rounded-md p-3">
                  <AttributeBar label="Economy" value={countryInfo.attributes.economicStrength} icon={DollarSign} color="bg-gold" />
                  <AttributeBar label="Military" value={countryInfo.attributes.militaryStrength} icon={Swords} color="bg-destructive" />
                  <AttributeBar label="Diplomacy" value={countryInfo.attributes.diplomacyScore} icon={Globe2} color="bg-primary" />
                  <AttributeBar label="Stability" value={countryInfo.attributes.stability} icon={Shield} color="bg-accent" />
                  <AttributeBar label="Freedom" value={countryInfo.attributes.politicalFreedom} icon={Heart} color="bg-primary" />
                </div>
              )}

              {/* Relationships Summary */}
              {countryInfo.relationships && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase">Diplomatic Relationships</p>
                  {countryInfo.relationships.allies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {countryInfo.relationships.allies.map((a, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary cursor-pointer hover:bg-primary/25 transition-colors" onClick={() => handleCountryClick(a)}>🟢 {a}</span>
                      ))}
                    </div>
                  )}
                  {countryInfo.relationships.enemies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {countryInfo.relationships.enemies.map((e, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive cursor-pointer hover:bg-destructive/25 transition-colors" onClick={() => handleCountryClick(e)}>🔴 {e}</span>
                      ))}
                    </div>
                  )}
                  {countryInfo.relationships.neutral.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {countryInfo.relationships.neutral.map((n, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold cursor-pointer hover:bg-gold/25 transition-colors" onClick={() => handleCountryClick(n)}>🟡 {n}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alliances */}
              {countryInfo.alliances && countryInfo.alliances.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1.5">Alliances & Organizations</p>
                  <div className="flex flex-wrap gap-1">
                    {countryInfo.alliances.map((a, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-border">
                {([
                  { key: "overview" as const, label: "Overview", icon: Globe2 },
                  { key: "conflicts" as const, label: "Conflicts", icon: AlertTriangle },
                  { key: "peace" as const, label: "Peace", icon: Heart },
                  { key: "history" as const, label: "History", icon: Clock },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1 px-2.5 py-2 text-[11px] font-mono uppercase transition-colors ${activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="text-sm text-foreground space-y-2">
                  <p>{countryInfo.summary}</p>
                  <p className="text-xs text-muted-foreground">Click the tabs above for detailed conflict history, peace initiatives, and timeline.</p>
                </div>
              )}

              {activeTab === "conflicts" && (
                <div className="space-y-2">
                  {countryInfo.conflicts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No major conflicts recorded.</p>
                  ) : (
                    countryInfo.conflicts.map((c, i) => (
                      <div key={i} className={`rounded-md p-3 border ${c.status === "active" ? "border-destructive/40 bg-destructive/5" : c.status === "resolved" ? "border-primary/40 bg-primary/5" : "border-gold/40 bg-gold/5"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{c.name}</span>
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-destructive/15 text-destructive" : c.status === "resolved" ? "bg-primary/15 text-primary" : "bg-gold/15 text-gold"}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mb-1">{c.years}</div>
                        <p className="text-xs text-foreground">{c.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "peace" && (
                <div className="space-y-2">
                  {countryInfo.peaceInitiatives.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No peace initiatives recorded.</p>
                  ) : (
                    countryInfo.peaceInitiatives.map((p, i) => (
                      <div key={i} className="rounded-md p-3 border border-primary/30 bg-primary/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{p.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">{p.year}</span>
                        </div>
                        <p className="text-xs text-foreground">{p.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-1">
                  {countryInfo.history.map((h, i) => (
                    <div key={i} className="flex gap-3 text-xs">
                      <span className="font-mono text-muted-foreground w-20 shrink-0">{h.year}</span>
                      <span className="text-foreground">{h.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
              <AlertTriangle className="w-6 h-6 text-gold" />
              <p className="text-sm text-muted-foreground text-center">Could not load data for this country. Try clicking another country on the map.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
