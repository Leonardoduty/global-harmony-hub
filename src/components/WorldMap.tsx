import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { X, Loader2, AlertTriangle, Heart, Clock, Shield, Swords, DollarSign, Globe2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCountryInfo } from "@/functions/country.functions";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const hotspots = [
  { name: "Ukraine", coords: [30.5, 50.4] as [number, number], status: "conflict" },
  { name: "Sudan", coords: [32.5, 15.6] as [number, number], status: "conflict" },
  { name: "Myanmar", coords: [96.0, 21.9] as [number, number], status: "conflict" },
  { name: "Geneva", coords: [6.1, 46.2] as [number, number], status: "peace" },
  { name: "New York (UN)", coords: [-74.0, 40.7] as [number, number], status: "peace" },
];

type CountryInfo = {
  name: string;
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
};

function AttributeBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="w-20 font-mono text-muted-foreground">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-muted-foreground w-8 text-right">{value}</span>
    </div>
  );
}

export default function WorldMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "conflicts" | "peace" | "history">("overview");

  const getInfoFn = useServerFn(getCountryInfo);

  const handleCountryClick = async (countryName: string) => {
    if (loading) return;
    setSelectedCountry(countryName);
    setCountryInfo(null);
    setLoading(true);
    setActiveTab("overview");

    try {
      const result = await getInfoFn({ data: { countryName } });
      if (result.info) setCountryInfo(result.info);
    } catch {
      console.error("Failed to load country info");
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
              geographies.map((geo) => (
                <Geography
                  key={geo.rpiKey || geo.properties?.name}
                  geography={geo}
                  fill="oklch(0.82 0.06 90)"
                  stroke="oklch(0.7 0.04 80)"
                  strokeWidth={0.5}
                  onClick={() => {
                    const name = geo.properties?.name;
                    if (name) handleCountryClick(name);
                  }}
                  style={{ hover: { fill: "oklch(0.7 0.1 130)" } }}
                  className="cursor-pointer"
                />
              ))
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

      {/* Country Info Panel */}
      {selectedCountry && (
        <div className="absolute top-0 right-0 w-full md:w-[420px] h-full bg-card border border-border rounded-lg shadow-2xl overflow-y-auto z-10">
          <div className="sticky top-0 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between z-20">
            <h3 className="font-display font-bold text-sm tracking-wide">{selectedCountry}</h3>
            <button onClick={() => { setSelectedCountry(null); setCountryInfo(null); }}><X className="w-4 h-4" /></button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-mono text-muted-foreground">Analyzing {selectedCountry}...</span>
            </div>
          ) : countryInfo ? (
            <div className="p-4 space-y-4">
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
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Failed to load data. Click another country.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
