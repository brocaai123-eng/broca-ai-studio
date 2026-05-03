"use client";

import { Building2, Ship, Users } from "lucide-react";
import type { AssetType } from "@/lib/types/marketplace";

interface MarketplaceTabsProps {
  activeTab: AssetType;
  onTabChange: (tab: AssetType) => void;
}

const tabs = [
  { id: 'real_estate' as AssetType, label: 'Real Estate', icon: Building2 },
  { id: 'boat' as AssetType, label: 'Boats & Yachts', icon: Ship },
  { id: 'broker_profile' as AssetType, label: 'Broker Directory', icon: Users },
];

export default function MarketplaceTabs({ activeTab, onTabChange }: MarketplaceTabsProps) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200
            border-b-2 -mb-px
            ${activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }
          `}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
