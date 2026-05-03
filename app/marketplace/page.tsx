"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketplaceTabs from "@/components/marketplace/MarketplaceTabs";
import FilterBar from "@/components/marketplace/FilterBar";
import ListingCard from "@/components/marketplace/ListingCard";
import BoatCard from "@/components/marketplace/BoatCard";
import BrokerCard from "@/components/marketplace/BrokerCard";
import { useListings, useSaveListing, useUnsaveListing } from "@/lib/hooks/use-marketplace";
import { useBrokers } from "@/lib/hooks/use-broker-directory";
import { useAuth } from "@/lib/supabase/auth-context";
import { useSubscription } from "@/lib/hooks/use-database";
import Link from "next/link";
import type { AssetType, ListingFilters, BrokerFilters } from "@/lib/types/marketplace";

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<AssetType>('real_estate');
  const [listingFilters, setListingFilters] = useState<ListingFilters>({});
  const [brokerFilters] = useState<BrokerFilters>({});
  const { user } = useAuth();
  const { data: subscription } = useSubscription();

  const isFreeTier = !subscription || subscription.plan?.name === 'Free';

  const { data: listingsData, isLoading: listingsLoading } = useListings({
    ...listingFilters,
    asset_type: activeTab === 'broker_profile' ? undefined : activeTab,
  });

  const { data: brokersData, isLoading: brokersLoading } = useBrokers(brokerFilters);

  const listings = listingsData?.listings ?? [];
  const brokers = brokersData?.brokers ?? [];

  const saveListing = useSaveListing();
  const unsaveListing = useUnsaveListing();

  const handleSave = (listingId: string) => {
    if (!user) return;
    const listing = listings.find((l) => l.id === listingId);
    if (listing?.is_saved) {
      unsaveListing.mutate(listingId);
    } else {
      saveListing.mutate(listingId);
    }
  };

  const handleTabChange = (tab: AssetType) => {
    setActiveTab(tab);
    setListingFilters({});
  };

  const listingCount = listings.length;
  const showFilterBar = activeTab !== 'broker_profile';

  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <main className="pt-20 dashboard-light">
        {/* Header */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
                <p className="text-muted-foreground mt-1">Verified opportunities powered by ARIA intelligence</p>
              </div>
              {user && (
                <Link href="/marketplace/submit">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Listing
                  </Button>
                </Link>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <MarketplaceTabs activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6 space-y-6">
          {/* Filter Bar */}
          {showFilterBar && (
            <FilterBar
              activeTab={activeTab}
              filters={listingFilters}
              onFilterChange={setListingFilters}
            />
          )}

          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            {activeTab === 'broker_profile'
              ? `Showing ${brokers.length} brokers`
              : `Showing ${listingCount} opportunities in South Florida`}
          </p>

          {/* Content */}
          {activeTab === 'broker_profile' ? (
            <div className="space-y-4">
              {brokersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))
              ) : brokers.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No brokers found</p>
                </div>
              ) : (
                brokers.map((broker) => (
                  <BrokerCard key={broker.id} broker={broker} />
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listingsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-lg" />
                ))
              ) : listings.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-muted-foreground">No listings found</p>
                  {user && (
                    <Link href="/marketplace/submit">
                      <Button variant="outline" className="mt-4">Be the first to list</Button>
                    </Link>
                  )}
                </div>
              ) : activeTab === 'boat' ? (
                listings.map((listing) => (
                  <BoatCard
                    key={listing.id}
                    listing={listing}
                    isFreeTier={isFreeTier}
                    onSave={handleSave}
                    isSaved={listing.is_saved}
                  />
                ))
              ) : (
                listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isFreeTier={isFreeTier}
                    onSave={handleSave}
                    isSaved={listing.is_saved}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
