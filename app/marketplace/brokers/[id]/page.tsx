"use client";

import React, { useState } from "react";
import {
  MapPin,
  Star,
  Mail,
  Phone,
  Linkedin,
  CheckCircle,
  Send,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
  Home,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AriaScoreGauge from "@/components/marketplace/AriaScoreGauge";
import ListingCard from "@/components/marketplace/ListingCard";
import { useBrokerProfile } from "@/lib/hooks/use-broker-directory";
import { useSendContactMessage } from "@/lib/hooks/use-marketplace";

export default function BrokerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { data, isLoading, error } = useBrokerProfile(id);
  const broker = data?.broker;

  const sendMessage = useSendContactMessage();

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broker) return;

    sendMessage.mutate(
      {
        to_user_id: broker.user_id,
        broker_profile_id: broker.id,
        listing_id: null,
        sender_name: contactForm.name,
        sender_email: contactForm.email,
        message: contactForm.message,
      },
      {
        onSuccess: () => {
          setContactForm({ name: "", email: "", message: "" });
        },
      },
    );
  };

  const fullName = broker?.profile?.full_name || "Unknown Broker";
  const avatarUrl = broker?.profile?.avatar_url;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app">
        <Navbar />
        <main className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !broker) {
    return (
      <div className="min-h-screen bg-app">
        <Navbar />
        <main className="pt-20 dashboard-light">
          <div className="container mx-auto px-6 py-16 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Broker Not Found
            </h1>
            <p className="text-muted-foreground mt-2">
              The broker profile you&apos;re looking for doesn&apos;t exist or
              has been removed.
            </p>
            <Link href="/marketplace">
              <Button className="mt-6">Back to Marketplace</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayedListings = (broker.active_listings ?? []).slice(0, 6);
  const hasMoreListings = (broker.active_listings?.length ?? 0) > 6;

  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <main className="pt-20 dashboard-light">
        {/* Cover Photo */}
        <div className="relative h-48 md:h-64">
          {broker.cover_photo_url ? (
            <img
              src={broker.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/80 via-primary/60 to-primary/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        {/* Profile Header */}
        <div className="container mx-auto px-6">
          <div className="relative -mt-16 mb-6 flex flex-col md:flex-row md:items-end gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-background shadow-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {initials}
                  </span>
                </div>
              )}
              {broker.is_verified && (
                <div className="absolute bottom-1 right-1 bg-background rounded-full p-0.5">
                  <CheckCircle className="w-6 h-6 text-blue-500 fill-blue-500" />
                </div>
              )}
            </div>

            {/* Name & Info */}
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground">
                  {fullName}
                </h1>
                {broker.is_verified && (
                  <Badge className="bg-blue-500 text-white text-xs">
                    Verified
                  </Badge>
                )}
              </div>

              {broker.brokerage_name && (
                <p className="text-lg text-muted-foreground mt-1">
                  {broker.license_number
                    ? `Licensed Broker · ${broker.brokerage_name}`
                    : broker.brokerage_name}
                </p>
              )}

              {broker.zip_codes_served?.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>South Florida</span>
                </div>
              )}

              {broker.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {broker.specialties.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-xs capitalize"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex gap-2 pb-1">
              <a href="#contact">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact
                </Button>
              </a>
            </div>
          </div>

          <Separator />

          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                {broker.total_listings}
              </span>
              <span className="text-xs text-muted-foreground">
                Total Listings
              </span>
            </Card>

            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-foreground">
                {broker.deals_closed}
              </span>
              <span className="text-xs text-muted-foreground">
                Deals Closed
              </span>
            </Card>

            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-foreground">
                {broker.avg_days_to_close ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                Avg Days to Close
              </span>
            </Card>

            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <AriaScoreGauge
                score={broker.aria_performance_score}
                size="lg"
              />
              <span className="text-xs text-muted-foreground">
                ARIA Performance
              </span>
            </Card>
          </div>

          <Separator />

          {/* Performance Section */}
          <section className="py-8 space-y-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                ARIA Performance Analysis
              </h2>
            </div>

            {broker.bio ? (
              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                {broker.bio}
              </p>
            ) : (
              <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
                <p className="text-muted-foreground text-sm">
                  AI-generated performance summary will appear when Claude API
                  is connected
                </p>
              </div>
            )}

            {/* Client Satisfaction */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                Client Satisfaction
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(broker.rating)
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {broker.rating.toFixed(1)} ({broker.review_count}{" "}
                {broker.review_count === 1 ? "review" : "reviews"})
              </span>
            </div>
          </section>

          <Separator />

          {/* Active Listings */}
          <section className="py-8 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">
              Active Listings
            </h2>

            {displayedListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No active listings at this time
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                {hasMoreListings && (
                  <div className="text-center pt-2">
                    <Link
                      href={`/marketplace?broker=${broker.id}`}
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      View All Listings →
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>

          <Separator />

          {/* Contact Section */}
          <section id="contact" className="py-8 scroll-mt-24">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Get in Touch
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="space-y-4">
                {broker.contact_email && (
                  <a
                    href={`mailto:${broker.contact_email}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="w-4 h-4 text-primary" />
                    {broker.contact_email}
                  </a>
                )}
                {broker.contact_phone && (
                  <a
                    href={`tel:${broker.contact_phone}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="w-4 h-4 text-primary" />
                    {broker.contact_phone}
                  </a>
                )}
                {broker.linkedin_url && (
                  <a
                    href={broker.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Linkedin className="w-4 h-4 text-primary" />
                    LinkedIn Profile
                  </a>
                )}

                <Separator className="my-4" />

                <a href="#contact">
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule a Call
                  </Button>
                </a>
              </div>

              {/* Contact Form */}
              <Card className="p-6">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <Input
                    placeholder="Your Name"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Your Email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                  />
                  <Textarea
                    placeholder={`Message to ${fullName}...`}
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={sendMessage.isPending}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {sendMessage.isPending ? "Sending..." : "Send Message"}
                  </Button>
                  {sendMessage.isSuccess && (
                    <p className="text-sm text-emerald-600 text-center">
                      Message sent successfully!
                    </p>
                  )}
                  {sendMessage.isError && (
                    <p className="text-sm text-red-500 text-center">
                      Failed to send message. Please try again.
                    </p>
                  )}
                </form>
              </Card>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
