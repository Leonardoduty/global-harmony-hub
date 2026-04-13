import { useState } from "react";
import { Loader2, Clock, Swords, Heart, Globe2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCountryTimeline } from "@/functions/country.functions";

type TimelineEvent = {
  year: string;
  title: string;
  description: string;
  type: "war" | "peace" | "political" | "economic";
};

const COUNTRIES = [
  "United States", "United Kingdom", "France", "Germany", "Russia",
  "China", "India", "Japan", "Brazil", "South Africa", "Israel", "South Korea",
];

const typeConfig: Record<string, { icon: typeof Swords; color: string; bg: string }> = {
  war: { icon: Swords, color: "text-destructive", bg: "bg-destructive" },
  peace: { icon: Heart, color: "text-primary", bg: "bg-primary" },
  political: { icon: Globe2, color: "text-gold", bg: "bg-gold" },
  economic: { icon: Globe2, color: "text-accent-foreground", bg: "bg-accent" },
};

export default function HarmonyTimeline() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const getTimelineFn = useServerFn(getCountryTimeline);

  const loadTimeline = async (country: string) => {
    setSelectedCountry(country);
    setLoading(true);
    setEvents([]);
    try {
      const result = await getTimelineFn({ data: { countryName: country } });
      if (result.timeline) setEvents(result.timeline);
    } catch {
      console.error("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Clock className="w-8 h-8 mx-auto text-primary" />
        <h2 className="font-display text-xl font-bold">Harmony Timeline</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Explore major wars and peace treaties from 1800 to the present.
        </p>
      </div>

      {/* Country Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {COUNTRIES.map((c) => (
          <button
            key={c}
            onClick={() => loadTimeline(c)}
            className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
              selectedCountry === c
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-mono text-muted-foreground">Loading timeline for {selectedCountry}...</span>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="relative pl-6 md:pl-10">
          {/* Vertical line */}
          <div className="absolute left-2 md:left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {events.map((ev, i) => {
              const cfg = typeConfig[ev.type] || typeConfig.political;
              const Icon = cfg.icon;
              return (
                <div key={i} className="relative">
                  {/* Dot on timeline */}
                  <div className={`absolute -left-6 md:-left-10 top-1 w-4 h-4 rounded-full ${cfg.bg} border-2 border-card flex items-center justify-center`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-card" />
                  </div>
                  <div className="gp-card py-3 px-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{ev.year}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-mono ${cfg.color} uppercase`}>
                        <Icon className="w-3 h-3" /> {ev.type}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm">{ev.title}</h4>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">{ev.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && selectedCountry && events.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">No timeline data available.</p>
      )}
    </div>
  );
}
