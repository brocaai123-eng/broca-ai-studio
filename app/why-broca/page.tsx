"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CheckCircle, XCircle, ArrowRight, Clock, FileX, TrendingDown, Zap, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const painPoints = [
  {
    icon: FileX,
    title: "Manual Paperwork",
    description: "Hours wasted on reading contracts, extracting data, and organizing documents manually.",
  },
  {
    icon: Clock,
    title: "Slow Follow-ups",
    description: "Leads go cold because you're too busy to craft personalized responses quickly.",
  },
  {
    icon: TrendingDown,
    title: "Missed Deal Insights",
    description: "Important details get overlooked, leading to missed opportunities and lost revenue.",
  },
];

const solutions = [
  {
    icon: Zap,
    title: "AI Automation",
    description: "Let BROCA handle the tedious work while you focus on building relationships.",
  },
  {
    icon: Target,
    title: "Faster Closings",
    description: "Close deals 40% faster with instant document analysis and smart insights.",
  },
  {
    icon: Users,
    title: "Centralized Workflow",
    description: "Everything you need in one place: clients, documents, emails, and analytics.",
  },
];

const comparison = [
  { feature: "Contract Analysis Time", broca: "30 seconds", traditional: "30+ minutes" },
  { feature: "Email Drafting", broca: "Instant AI-generated", traditional: "Manual typing" },
  { feature: "Client Follow-ups", broca: "Automated reminders", traditional: "Easy to forget" },
  { feature: "Deal Insights", broca: "Real-time AI analysis", traditional: "Spreadsheets & guesswork" },
  { feature: "Document Organization", broca: "Smart auto-filing", traditional: "Manual folders" },
  { feature: "Market Research", broca: "AI-powered summaries", traditional: "Hours of research" },
];

export default function WhyBroca() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="hero-gradient pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Why Top Agents Choose{" "}
              <span className="text-primary">BROCA</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover how AI is transforming real estate and why you should be part of the revolution.
            </p>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-24 bg-broca-cream">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
              The Old Way Is Broken
            </h2>
            <p className="text-background/70 text-lg max-w-2xl mx-auto">
              Traditional real estate workflows are holding you back from reaching your full potential.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {painPoints.map((point) => (
              <div key={point.title} className="bg-white rounded-2xl p-8 border-2 border-destructive/20">
                <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-6">
                  <point.icon className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-display text-xl font-bold text-background mb-3">
                  {point.title}
                </h3>
                <p className="text-background/70">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div className="flex justify-center mb-20">
            <ArrowRight className="w-12 h-12 text-primary rotate-90" />
          </div>

          {/* Solutions */}
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
              The BROCA Advantage
            </h2>
            <p className="text-background/70 text-lg max-w-2xl mx-auto">
              AI-powered solutions that elevate your entire practice.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {solutions.map((solution) => (
              <div key={solution.title} className="bg-white rounded-2xl p-8 border-2 border-primary/20 shadow-lg">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <solution.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-background mb-3">
                  {solution.title}
                </h3>
                <p className="text-background/70">
                  {solution.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 hero-gradient">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              BROCA vs. Traditional Tools
            </h2>
            <p className="text-muted-foreground text-lg">
              See the difference intelligent automation makes.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="glass-card overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-border/50 bg-secondary/50">
                <div className="font-semibold text-foreground">Feature</div>
                <div className="font-semibold text-primary text-center">BROCA</div>
                <div className="font-semibold text-muted-foreground text-center">Traditional</div>
              </div>

              {/* Rows */}
              {comparison.map((row, index) => (
                <div 
                  key={row.feature} 
                  className={`grid grid-cols-3 gap-4 p-6 ${
                    index !== comparison.length - 1 ? "border-b border-border/30" : ""
                  }`}
                >
                  <div className="text-foreground font-medium">{row.feature}</div>
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{row.broca}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <XCircle className="w-4 h-4 text-muted-foreground/50" />
                    <span className="text-sm">{row.traditional}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-broca-cream">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-background mb-6">
            Ready to Work Smarter?
          </h2>
          <p className="text-background/70 text-lg mb-8 max-w-xl mx-auto">
            Join the future of real estate. Get early access to BROCA today.
          </p>
          <Link href="/signup">
            <Button className="btn-glow bg-background hover:bg-background/90 text-foreground px-8 py-6 text-lg">
              Get Early Access
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
