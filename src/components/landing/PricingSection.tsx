import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PricingSection = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="py-24 bg-broca-cream" id="pricing">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-background/10 border border-background/20 rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-medium text-background">SIMPLE, TRANSPARENT PRICING</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
            Get Early Access
          </h2>
          <p className="text-background/70 text-lg">
            Join the waitlist and be among the first to experience BROCA
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* Starter Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <h3 className="font-display text-2xl font-bold text-background mb-2">Starter</h3>
            <p className="text-background/60 text-sm mb-6">Perfect for solo agents</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-background">$29</span>
              <span className="text-background/60">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                100 AI requests/month
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Document summaries
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Email drafting
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Basic CRM
              </li>
            </ul>
            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Join Waitlist
            </Button>
          </div>

          {/* Pro Plan - Featured */}
          <div className="bg-background rounded-2xl p-8 shadow-xl relative overflow-hidden transform scale-105 border-2 border-primary/50">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-bl-lg">
              MOST POPULAR
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Pro</h3>
            <p className="text-muted-foreground text-sm mb-6">For growing teams</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">$79</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                500 AI requests/month
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Everything in Starter
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Deal analysis
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Advanced CRM
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Priority support
              </li>
            </ul>
            <Button className="w-full btn-glow bg-primary hover:bg-primary/90 text-primary-foreground">
              Join Waitlist
            </Button>
          </div>

          {/* Team Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <h3 className="font-display text-2xl font-bold text-background mb-2">Team</h3>
            <p className="text-background/60 text-sm mb-6">For brokerages</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-background">$199</span>
              <span className="text-background/60">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Unlimited AI requests
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Everything in Pro
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Team collaboration
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Custom integrations
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Dedicated support
              </li>
            </ul>
            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Contact Sales
            </Button>
          </div>
        </div>

        {/* Early Access CTA */}
        <div className="max-w-xl mx-auto text-center animate-fade-up">
          <p className="text-background/70 mb-6">
            Get exclusive early access pricing when we launch
          </p>
          <form className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-14 bg-white border-0 text-background placeholder:text-background/50 rounded-xl px-5"
            />
            <Button 
              type="submit"
              className="btn-glow h-14 px-8 bg-background hover:bg-background/90 text-foreground rounded-xl font-semibold"
            >
              Get Notified
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
