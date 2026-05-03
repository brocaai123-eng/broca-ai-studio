"use client";

import { Bookmark, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AriaScoreGauge from "./AriaScoreGauge";
import FreeTierOverlay from "./FreeTierOverlay";
import Link from "next/link";
import type { MarketplaceListing, RealEstateSpecs } from "@/lib/types/marketplace";

interface ListingCardProps {
  listing: MarketplaceListing;
  isFreeTier?: boolean;
  onSave?: (id: string) => void;
  isSaved?: boolean;
}

export default function ListingCard({ listing, isFreeTier = false, onSave, isSaved = false }: ListingCardProps) {
  const specs = listing.specs as RealEstateSpecs;
  const isHotDeal = (listing.aria_score ?? 0) >= 80;
  const isNewToday = new Date(listing.created_at).toDateString() === new Date().toDateString();
  const isPriceReduced = !!listing.price_reduced_at;

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Image Area */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {listing.photos?.length > 0 ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isFreeTier ? 'blur-md' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <svg className="w-12 h-12 text-muted-foreground/30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 z-20">
          <Badge className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5">
            ARIA VERIFIED
          </Badge>
        </div>
        <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
          {isHotDeal && (
            <Badge className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5">
              HOT DEAL
            </Badge>
          )}
          {isNewToday && (
            <Badge className="bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5">
              NEW TODAY
            </Badge>
          )}
          {isPriceReduced && (
            <Badge className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5">
              PRICE REDUCED
            </Badge>
          )}
        </div>

        {/* ARIA Score */}
        <div className="absolute bottom-2 left-2 z-20">
          <AriaScoreGauge score={listing.aria_score} size="sm" />
        </div>

        {isFreeTier && <FreeTierOverlay />}
      </div>

      {/* Data Area */}
      <div className="p-4 space-y-2">
        <div className="text-sm font-medium text-foreground truncate">
          {isFreeTier ? "******* FL XXXXX" : `${listing.location_city || ''}, ${listing.location_state || ''} ${listing.location_zip || ''}`}
        </div>

        {specs && (
          <div className="text-xs text-muted-foreground">
            {specs.bedrooms && `${specs.bedrooms} bed`}
            {specs.bathrooms && ` / ${specs.bathrooms} bath`}
            {specs.sqft && ` / ${specs.sqft.toLocaleString()} sqft`}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">
            {isFreeTier ? "$███,███" : formatPrice(listing.asking_price)}
          </span>
          {listing.below_market_pct && listing.below_market_pct > 0 && (
            <span className="text-xs font-medium text-emerald-600">
              {listing.below_market_pct.toFixed(1)}% below market
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {listing.estimated_days_to_close && (
            <span>~{listing.estimated_days_to_close} days to close</span>
          )}
          {listing.neighborhood_direction && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {listing.neighborhood_direction}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Link href={`/marketplace/real-estate/${listing.id}`} className="flex-1">
            <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View Deal
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className={isSaved ? "text-primary border-primary" : ""}
            onClick={() => onSave?.(listing.id)}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
