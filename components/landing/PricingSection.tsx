"use client";

import { useState } from "react";
import { Check, ArrowRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const PricingSection = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="py-24 bg-broca-cream" id="pricing">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-background/10 border border-background/20 rounded-full px-4 py-2 mb-6">
            <Coins className="w-4 h-4 text-background" />
            <span className="text-sm font-medium text-background">TOKEN-BASED PRICING</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
            Simple, Predictable Pricing
          </h2>
          <p className="text-background/70 text-lg">
            Choose the plan that fits your business. Upgrade anytime as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* Starter Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <h3 className="font-display text-2xl font-bold text-background mb-2">Starter</h3>
            <p className="text-background/60 text-sm mb-6">Perfect for solo brokers</p>
            <div className="mb-2">
              <span className="text-4xl font-bold text-background">$29</span>
              <span className="text-background/60">/month</span>
            </div>
            <p className="text-primary font-medium text-sm mb-6">100 AI tokens included</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Up to 10 active clients
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Basic form templates
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Email notifications
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                AI document extraction
              </li>
            </ul>
            <Link href="/signup">
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Professional Plan - Featured */}
          <div className="bg-background rounded-2xl p-8 shadow-xl relative overflow-hidden transform scale-105 border-2 border-primary/50">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-bl-lg">
              MOST POPULAR
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Professional</h3>
            <p className="text-muted-foreground text-sm mb-6">For growing teams</p>
            <div className="mb-2">
              <span className="text-4xl font-bold text-foreground">$79</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-primary font-medium text-sm mb-6">500 AI tokens included</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Unlimited clients
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Custom form builder
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Email + SMS notifications
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Branded onboarding
              </li>
              <li className="flex items-center gap-2 text-foreground/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Priority support
              </li>
            </ul>
            <Link href="/signup">
              <Button className="w-full btn-glow bg-primary hover:bg-primary/90 text-primary-foreground">
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <h3 className="font-display text-2xl font-bold text-background mb-2">Enterprise</h3>
            <p className="text-background/60 text-sm mb-6">For large brokerages</p>
            <div className="mb-2">
              <span className="text-4xl font-bold text-background">$199</span>
              <span className="text-background/60">/month</span>
            </div>
            <p className="text-primary font-medium text-sm mb-6">1500 AI tokens included</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Everything in Professional
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Full API access
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Custom integrations
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                White-label option
              </li>
              <li className="flex items-center gap-2 text-background/80 text-sm">
                <Check className="w-4 h-4 text-primary" />
                Dedicated account manager
              </li>
            </ul>
            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Contact Sales
            </Button>
          </div>
        </div>

        {/* Token Info CTA */}
        <div className="max-w-xl mx-auto text-center animate-fade-up">
          <p className="text-background/70 mb-6">
            Need more tokens? Purchase additional token packages anytime from your dashboard.
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
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
