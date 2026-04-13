import { Heart, MapPin } from "lucide-react";

import storyWater from "@/assets/story-water-agreement.jpg";
import storyYouth from "@/assets/story-youth-dialogue.jpg";
import storyReforest from "@/assets/story-reforestation.jpg";
import storyPeace from "@/assets/story-peace-accord.jpg";
import storyGreen from "@/assets/story-green-energy.jpg";
import storyMicro from "@/assets/story-microfinance.jpg";

const stories = [
  {
    title: "Cross-Border Water Agreement",
    country: "Kenya & Ethiopia",
    region: "East Africa",
    description: "Communities in Kenya and Ethiopia established a shared water management system, reducing conflicts by 80% in the border region and providing clean water to thousands.",
    impact: "50,000 people",
    category: "SUSTAINABILITY",
    image: storyWater,
  },
  {
    title: "Peace Accord in South Sudan",
    country: "South Sudan",
    region: "East Africa",
    description: "A landmark peace agreement between rival factions ended a 5-year civil conflict, enabling the return of 200,000 displaced civilians and rebuilding of infrastructure.",
    impact: "200,000 displaced returned",
    category: "DIPLOMACY",
    image: storyPeace,
  },
  {
    title: "Youth Dialogue Program",
    country: "Israel & Palestine",
    region: "Middle East",
    description: "A grassroots initiative brought together 200+ young leaders from opposing communities for peace-building workshops, fostering mutual understanding.",
    impact: "12 communities",
    category: "EDUCATION",
    image: storyYouth,
  },
  {
    title: "Green Energy Initiative",
    country: "Denmark",
    region: "Northern Europe",
    description: "Denmark's transition to 100% renewable energy in the power sector created a blueprint for global sustainability and reduced geopolitical energy dependence.",
    impact: "5.8M citizens",
    category: "ENVIRONMENT",
    image: storyGreen,
  },
  {
    title: "Reforestation Peace Corridor",
    country: "Colombia",
    region: "South America",
    description: "Former FARC conflict zones transformed into protected ecological corridors, creating 3,000 sustainable jobs and reducing tensions between communities.",
    impact: "10,000 hectares",
    category: "ENVIRONMENT",
    image: storyReforest,
  },
  {
    title: "Women's Microfinance Network",
    country: "Bangladesh",
    region: "South Asia",
    description: "A grassroots microfinance program empowered 15,000 women entrepreneurs in rural Bangladesh, lifting families out of poverty and strengthening community resilience.",
    impact: "15,000 women",
    category: "EMPOWERMENT",
    image: storyMicro,
  },
];

const categoryColors: Record<string, string> = {
  SUSTAINABILITY: "bg-primary/15 text-primary",
  DIPLOMACY: "bg-gold/15 text-gold",
  EDUCATION: "bg-accent/15 text-accent-foreground",
  ENVIRONMENT: "bg-primary/15 text-primary",
  EMPOWERMENT: "bg-gold/15 text-gold",
};

export default function CommunityStories() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {stories.map((story) => (
        <div key={story.title} className="gp-card group p-0 overflow-hidden">
          <img
            src={story.image}
            alt={story.title}
            className="w-full h-44 object-cover"
            loading="lazy"
            width={800}
            height={512}
          />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${categoryColors[story.category] || "bg-muted text-muted-foreground"}`}>
                {story.category}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <MapPin className="w-3 h-3" /> {story.country}
              </span>
            </div>
            <h4 className="font-display text-base font-bold mb-1">{story.title}</h4>
            <p className="text-xs text-muted-foreground font-mono mb-2">{story.region}</p>
            <p className="text-sm text-foreground leading-relaxed">{story.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <Heart className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-primary">Impact: {story.impact}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
