import { CheckCircle, Clock, Shield } from "lucide-react";

const news = [
  {
    headline: "UN Security Council Approves New Peacekeeping Mission",
    source: "Reuters",
    time: "2 hours ago",
    verified: true,
    summary: "The UN Security Council voted unanimously to deploy peacekeepers to the contested region, marking a significant diplomatic achievement.",
  },
  {
    headline: "Climate Summit Reaches Historic Agreement on Carbon Credits",
    source: "AP News",
    time: "5 hours ago",
    verified: true,
    summary: "192 nations agreed to a new framework for carbon credit trading, with binding commitments to reduce emissions by 45% by 2035.",
  },
  {
    headline: "Ceasefire Agreement Signed After 18 Months of Negotiations",
    source: "BBC World",
    time: "8 hours ago",
    verified: true,
    summary: "A landmark ceasefire agreement was signed in Geneva, bringing hope to millions affected by the prolonged conflict.",
  },
  {
    headline: "Global Food Security Index Shows Improvement in 12 Nations",
    source: "Al Jazeera",
    time: "12 hours ago",
    verified: true,
    summary: "The latest Global Food Security Index reports significant improvements in agricultural output and food distribution in developing nations.",
  },
];

export default function NewsShield() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">All stories verified by AI analysis</span>
      </div>
      {news.map((item) => (
        <div key={item.headline} className="gp-card">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display text-sm font-bold mb-1">{item.headline}</h4>
              <p className="text-sm text-foreground mb-2">{item.summary}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span>{item.source}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                <span className="gp-badge-verified gp-badge">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
