"use client";

import React from "react";
import {
  MapPin,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Clock,
  Home,
  Loader2,
  Mail,
  Phone,
  Linkedin,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AriaScoreGauge from "@/components/marketplace/AriaScoreGauge";
import ListingCard from "@/components/marketplace/ListingCard";
import { useBrokerProfile } from "@/lib/hooks/use-broker-directory";

export default function BrokerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { data, isLoading, error } = useBrokerProfile(id);
  const broker = data?.broker;

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
            <h1 className="text-2xl font-bold text-foreground">Broker Not Found</h1>
            <p className="text-muted-foreground mt-2">
              The broker profile you&apos;re looking for doesn&apos;t exist or has been removed.
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
            <img src={broker.cover_photo_url} alt="Cover" className="w-full h-full object-cover" />
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
                  <span className="text-3xl font-bold text-primary">{initials}</span>
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
                <h1 className="text-3xl font-bold text-foreground">{fullName}</h1>
                {broker.is_verified && (
                  <Badge className="bg-blue-500 text-white text-xs">Verified</Badge>
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
                  <span>{broker.zip_codes_served.join(", ")}</span>
                </div>
              )}

              {broker.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {broker.specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs capitalize">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{broker.total_listings}</span>
              <span className="text-xs text-muted-foreground">Total Listings</span>
            </Card>
            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-foreground">{broker.deals_closed}</span>
              <span className="text-xs text-muted-foreground">Deals Closed</span>
            </Card>
            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-foreground">{broker.avg_days_to_close ?? "—"}</span>
              <span className="text-xs text-muted-foreground">Avg Days to Close</span>
            </Card>
            <Card className="p-5 flex flex-col items-center text-center gap-2">
              <AriaScoreGauge score={broker.aria_performance_score} size="lg" />
              <span className="text-xs text-muted-foreground">ARIA Performance</span>
            </Card>
          </div>

          <Separator />

          {/* Bio / About */}
          {(broker.bio || broker.contact_email || broker.contact_phone || broker.linkedin_url) && (
            <>
              <section className="py-8 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">About</h2>
                </div>

                {broker.bio && (
                  <p className="text-muted-foreground leading-relaxed max-w-3xl">{broker.bio}</p>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  {broker.contact_email && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                      {broker.contact_email}
                    </div>
                  )}
                  {broker.contact_phone && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      {broker.contact_phone}
                    </div>
                  )}
                  {broker.linkedin_url && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Linkedin className="w-4 h-4 text-primary flex-shrink-0" />
                      {broker.linkedin_url}
                    </div>
                  )}
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Active Listings */}
          <section className="py-8 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Active Listings</h2>
            {displayedListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No active listings at this time</p>
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
                    <Link href={`/marketplace?broker=${broker.id}`} className="text-primary hover:text-primary/80 text-sm font-medium">
                      View All Listings →
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
