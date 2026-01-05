import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import WhyBrocaSection from "@/components/landing/WhyBrocaSection";
import PricingSection from "@/components/landing/PricingSection";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhyBrocaSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
