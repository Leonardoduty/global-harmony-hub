import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const hotspots = [
  { name: "Ukraine", coords: [30.5, 50.4] as [number, number], status: "conflict" },
  { name: "Sudan", coords: [32.5, 15.6] as [number, number], status: "conflict" },
  { name: "Myanmar", coords: [96.0, 21.9] as [number, number], status: "conflict" },
  { name: "Geneva", coords: [6.1, 46.2] as [number, number], status: "peace" },
  { name: "New York (UN)", coords: [-74.0, 40.7] as [number, number], status: "peace" },
];

export default function WorldMap() {
  return (
    <div className="w-full aspect-[2/1] bg-sand rounded-lg overflow-hidden border border-border">
      <ComposableMap
        projectionConfig={{ scale: 140 }}
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rpiKey || geo.properties?.name}
                geography={geo}
                fill="oklch(0.82 0.06 90)"
                stroke="oklch(0.7 0.04 80)"
                strokeWidth={0.5}
                style={{
                  hover: { fill: "oklch(0.7 0.1 130)" },
                }}
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
            />
            <text
              textAnchor="middle"
              y={-10}
              style={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "oklch(0.3 0.03 60)" }}
            >
              {h.name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
