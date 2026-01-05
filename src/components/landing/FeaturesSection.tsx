import { FileText, Mail, TrendingUp, Search, MessageSquare, Brain } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Document Summary",
    description: "Instantly summarize contracts, disclosures, and property reports into clear, actionable insights.",
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Mail,
    title: "Client Emails",
    description: "Generate professional, personalized emails to buyers, sellers, and partners in seconds.",
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
  {
    icon: TrendingUp,
    title: "Deal Analysis",
    description: "Analyze property valuations, comps, and market trends to make confident recommendations.",
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Search,
    title: "Smart Search",
    description: "Find properties, past deals, and client history with natural language queries.",
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
  {
    icon: MessageSquare,
    title: "Client Follow-ups",
    description: "Never miss a beat with intelligent reminders and automated follow-up suggestions.",
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Brain,
    title: "Learning Assistant",
    description: "Ask BROCA anything about market trends, regulations, or best practices—it knows.",
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-broca-cream" id="features">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
            What BROCA Does
          </h2>
          <p className="text-background/70 text-lg">
            Six powerful AI features designed to transform how real estate professionals work
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`feature-card opacity-0 animate-fade-up stagger-${index + 1}`}
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <div className={feature.iconBg}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className="font-display text-xl font-bold text-background mb-3">
                {feature.title}
              </h3>
              <p className="text-background/70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
