"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Plane,
  MapPin,
  Anchor,
  Heart,
  Share2,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Ship,
  Waves,
  Fuel,
  Gauge,
  Clock,
  Users,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AriaScoreGauge from "@/components/marketplace/AriaScoreGauge";
import { useListing, useTrackView } from "@/lib/hooks/use-marketplace";
import { useAuth } from "@/lib/supabase/auth-context";
import type { BoatSpecs, MarketplaceListing } from "@/lib/types/marketplace";

function formatPrice(price: number | null): string {
  if (!price) return "Contact for Price";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function PhotoCarousel({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0);
  const [viewMode, setViewMode] = useState<"photos" | "aerial">("photos");

  const images = photos.length > 0 ? photos : ["/placeholder-boat.jpg"];

  return (
    <div className="relative w-full aspect-[21/9] bg-muted rounded-xl overflow-hidden group">
      <img
        src={images[current]}
        alt={`Vessel photo ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {/* View Toggle */}
      <div className="absolute top-4 left-4 flex gap-1 bg-black/60 backdrop-blur-sm rounded-lg p-1">
        <button
          onClick={() => setViewMode("photos")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === "photos"
              ? "bg-white text-black"
              : "text-white/80 hover:text-white"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Photos
        </button>
        <button
          onClick={() => setViewMode("aerial")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === "aerial"
              ? "bg-white text-black"
              : "text-white/80 hover:text-white"
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          Aerial View
        </button>
      </div>

      {/* Photo Count */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Nav Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrent((p) => (p === 0 ? images.length - 1 : p - 1))
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() =>
              setCurrent((p) => (p === images.length - 1 ? 0 : p + 1))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecRow({ label, value, icon: Icon }: { label: string; value: string | number | undefined | null; icon?: React.ComponentType<{ className?: string }> }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function VesselDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data, isLoading, error } = useListing(id);
  const trackView = useTrackView();

  const [enrichData, setEnrichData] = useState<{
    aria_score: number | null;
    crime_score: number | null;
    ai_analysis: string | null;
    latitude: number | null;
    longitude: number | null;
    neighborhood_direction: string | null;
    motivated_seller_score: number;
    estimated_days_to_close: number;
  } | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);

  useEffect(() => {
    if (id) {
      trackView.mutate(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setEnrichLoading(true);
    fetch(`/api/marketplace/${id}/enrich`)
      .then(r => r.json())
      .then(d => setEnrichData(d))
      .catch(() => {})
      .finally(() => setEnrichLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data?.listing) {
    return (
      <div className="min-h-screen bg-app">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 dashboard-light">
          <Anchor className="w-12 h-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Vessel not found</h2>
          <p className="text-muted-foreground">
            This listing may have been removed or is no longer available.
          </p>
          <Link href="/marketplace">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const listing: MarketplaceListing = data.listing;
  const specs = listing.specs as BoatSpecs;
  const marinaLocation = [specs.marina_city, specs.marina_state]
    .filter(Boolean)
    .join(", ") ||
    [listing.location_city, listing.location_state].filter(Boolean).join(", ") ||
    "Location not specified";

  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <main className="pt-20 dashboard-light">
        <div className="container mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link
              href="/marketplace"
              className="hover:text-foreground transition-colors"
            >
              Marketplace
            </Link>
            <span>/</span>
            <Link
              href="/marketplace?tab=boat"
              className="hover:text-foreground transition-colors"
            >
              Vessels
            </Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">
              {listing.title}
            </span>
          </div>

          {/* Photo Section */}
          <PhotoCarousel photos={listing.photos} />

          {/* Two-Column Layout */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Section A — Vessel Overview */}
              <section>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {specs.vessel_name || listing.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{marinaLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {specs.subtype && (
                        <Badge variant="secondary" className="capitalize">
                          {specs.subtype.replace("_", " ")}
                        </Badge>
                      )}
                      {specs.condition && (
                        <Badge variant="outline" className="capitalize">
                          {specs.condition.replace("_", " ")}
                        </Badge>
                      )}
                      {listing.status === "live" && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-foreground">
                      {formatPrice(listing.asking_price)}
                    </p>
                    {listing.below_market_pct && listing.below_market_pct > 0 && (
                      <p className="text-sm text-emerald-600 font-medium mt-0.5">
                        {listing.below_market_pct}% below market
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-5" />

                {/* Specs Table */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-primary" />
                    Vessel Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <SpecRow label="Length" value={specs.length_ft ? `${specs.length_ft} ft` : undefined} icon={Anchor} />
                    <SpecRow label="Beam" value={specs.beam} icon={Waves} />
                    <SpecRow label="Draft" value={specs.draft} />
                    <SpecRow label="Cabins" value={specs.cabin_count} icon={Users} />
                    <SpecRow label="Engine Type" value={specs.engine_type} icon={Gauge} />
                    <SpecRow label="Engine Hours" value={specs.engine_hours?.toLocaleString()} icon={Clock} />
                    <SpecRow label="Horsepower" value={specs.horsepower ? `${specs.horsepower} HP` : undefined} />
                    <SpecRow label="Hull Material" value={specs.hull_material?.replace("_", " ")} icon={Ship} />
                    <SpecRow label="Fuel Type" value={specs.fuel_type} icon={Fuel} />
                    <SpecRow label="Year Built" value={specs.year_built} />
                    <SpecRow label="Condition" value={specs.condition?.replace("_", " ")} />
                  </div>
                </div>
              </section>

              {/* Section B — ARIA Marine Intelligence */}
              <section className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  ARIA Marine Intelligence
                </h3>
                <div className="flex items-center gap-6">
                  <AriaScoreGauge
                    score={enrichData?.aria_score ?? listing.aria_score}
                    size="lg"
                    showLabel
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Below Market Value
                      </p>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(listing.below_market_pct ?? 0, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {listing.below_market_pct ?? 0}% below comparable
                        vessels
                      </p>
                    </div>
                    {listing.estimated_value && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                        <span className="text-muted-foreground">
                          Estimated value:{" "}
                        </span>
                        <span className="font-semibold">
                          {formatPrice(listing.estimated_value)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Section C — Vessel Market Context */}
              <section className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Market Context
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Asking Price</p>
                    <p className="text-lg font-bold text-foreground">{formatPrice(listing.asking_price)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Views</p>
                    <p className="text-lg font-bold text-foreground">{listing.view_count || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Days Listed</p>
                    <p className="text-lg font-bold text-foreground">{Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                    Peak season: Apr–Sep
                  </Badge>
                </div>
              </section>

              {/* Section D — Map */}
              <section className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Marina Location
                </h3>
                <div className="h-64 rounded-lg overflow-hidden border border-border">
                  <iframe
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(marinaLocation)}`}
                  />
                </div>
              </section>

              {/* Section E — AI Summary */}
              <section className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  ARIA Marine Analysis
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {enrichData?.ai_analysis ? (
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {enrichData.ai_analysis}
                    </p>
                  ) : enrichLoading ? (
                    <div className="flex items-center justify-center h-32 bg-muted/50 rounded-lg border border-dashed border-border">
                      <div className="text-center">
                        <Loader2 className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Generating AI marine analysis...
                        </p>
                      </div>
                    </div>
                  ) : listing.description ? (
                    <p className="text-muted-foreground leading-relaxed">
                      {listing.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      AI analysis unavailable
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column (Sticky Sidebar) */}
            <div className="lg:self-start lg:sticky lg:top-24 space-y-6">
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                {/* ARIA Score */}
                <div className="flex flex-col items-center">
                  <AriaScoreGauge
                    score={enrichData?.aria_score ?? listing.aria_score}
                    size="lg"
                    showLabel
                  />
                </div>

                <Separator />

                {/* Price */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Asking Price</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {formatPrice(listing.asking_price)}
                  </p>
                  {listing.below_market_pct && listing.below_market_pct > 0 && (
                    <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {listing.below_market_pct}% below market
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2.5">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Seller
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Heart className="w-4 h-4 mr-2" />
                    Save Vessel
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                <Separator />

                {/* Social Proof */}
                <p className="text-xs text-muted-foreground text-center">
                  {listing.view_count > 0
                    ? `${listing.view_count} people viewed this vessel`
                    : "Be the first to view this vessel"}
                  {listing.today_views && listing.today_views > 0
                    ? ` · ${listing.today_views} today`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
