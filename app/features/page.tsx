"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FileText, Mail, TrendingUp, Search, MessageSquare, Brain, Shield, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: FileText,
    title: "AI Contract Summaries",
    description: "Upload any real estate document and get instant, intelligent summaries. BROCA extracts key terms, contingencies, deadlines, and financial details in seconds.",
    details: ["Purchase agreements", "Disclosure documents", "Property reports", "Title documents"],
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Mail,
    title: "Smart Email Drafting",
    description: "Generate professional, personalized emails for any situation. From initial outreach to closing congratulations, BROCA crafts the perfect message.",
    details: ["Follow-up emails", "Offer presentations", "Negotiation responses", "Client updates"],
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
  {
    icon: TrendingUp,
    title: "Deal Analysis & Insights",
    description: "Get instant market analysis and deal insights. BROCA analyzes comparable sales, market trends, and property valuations to support your recommendations.",
    details: ["Comparative market analysis", "Price recommendations", "Investment potential", "Risk assessment"],
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Search,
    title: "CRM for Clients & Leads",
    description: "Keep all your clients, leads, and deals organized in one place. Track interactions, set reminders, and never let an opportunity slip away.",
    details: ["Contact management", "Deal tracking", "Activity history", "Lead scoring"],
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
  {
    icon: MessageSquare,
    title: "Automated Reports",
    description: "Generate comprehensive reports for clients, brokerages, and your own analysis. Beautiful, professional documents created instantly.",
    details: ["Market reports", "Performance analytics", "Client presentations", "Weekly summaries"],
    iconBg: "icon-container-mint",
    iconColor: "text-primary",
  },
  {
    icon: Shield,
    title: "Secure Document Handling",
    description: "Your data is protected with enterprise-grade security. All documents and client information are encrypted and stored safely.",
    details: ["End-to-end encryption", "Secure file storage", "Access controls", "Audit trails"],
    iconBg: "icon-container-gold",
    iconColor: "text-accent",
  },
];

export default function Features() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="hero-gradient pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Powerful Features for{" "}
              <span className="text-primary">Modern Agents</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Everything you need to streamline your real estate business, powered by cutting-edge AI technology.
            </p>
            <Link href="/signup">
              <Button className="btn-glow bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
                Get Early Access
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-broca-cream">
        <div className="container mx-auto px-6">
          <div className="space-y-16">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={`space-y-6 ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                  <div className={feature.iconBg}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="font-display text-3xl font-bold text-background">
                    {feature.title}
                  </h3>
                  <p className="text-background/70 text-lg leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="grid grid-cols-2 gap-3">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-background/80">
                        <Zap className="w-4 h-4 text-primary" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${index % 2 === 1 ? "lg:order-1" : ""}`}>
                  <div className="bg-white rounded-2xl p-8 shadow-xl">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center">
                      <feature.icon className="w-24 h-24 text-primary/30" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="hero-gradient py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-foreground mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of agents who are already working smarter with BROCA.
          </p>
          <Link href="/signup">
            <Button className="btn-glow bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
