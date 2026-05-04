'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Plane,
  PersonStanding,
  BedDouble,
  Bath,
  Ruler,
  LandPlot,
  Calendar,
  Wrench,
  MapPin,
  Share2,
  Bookmark,
  Phone,
  Star,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Brain,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import AriaScoreGauge from '@/components/marketplace/AriaScoreGauge';
import { useListing, useTrackView, useSaveListing, useUnsaveListing } from '@/lib/hooks/use-marketplace';
import { useAuth } from '@/lib/supabase/auth-context';
import { useSubscription } from '@/lib/hooks/use-database';
import type { RealEstateSpecs } from '@/lib/types/marketplace';

type ViewMode = 'photos' | 'aerial' | 'street';

function formatPrice(price: number | null) {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function ProgressBar({ value, label, color = 'bg-primary' }: { value: number; label: string; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function NeighborhoodBadge({ direction }: { direction: string | null }) {
  if (!direction) return null;
  const config = {
    ascending: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Ascending' },
    declining: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', label: 'Declining' },
    stable: { icon: Minus, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', label: 'Stable' },
  }[direction] ?? { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted', label: direction };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function RealEstateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useListing(id);
  const trackView = useTrackView();
  const saveListing = useSaveListing();
  const unsaveListing = useUnsaveListing();
  const { user, session } = useAuth();
  const { data: subscription } = useSubscription();

  const [viewMode, setViewMode] = useState<ViewMode>('photos');
  const [currentPhoto, setCurrentPhoto] = useState(0);
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

  // Contact broker dialog state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactMsg, setContactMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isFreeTier = !subscription || subscription.plan?.name === 'Free';

  useEffect(() => {
    if (id) trackView.mutate(id);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Listing not found or failed to load.</p>
        <Link href="/marketplace">
          <Button variant="outline">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const listing = data.listing;
  const specs = (listing.specs ?? {}) as RealEstateSpecs;
  const broker = listing.broker ?? listing.broker_profile ?? null;
  const photos: string[] = listing.photos ?? [];
  const isSaved = listing.is_saved ?? false;
  const todayViews = Number((data as Record<string, unknown>).todayViews ?? listing.today_views ?? 0);

  const handleSave = () => {
    if (!user) return;
    const token = session?.access_token;
    if (isSaved) {
      unsaveListing.mutate({ id: listing.id, token });
    } else {
      saveListing.mutate({ id: listing.id, token });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: listing.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const openContact = () => {
    setContactForm({ subject: `Inquiry about ${listing.title}`, message: '' });
    setContactMsg(null);
    setContactOpen(true);
  };

  const handleContact = async () => {
    if (!contactForm.message.trim()) return;
    setContactSending(true);
    setContactMsg(null);
    try {
      const brokerId = broker?.id;
      if (!brokerId) throw new Error('Broker information not available');
      const res = await fetch(`/api/marketplace/brokers/${brokerId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Investor',
          senderEmail: user?.email || '',
          subject: contactForm.subject.trim() || `Inquiry about ${listing.title}`,
          message: contactForm.message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setContactMsg({ ok: true, text: 'Message sent! The broker will reply to your email.' });
      setContactForm(f => ({ ...f, message: '' }));
    } catch (e) {
      setContactMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to send' });
    } finally {
      setContactSending(false);
    }
  };

  const prevPhoto = () => setCurrentPhoto((p) => (p === 0 ? photos.length - 1 : p - 1));
  const nextPhoto = () => setCurrentPhoto((p) => (p === photos.length - 1 ? 0 : p + 1));

  return (
    <div className="min-h-screen bg-app dashboard-light">
      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>
      </div>

      {/* ──────────── Photo Section (full width) ──────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-[21/9] sm:aspect-[21/8]">
          {viewMode === 'photos' ? (
            photos.length > 0 ? (
              <>
                <img
                  src={photos[currentPhoto]}
                  alt={`${listing.title} photo ${currentPhoto + 1}`}
                  className="w-full h-full object-cover"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPhoto(i)}
                          className={`w-2 h-2 rounded-full transition ${i === currentPhoto ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )
          ) : viewMode === 'aerial' ? (
            <iframe
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={
                enrichData?.latitude && enrichData?.longitude
                  ? `https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&center=${enrichData.latitude},${enrichData.longitude}&zoom=18&maptype=satellite`
                  : `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent([listing.location_city, listing.location_state, listing.location_zip].filter(Boolean).join(', '))}&maptype=satellite`
              }
            />
          ) : (
            <iframe
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={
                enrichData?.latitude && enrichData?.longitude
                  ? `https://www.google.com/maps/embed/v1/streetview?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&location=${enrichData.latitude},${enrichData.longitude}&heading=210&pitch=10&fov=90`
                  : `https://www.google.com/maps/embed/v1/streetview?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&location=${encodeURIComponent([listing.location_city, listing.location_state, listing.location_zip].filter(Boolean).join(', '))}&heading=210&pitch=10&fov=90`
              }
            />
          )}
        </div>

        {/* View mode toggles */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant={viewMode === 'photos' ? 'default' : 'outline'}
            onClick={() => setViewMode('photos')}
          >
            <Camera className="w-4 h-4 mr-1.5" />
            Photos
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'aerial' ? 'default' : 'outline'}
            onClick={() => setViewMode('aerial')}
          >
            <Plane className="w-4 h-4 mr-1.5" />
            Aerial View
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'street' ? 'default' : 'outline'}
            onClick={() => setViewMode('street')}
          >
            <PersonStanding className="w-4 h-4 mr-1.5" />
            Street View
          </Button>
        </div>
      </section>

      {/* ──────────── Two-column layout ──────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ════════ Left Column (65%) ════════ */}
          <div className="lg:w-[65%] space-y-8">
            {/* Section A — Property Overview */}
            <section className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{listing.title}</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {listing.location_city}, {listing.location_state} {listing.location_zip}
                </p>
                {specs?.subtype && (
                  <Badge variant="outline" className="mt-2 capitalize">{specs.subtype}</Badge>
                )}
              </div>

              {listing.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
              )}

              {/* Specs table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-muted/40 rounded-lg p-4">
                {specs?.bedrooms != null && (
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold text-sm text-foreground">{specs.bedrooms}</p>
                    </div>
                  </div>
                )}
                {specs?.bathrooms != null && (
                  <div className="flex items-center gap-2">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold text-sm text-foreground">{specs.bathrooms}</p>
                    </div>
                  </div>
                )}
                {specs?.sqft != null && (
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Sq Ft</p>
                      <p className="font-semibold text-sm text-foreground">{specs.sqft.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {specs?.lot_size && (
                  <div className="flex items-center gap-2">
                    <LandPlot className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lot Size</p>
                      <p className="font-semibold text-sm text-foreground">{specs.lot_size}</p>
                    </div>
                  </div>
                )}
                {specs?.year_built != null && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Year Built</p>
                      <p className="font-semibold text-sm text-foreground">{specs.year_built}</p>
                    </div>
                  </div>
                )}
                {specs?.condition && (
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Condition</p>
                      <p className="font-semibold text-sm text-foreground capitalize">{specs.condition}</p>
                    </div>
                  </div>
                )}
                {specs?.zoning && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Zoning</p>
                      <p className="font-semibold text-sm text-foreground">{specs.zoning}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Section B — ARIA Intelligence */}
            <section className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                ARIA Intelligence
                {enrichLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-4">
                  <AriaScoreGauge score={enrichData?.aria_score ?? listing.aria_score} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">ARIA Deal Score</p>
                    <p className="text-xs text-muted-foreground">AI-powered opportunity rating</p>
                  </div>
                </div>

                <div className="space-y-4 bg-muted/40 rounded-lg p-4">
                  <ProgressBar
                    value={enrichData?.motivated_seller_score ?? listing.motivated_seller_score ?? 0}
                    label="Motivated Seller Probability"
                    color="bg-amber-500"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Neighborhood Trajectory</span>
                    <NeighborhoodBadge direction={enrichData?.neighborhood_direction ?? listing.neighborhood_direction} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Crime Score (ZIP)</span>
                    <span className="font-semibold text-foreground">{enrichData?.crime_score ?? listing.crime_score ?? '—'}<span className="text-xs text-muted-foreground">/100</span></span>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Section C — Market Context */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Market Context</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Est. Days to Close</p>
                  <p className="text-2xl font-bold text-foreground">{enrichData?.estimated_days_to_close ?? listing.estimated_days_to_close ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">View Count</p>
                  <p className="text-2xl font-bold text-foreground">{listing.view_count}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className="capitalize">{listing.status}</Badge>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">Price Summary</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Asking Price</p>
                    <p className="font-semibold text-foreground">{formatPrice(listing.asking_price)}</p>
                  </div>
                  {listing.estimated_value && (
                    <div>
                      <p className="text-muted-foreground">ARIA Est. Value</p>
                      <p className="font-semibold text-foreground">{formatPrice(listing.estimated_value)}</p>
                    </div>
                  )}
                  {specs?.sqft && listing.asking_price && (
                    <div>
                      <p className="text-muted-foreground">Price per Sq Ft</p>
                      <p className="font-semibold text-foreground">${Math.round(Number(listing.asking_price) / Number(specs.sqft)).toLocaleString()}</p>
                    </div>
                  )}
                  {listing.below_market_pct != null && listing.below_market_pct > 0 && (
                    <div>
                      <p className="text-muted-foreground">Below Market</p>
                      <p className="font-semibold text-emerald-600">{listing.below_market_pct.toFixed(1)}%</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">Listing Timeline</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Listed</p>
                    <p className="font-semibold text-foreground">{new Date(listing.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Days on Market</p>
                    <p className="font-semibold text-foreground">{Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000)}</p>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Section D — Map */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Location</h2>
              <div className="rounded-lg overflow-hidden border border-border h-64">
                <iframe
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent([listing.location_city, listing.location_state, listing.location_zip].filter(Boolean).join(', '))}`}
                />
              </div>
            </section>

            <Separator />

            {/* Section E — AI Summary */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                ARIA Deal Analysis
                {enrichLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </h2>
              {enrichData?.ai_analysis ? (
                <div className="rounded-lg border border-border bg-card p-6 text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {enrichData.ai_analysis}
                </div>
              ) : enrichLoading ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating AI analysis...
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                  AI analysis unavailable
                </div>
              )}
            </section>
          </div>

          {/* ════════ Right Column (35%, sticky) ════════ */}
          <aside className="lg:w-[35%]">
            <div className="lg:sticky lg:top-6 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                {/* ARIA score */}
                <div className="flex justify-center">
                  <AriaScoreGauge score={enrichData?.aria_score ?? listing.aria_score} size="lg" showLabel />
                </div>

                {/* Pricing */}
                <div className="text-center space-y-1">
                  <p className="text-3xl font-bold text-foreground">{formatPrice(listing.asking_price)}</p>
                  {listing.estimated_value && (
                    <p className="text-sm text-muted-foreground">
                      ARIA Est. Value: {formatPrice(listing.estimated_value)}
                    </p>
                  )}
                  {listing.below_market_pct != null && listing.below_market_pct > 0 && (
                    <p className="text-sm font-bold text-emerald-600">
                      {listing.below_market_pct.toFixed(1)}% below market
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <Button className="w-full" size="lg" onClick={openContact} disabled={!broker}>
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Broker
                  </Button>
                  <Button
                    variant="outline"
                    className={`w-full border-border text-foreground hover:bg-muted ${isSaved ? 'border-primary text-primary' : ''}`}
                    size="lg"
                    onClick={handleSave}
                  >
                    <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save Deal'}
                  </Button>
                  <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted" size="lg" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Broker mini-profile */}
              {broker && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    {broker.profile?.avatar_url ? (
                      <img
                        src={broker.profile.avatar_url}
                        alt={broker.profile.full_name ?? 'Broker'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {(broker.profile?.full_name ?? 'B').charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {broker.full_name ?? broker.profile?.full_name ?? 'Broker'}
                      </p>
                      {broker.brokerage_name && (
                        <p className="text-xs text-muted-foreground truncate">{broker.brokerage_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {broker.is_verified && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                    {broker.rating > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {broker.rating.toFixed(1)} ({broker.review_count})
                      </span>
                    )}
                    {broker.aria_performance_score != null && (
                      <Badge variant="outline" className="text-[10px]">
                        ARIA {broker.aria_performance_score}
                      </Badge>
                    )}
                  </div>

                  <Link href={`/marketplace/brokers/${broker.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      View Full Profile
                    </Button>
                  </Link>
                </div>
              )}

              {/* Social proof */}
              {todayViews > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span className="font-semibold text-foreground">{todayViews}</span>
                    {todayViews === 1 ? ' investor viewed' : ' investors viewed'} this today
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Contact Broker Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Broker</DialogTitle>
            <DialogDescription>
              Send a message to {broker?.full_name ?? broker?.profile?.full_name ?? 'the broker'} about this listing. They will reply to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input
                value={contactForm.subject}
                onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Subject"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={contactForm.message}
                onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Write your message here..."
                rows={5}
              />
            </div>
            {contactMsg && (
              <p className={`text-sm ${contactMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {contactMsg.text}
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleContact}
              disabled={contactSending || !contactForm.message.trim()}
            >
              {contactSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {contactSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
