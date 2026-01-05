import { FileText, Mail, Users, ClipboardList, Bell, Brain, Coins, Shield } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Onboarding",
    description: "Send branded onboarding links via email & SMS. Clients fill forms and upload documents seamlessly.",
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: FileText,
    title: "AI Document Extraction",
    description: "Automatically extract data from IDs, contracts, and financial documents using advanced AI.",
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
  {
    icon: ClipboardList,
    title: "Custom Forms",
    description: "Use predefined templates or build custom intake forms for real estate, insurance, or mortgage clients.",
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Bell,
    title: "Email & SMS Notifications",
    description: "Automated reminders keep clients engaged and ensure onboardings are completed on time.",
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
  {
    icon: Coins,
    title: "Token-Based AI",
    description: "Predictable pricing with token packages. Use AI features based on your subscription plan.",
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Bank-level encryption, secure document storage, and compliance-ready for your industry.",
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
            Six powerful AI features designed to transform how brokers onboard and manage clients
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
