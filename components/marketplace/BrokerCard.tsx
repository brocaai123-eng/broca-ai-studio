"use client";

import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AriaScoreGauge from "./AriaScoreGauge";
import Link from "next/link";
import type { BrokerProfileData } from "@/lib/types/marketplace";

interface BrokerCardProps {
  broker: BrokerProfileData;
}

export default function BrokerCard({ broker }: BrokerCardProps) {
  const fullName = broker.profile?.full_name || "Unknown Broker";
  const avatarUrl = broker.profile?.avatar_url;

  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200">
      {/* Profile Photo */}
      <div className="flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
        )}
      </div>

      {/* Center Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground truncate">{fullName}</h3>
          {broker.is_verified && (
            <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">Verified</Badge>
          )}
        </div>
        {broker.brokerage_name && (
          <p className="text-sm text-muted-foreground truncate">{broker.brokerage_name}</p>
        )}
        {broker.zip_codes_served?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3" />
            <span>South Florida</span>
          </div>
        )}

        {broker.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {broker.specialties.slice(0, 4).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                {s}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            {broker.rating?.toFixed(1) || "N/A"}
          </span>
          <span>{broker.total_listings} listings</span>
          <span>{broker.deals_closed} closed</span>
          {broker.avg_days_to_close && <span>~{broker.avg_days_to_close}d avg</span>}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2">
        <AriaScoreGauge score={broker.aria_performance_score} size="md" />
        <Link href={`/marketplace/brokers/${broker.id}`}>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            View Profile
          </Button>
        </Link>
        <Link href={`/marketplace/brokers/${broker.id}#contact`}>
          <Button size="sm" variant="outline">Contact</Button>
        </Link>
      </div>
    </div>
  );
}
