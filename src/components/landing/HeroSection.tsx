import { useState } from "react";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HeroSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle email submission
    console.log("Email submitted:", email);
  };

  return (
    <section className="hero-gradient min-h-screen pt-20 relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">AI-Powered Real Estate Assistant</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Work Smarter.
                <br />
                <span className="text-primary">Close Faster.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
                BROCA is your intelligent AI assistant that summarizes documents, drafts client emails, analyzes deals, and helps real estate agents close faster—all in one elegant platform.
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-14 bg-white/95 border-0 text-background placeholder:text-background/50 rounded-xl px-5"
              />
              <Button 
                type="submit"
                className="btn-glow h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold"
              >
                Join Early Access
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>

            {/* Trust Indicator */}
            <p className="text-muted-foreground text-sm">
              Join 2,500+ agents already on the waitlist. No credit card required.
            </p>
          </div>

          {/* Right Column - AI Assistant Mock */}
          <div className="relative animate-fade-up stagger-2">
            <div className="glass-card p-6 max-w-md ml-auto animate-float">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">BROCA Assistant</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Always ready to help
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4">
                {/* User Message */}
                <div className="chat-bubble-user ml-auto">
                  <p className="text-foreground text-sm">Summarize the Smith property contract</p>
                </div>

                {/* AI Response */}
                <div className="chat-bubble-ai">
                  <h4 className="font-semibold text-foreground mb-3">Contract Summary</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Purchase Price: <span className="text-foreground">$825,000</span></span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Contingencies: <span className="text-foreground">Financing, Inspection</span></span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Closing Date: <span className="text-foreground">Feb 28, 2025</span></span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Key Terms: <span className="text-foreground">As-is condition, $25k earnest</span></span>
                    </li>
                  </ul>
                </div>

                {/* Follow-up prompt */}
                <div className="chat-bubble-user ml-auto">
                  <p className="text-foreground text-sm">Draft a follow-up email to the buyer</p>
                </div>

                {/* Typing Indicator */}
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>BROCA is typing...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
