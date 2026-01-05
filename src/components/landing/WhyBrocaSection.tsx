import { CheckCircle, Zap } from "lucide-react";

const benefits = [
  "Save 10+ hours per week on administrative tasks",
  "Close deals 40% faster with instant insights",
  "Never miss a follow-up or deadline again",
  "Access your entire business knowledge instantly",
  "Scale your business without scaling your stress",
];

const WhyBrocaSection = () => {
  return (
    <section className="py-24 hero-gradient relative overflow-hidden" id="why-broca">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Feature Card */}
          <div className="relative animate-fade-up">
            <div className="glass-card p-10 relative overflow-hidden">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-2 mb-6">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Built for High Performers</span>
              </div>

              <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6 leading-tight">
                The AI assistant that{" "}
                <span className="text-primary">top agents</span> wish they had years ago
              </h3>

              <p className="text-muted-foreground leading-relaxed mb-8">
                BROCA doesn't just save time—it elevates your entire practice. From first contact to final closing, you'll have an intelligent partner handling the tedious work while you focus on relationships and revenue.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="stats-card">
                  <p className="text-3xl font-bold text-primary mb-1">10+</p>
                  <p className="text-sm text-muted-foreground">Hours saved weekly</p>
                </div>
                <div className="stats-card">
                  <p className="text-3xl font-bold text-primary mb-1">40%</p>
                  <p className="text-sm text-muted-foreground">Faster closings</p>
                </div>
              </div>

              {/* Decorative gradient line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            </div>
          </div>

          {/* Right Column - Benefits */}
          <div className="space-y-8 animate-fade-up stagger-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-2">
              <span className="text-sm font-medium text-foreground">WHY AGENTS CHOOSE BROCA</span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Why Agents Love BROCA
            </h2>

            <p className="text-muted-foreground text-lg max-w-lg">
              Join thousands of real estate professionals who've transformed their workflow with intelligent automation.
            </p>

            {/* Benefits List */}
            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 animate-fade-up"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground text-lg">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyBrocaSection;
