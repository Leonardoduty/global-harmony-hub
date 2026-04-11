import { Heart, ArrowRight } from "lucide-react";

const stories = [
  {
    title: "Cross-Border Water Agreement",
    region: "East Africa",
    description: "Communities in Kenya and Ethiopia established a shared water management system, reducing conflicts by 80% in the region.",
    impact: "50,000 people",
    category: "SUSTAINABILITY",
  },
  {
    title: "Youth Dialogue Program",
    region: "Middle East",
    description: "A grassroots initiative brought together 200+ young leaders from opposing communities for peace-building workshops.",
    impact: "12 communities",
    category: "DIPLOMACY",
  },
  {
    title: "Reforestation Peace Corridor",
    region: "South America",
    description: "Former conflict zones transformed into protected ecological corridors, creating jobs and reducing tensions.",
    impact: "10,000 hectares",
    category: "ENVIRONMENT",
  },
];

export default function CommunityStories() {
  return (
    <div className="space-y-4">
      {stories.map((story) => (
        <div key={story.title} className="gp-card group cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="gp-badge-verified gp-badge mb-2 inline-block">{story.category}</span>
              <h4 className="font-display text-base font-bold mb-1">{story.title}</h4>
              <p className="text-xs text-muted-foreground font-mono mb-2">{story.region}</p>
              <p className="text-sm text-foreground">{story.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Heart className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-mono text-primary">Impact: {story.impact}</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
