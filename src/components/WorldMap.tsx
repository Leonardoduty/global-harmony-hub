import { useState, useCallback, useEffect, useRef } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, Objects } from "topojson-client";
import { X, Loader as Loader2, TriangleAlert as AlertTriangle, Heart, Clock, User, Users, Wifi, WifiOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCountryInfo } from "@/functions/country.functions";
import { getMockCountryInfo, type CountryInfo as MockCountryInfo } from "@/lib/mockCountryData";

const GEO_URLS = [
  "/geo/countries-110m.json",
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
  "https://unpkg.com/world-atlas@2/countries-110m.json",
];

const SIM_STORAGE_KEY = "gp-presidential-sim-v2";

function readPresidentialGameContext(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    if (!raw) return undefined;
    const o = JSON.parse(raw) as {
      decisions?: string[];
      stats?: Record<string, number>;
    };
    const decisions = o.decisions ?? [];
    const stats = o.stats;
    if (!decisions.length && !stats) return undefined;
    return [
      stats ? `Administration stats (0-100): ${JSON.stringify(stats)}` : "",
      decisions.length ? `Recent decisions: ${decisions.slice(-8).join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join(". ");
  } catch (e) {
    console.warn("[WorldMap] Could not read presidential sim context:", e);
    return undefined;
  }
}

const hotspots = [
  { name: "Ukraine", coords: [30.5, 50.4] as [number, number], status: "conflict" },
  { name: "Sudan", coords: [32.5, 15.6] as [number, number], status: "conflict" },
  { name: "Myanmar", coords: [96.0, 21.9] as [number, number], status: "conflict" },
  { name: "Geneva", coords: [6.1, 46.2] as [number, number], status: "peace" },
  { name: "New York (UN)", coords: [-74.0, 40.7] as [number, number], status: "peace" },
];

type GeoFeature = {
  type: string;
  properties: { name?: string; NAME?: string } | null;
  geometry: unknown;
};

type CountryInfo = MockCountryInfo;

function namesMatch(mapName: string, listName: string): boolean {
  const n = mapName.toLowerCase().trim();
  const c = listName.toLowerCase().trim();
  if (!n || !c) return false;
  if (n === c) return true;
  if (n.includes(c) || c.includes(n)) return true;
  const strip = (s: string) => s.replace(/[^a-z0-9]/g, "");
  const ns = strip(n);
  const cs = strip(c);
  return ns.length > 3 && cs.length > 3 && (ns.includes(cs) || cs.includes(ns));
}

function getRelationshipFill(
  countryName: string,
  relationships: { allied: string[]; hostile: string[]; neutral: string[] } | undefined
): string {
  if (!relationships) return "oklch(0.82 0.06 90)";
  const n = countryName.toLowerCase();
  if (relationships.hostile.some((c) => namesMatch(n, c))) {
    return "oklch(0.52 0.22 25)";
  }
  if (relationships.allied.some((c) => namesMatch(n, c))) {
    return "oklch(0.52 0.16 145)";
  }
  if (relationships.neutral.some((c) => namesMatch(n, c))) {
    return "oklch(0.78 0.16 95)";
  }
  return "oklch(0.82 0.06 90)";
}

const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;

function useWorldGeo() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const parseTopo = (topo: Topology<Objects<{ name?: string }>>) => {
      const countries = feature(topo, topo.objects.countries as Parameters<typeof feature>[1]);
      return "features" in countries ? (countries.features as GeoFeature[]) : [];
    };

    (async () => {
      for (const url of GEO_URLS) {
        try {
          const r = await fetch(url);
          if (!r.ok) {
            console.warn(`[WorldMap] Geo HTTP ${r.status} for`, url);
            continue;
          }
          const topo = (await r.json()) as Topology<Objects<{ name?: string }>>;
          if (cancelled) return;
          const feats = parseTopo(topo);
          if (feats.length === 0) {
            console.warn("[WorldMap] TopoJSON produced zero features from", url);
            continue;
          }
          setFeatures(feats);
          setGeoError(null);
          setLoaded(true);
          return;
        } catch (e) {
          console.error("[WorldMap] Geo fetch/parse failed:", url, e);
        }
      }
      if (!cancelled) {
        setGeoError("Failed to load country boundary data from all sources.");
        setFeatures([]);
        setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { features, loaded, geoError };
}

type Props = {
  playerDiplomacy?: number;
};

export default function WorldMap({ playerDiplomacy = 50 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"conflicts" | "peace" | "history">("conflicts");
  const [dataSource, setDataSource] = useState<"ai" | "mock" | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [countryFetchError, setCountryFetchError] = useState<string | null>(null);
  const [simContextVersion, setSimContextVersion] = useState(0);
  const [simContextActive, setSimContextActive] = useState(false);

  const { features, loaded, geoError } = useWorldGeo();
  const getInfoFn = useServerFn(getCountryInfo);

  useEffect(() => {
    const bump = () => {
      setSimContextActive(!!readPresidentialGameContext());
      setSimContextVersion((v) => v + 1);
    };
    setSimContextActive(!!readPresidentialGameContext());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIM_STORAGE_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("gp-sim-updated", bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("gp-sim-updated", bump);
    };
  }, []);

  useEffect(() => {
    if (!selectedCountry || simContextVersion === 0) return;
    void handleCountryClick(selectedCountry, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simContextVersion]);

  const projection = geoNaturalEarth1()
    .scale(MAP_WIDTH / (2 * Math.PI) * 0.9)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
  const pathGenerator = geoPath(projection);

  const project = useCallback(
    (coords: [number, number]): [number, number] => {
      const p = projection(coords);
      return p ?? [0, 0];
    },
    [projection]
  );

  const handleCountryClick = useCallback(
    async (countryName: string, opts?: { force?: boolean }) => {
      if (!opts?.force && loading) return;
      setSelectedCountry(countryName);
      setCountryInfo(null);
      setLoading(true);
      setActiveTab("conflicts");
      setDataSource(null);
      setLoadWarning(null);
      setCountryFetchError(null);

      const gameContext = readPresidentialGameContext();

      try {
        const result = await getInfoFn({
          data: {
            countryName,
            ...(gameContext ? { gameContext } : {}),
          },
        });
        const info = result?.info as CountryInfo | undefined;
        const warn = (result as { loadWarning?: string | null })?.loadWarning;
        if (info) {
          setCountryInfo(info);
          setDataSource((result.source as "ai" | "mock") ?? "mock");
          if (warn) {
            setLoadWarning(warn);
            console.warn("[WorldMap] Country briefing warning:", warn);
          }
        } else {
          console.error("[WorldMap] Empty country response from server; using embedded mock.");
          setCountryInfo(getMockCountryInfo(countryName));
          setDataSource("mock");
          setLoadWarning("Server returned no data — showing offline briefing.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[WorldMap] Failed to load country data:", e);
        setCountryFetchError(msg);
        setCountryInfo(getMockCountryInfo(countryName));
        setDataSource("mock");
        setLoadWarning("Failed to load country data — showing offline briefing so the map stays usable.");
      } finally {
        setLoading(false);
      }
    },
    [loading, getInfoFn]
  );

  const closePanel = () => {
    setSelectedCountry(null);
    setCountryInfo(null);
    setDataSource(null);
    setLoadWarning(null);
    setCountryFetchError(null);
  };

  const relationships = countryInfo?.relationships;

  return (
    <div className="relative">
      {(geoError || loadWarning || countryFetchError) && (
        <div className="mb-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground">
          {geoError && (
            <p>
              <span className="font-mono font-semibold text-gold">Map data:</span> {geoError}
            </p>
          )}
          {countryFetchError && (
            <p className="mt-1">
              <span className="font-mono font-semibold text-gold">Country API:</span> {countryFetchError}
            </p>
          )}
          {loadWarning && (
            <p className="mt-1 text-muted-foreground">
              <span className="font-mono font-semibold">Notice:</span> {loadWarning}
            </p>
          )}
        </div>
      )}

      {relationships && (
        <div className="flex flex-wrap gap-3 mb-2 text-xs font-mono">
          <span className="text-muted-foreground">Relationship view (selected focal state) —</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "oklch(0.52 0.16 145)" }} />
            Allied
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "oklch(0.52 0.22 25)" }} />
            Hostile
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "oklch(0.78 0.16 95)" }} />
            Neutral
          </div>
          {simContextActive && (
            <span className="text-muted-foreground">Presidential sim context is applied to AI relationship lists.</span>
          )}
        </div>
      )}

      <div className="w-full aspect-[2/1] bg-sand rounded-lg overflow-hidden border border-border relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {loaded && features.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-mono text-muted-foreground bg-muted/40">
            No boundary polygons available. Country insights still work from the panel when you click hotspots in the list below.
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full"
          style={{ background: "oklch(0.9 0.03 85)" }}
        >
          {features.map((geo, i) => {
            const props = geo.properties;
            const name = props?.name ?? props?.NAME ?? "";
            const isSelected = selectedCountry === name;
            const isHovered = hoveredCountry === name;

            let fill = relationships ? getRelationshipFill(name, relationships) : "oklch(0.82 0.06 90)";
            if (isSelected) fill = "oklch(0.55 0.14 220)";
            else if (isHovered) fill = "oklch(0.6 0.12 200)";

            const d = pathGenerator(geo as Parameters<typeof pathGenerator>[0]);
            if (!d) return null;

            return (
              <path
                key={i}
                d={d}
                fill={fill}
                stroke="oklch(0.7 0.04 80)"
                strokeWidth={0.5}
                className="cursor-pointer transition-colors duration-150"
                onClick={() => { if (name) handleCountryClick(name); }}
                onMouseEnter={() => setHoveredCountry(name)}
                onMouseLeave={() => setHoveredCountry(null)}
              />
            );
          })}

          {hotspots.map((h) => {
            const [x, y] = project(h.coords);
            return (
              <g key={h.name} className="cursor-pointer" onClick={() => handleCountryClick(h.name.replace(" (UN)", ""))}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill={h.status === "conflict" ? "oklch(0.55 0.22 25)" : "oklch(0.55 0.15 130)"}
                  stroke="oklch(0.98 0.005 80)"
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "oklch(0.3 0.03 60)", pointerEvents: "none" }}
                >
                  {h.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedCountry && (
        <div className="absolute top-0 right-0 w-full md:w-[26rem] h-full bg-card border border-border rounded-lg shadow-2xl overflow-y-auto z-10">
          <div className="sticky top-0 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between z-20">
            <div>
              <h3 className="font-display font-bold text-sm tracking-wide">{selectedCountry}</h3>
              {dataSource && (
                <div className="flex items-center gap-1 mt-0.5">
                  {dataSource === "ai" ? (
                    <>
                      <Wifi className="w-3 h-3 opacity-70" />
                      <span className="text-xs opacity-70 font-mono">Live AI Analysis</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 opacity-70" />
                      <span className="text-xs opacity-70 font-mono">Cached Data</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={closePanel} className="hover:opacity-70 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm font-mono text-muted-foreground">Analyzing {selectedCountry}...</span>
              <p className="text-xs text-muted-foreground text-center px-4">
                Loading geopolitical data, leadership intel, and relationships
              </p>
            </div>
          ) : countryInfo ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="font-mono text-xs text-muted-foreground uppercase">Stability Score</div>
                  <div
                    className={`font-display text-3xl font-bold ${
                      countryInfo.stabilityScore >= 60
                        ? "text-primary"
                        : countryInfo.stabilityScore >= 30
                        ? "text-gold"
                        : "text-destructive"
                    }`}
                  >
                    {countryInfo.stabilityScore}/100
                  </div>
                  <div className="w-24 bg-muted rounded-full h-1.5 mt-1 mx-auto">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        countryInfo.stabilityScore >= 60
                          ? "bg-primary"
                          : countryInfo.stabilityScore >= 30
                          ? "bg-gold"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${countryInfo.stabilityScore}%` }}
                    />
                  </div>
                </div>
                {countryInfo.leader && (
                  <div className="text-right">
                    <div className="font-mono text-xs text-muted-foreground uppercase">Leader</div>
                    <div className="font-display text-sm font-bold">{countryInfo.leader.name}</div>
                    <div className="text-xs text-muted-foreground">{countryInfo.leader.title}</div>
                  </div>
                )}
              </div>

              {countryInfo.leader && (
                <div className="bg-muted rounded-md p-3 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Personality & Stance</p>
                      <p className="text-sm font-medium">{countryInfo.leader.personality}</p>
                      <p className="text-xs text-muted-foreground mt-1">{countryInfo.leader.politicalStance}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-foreground leading-relaxed">{countryInfo.summary}</p>

              {(countryInfo.currentSituation || countryInfo.playerRelationship) && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {countryInfo.currentSituation && (
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Current situation</p>
                      <p className="text-sm">{countryInfo.currentSituation}</p>
                    </div>
                  )}
                  {countryInfo.playerRelationship && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Relationship with your administration</p>
                      <p className="text-sm">{countryInfo.playerRelationship}</p>
                    </div>
                  )}
                </div>
              )}

              {countryInfo.relationships && (
                <div className="space-y-1.5">
                  <p className="font-mono text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" /> Key Relationships
                  </p>
                  {countryInfo.relationships.allied.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {countryInfo.relationships.allied.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono hover:bg-primary/25 transition-colors"
                          onClick={() => handleCountryClick(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {countryInfo.relationships.hostile.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {countryInfo.relationships.hostile.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-mono hover:bg-destructive/25 transition-colors"
                          onClick={() => handleCountryClick(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {countryInfo.relationships.neutral.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {countryInfo.relationships.neutral.slice(0, 6).map((c) => (
                        <button
                          key={c}
                          className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold font-mono hover:bg-gold/25 transition-colors"
                          onClick={() => handleCountryClick(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex border-b border-border">
                {(
                  [
                    { key: "conflicts" as const, label: "Conflicts", icon: AlertTriangle },
                    { key: "peace" as const, label: "Peace", icon: Heart },
                    { key: "history" as const, label: "History", icon: Clock },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1 px-3 py-2 text-xs font-mono uppercase transition-colors ${
                      activeTab === tab.key
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "conflicts" && (
                <div className="space-y-2">
                  {countryInfo.conflicts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No major conflicts recorded.</p>
                  ) : (
                    countryInfo.conflicts.map((c, i) => (
                      <div
                        key={i}
                        className={`rounded-md p-3 border ${
                          c.status === "active"
                            ? "border-destructive/40 bg-destructive/5"
                            : c.status === "resolved"
                            ? "border-primary/40 bg-primary/5"
                            : "border-gold/40 bg-gold/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{c.name}</span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                              c.status === "active"
                                ? "bg-destructive/15 text-destructive"
                                : c.status === "resolved"
                                ? "bg-primary/15 text-primary"
                                : "bg-gold/15 text-gold"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        {c.years && <div className="text-xs font-mono text-muted-foreground mb-1">{c.years}</div>}
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
                <div className="space-y-2">
                  {countryInfo.history.map((h, i) => (
                    <div key={i} className="flex gap-3 text-xs border-l-2 border-border pl-3 py-0.5">
                      <span className="font-mono text-muted-foreground w-20 shrink-0 pt-0.5">{h.year}</span>
                      <span className="text-foreground">{h.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
              <AlertTriangle className="w-8 h-8 text-gold" />
              <p className="text-sm text-muted-foreground">Failed to load country data for {selectedCountry}.</p>
              <button
                type="button"
                className="gp-btn-secondary text-xs"
                onClick={() => selectedCountry && handleCountryClick(selectedCountry, { force: true })}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {!selectedCountry && (
        <div className="flex gap-6 mt-3 text-xs font-mono flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-destructive inline-block" /> Active Conflict
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Peace Initiative
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">Click any country for AI analysis</div>
        </div>
      )}
    </div>
  );
}
