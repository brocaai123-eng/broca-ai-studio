import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PricingSection from "@/components/landing/PricingSection";
import { Check, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does the free trial work?",
    answer: "Sign up for early access and get 14 days of full access to all Pro features. No credit card required.",
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely! Upgrade or downgrade anytime. Changes take effect on your next billing cycle.",
  },
  {
    question: "What counts as an AI request?",
    answer: "Each document summary, email draft, or deal analysis counts as one AI request. Simple searches and CRM actions don't count.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes! We use enterprise-grade encryption and follow industry best practices to protect your data and your clients' information.",
  },
  {
    question: "Do you offer discounts for teams?",
    answer: "Yes! Contact us for custom team pricing. We offer volume discounts for brokerages with 10+ agents.",
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="hero-gradient pt-32 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Simple, Transparent{" "}
              <span className="text-primary">Pricing</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your business. No hidden fees, cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <PricingSection />

      {/* FAQs */}
      <section className="py-24 hero-gradient">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="glass-card p-6">
                <div className="flex items-start gap-4">
                  <HelpCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
