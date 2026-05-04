"use client";

import { Bookmark, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AriaScoreGauge from "./AriaScoreGauge";
import FreeTierOverlay from "./FreeTierOverlay";
import Link from "next/link";
import type { MarketplaceListing, BoatSpecs } from "@/lib/types/marketplace";

interface BoatCardProps {
  listing: MarketplaceListing;
  isFreeTier?: boolean;
  onSave?: (id: string) => void;
  isSaved?: boolean;
}

export default function BoatCard({ listing, isFreeTier = false, onSave, isSaved = false }: BoatCardProps) {
  const specs = listing.specs as BoatSpecs;
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
              <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z" />
            </svg>
          </div>
        )}

        <div className="absolute top-2 right-2 z-20">
          <Badge className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5">
            ARIA VERIFIED
          </Badge>
        </div>
        <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
          {isHotDeal && (
            <Badge className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5">HOT DEAL</Badge>
          )}
          {isNewToday && (
            <Badge className="bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5">NEW TODAY</Badge>
          )}
          {isPriceReduced && (
            <Badge className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5">PRICE REDUCED</Badge>
          )}
        </div>

        <div className="absolute bottom-2 left-2 z-20">
          <AriaScoreGauge score={listing.aria_score} size="sm" />
        </div>

        {isFreeTier && <FreeTierOverlay />}
      </div>

      {/* Data Area */}
      <div className="p-4 space-y-2">
        <div className="text-sm font-medium text-foreground truncate">
          {isFreeTier
            ? "******* Marina, FL"
            : `${specs?.marina_city || listing.location_city || ''}, ${specs?.marina_state || listing.location_state || ''}`}
        </div>

        <div className="text-xs text-muted-foreground">
          {specs?.length_ft && `${specs.length_ft}ft`}
          {specs?.subtype && ` / ${specs.subtype.charAt(0).toUpperCase() + specs.subtype.slice(1)}`}
          {specs?.cabin_count && ` / ${specs.cabin_count} Cabin`}
          {specs?.horsepower && ` / ${specs.horsepower}hp`}
        </div>

        <div className="text-xs text-muted-foreground">
          {specs?.year_built && `${specs.year_built}`}
          {specs?.engine_hours && ` / ${specs.engine_hours.toLocaleString()} engine hours`}
        </div>

        {Boolean((specs as unknown as Record<string, unknown>)?.ai_summary) && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            {String((specs as unknown as Record<string, unknown>).ai_summary)}
          </p>
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

        <div className="flex gap-2 pt-2">
          <Link href={`/marketplace/vessels/${listing.id}`} className="flex-1">
            <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View Vessel
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
