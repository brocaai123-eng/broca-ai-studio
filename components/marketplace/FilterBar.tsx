"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ListingFilters, AssetType } from "@/lib/types/marketplace";

interface FilterBarProps {
  activeTab: AssetType;
  filters: ListingFilters;
  onFilterChange: (filters: ListingFilters) => void;
}

const realEstateTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

const boatTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'sailboat', label: 'Sailboat' },
  { value: 'yacht', label: 'Yacht' },
  { value: 'speedboat', label: 'Speedboat' },
  { value: 'catamaran', label: 'Catamaran' },
  { value: 'fishing_boat', label: 'Fishing Boat' },
  { value: 'other', label: 'Other' },
];

export default function FilterBar({ activeTab, filters, onFilterChange }: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");

  const updateFilter = useCallback((key: keyof ListingFilters, value: string | number | undefined) => {
    const updated = { ...filters, [key]: value };
    if (value === undefined || value === '' || value === 'all' || value === 'any') {
      delete updated[key];
    }
    onFilterChange(updated);
  }, [filters, onFilterChange]);

  const handleSearch = () => {
    updateFilter('search', searchValue || undefined);
  };

  const clearFilters = () => {
    setSearchValue("");
    onFilterChange({});
  };

  const subtypeOptions = activeTab === 'real_estate' ? realEstateTypes : boatTypes;
  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-lg">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by location, zip, or keyword..."
          className="pl-9"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {/* Asset Subtype */}
      <Select
        value={filters.subtype || 'all'}
        onValueChange={(v) => updateFilter('subtype', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {subtypeOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Price Range */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          placeholder="Min $"
          className="w-[100px]"
          value={filters.price_min || ""}
          onChange={(e) => updateFilter('price_min', e.target.value ? Number(e.target.value) : undefined)}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max $"
          className="w-[100px]"
          value={filters.price_max || ""}
          onChange={(e) => updateFilter('price_max', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      {/* ARIA Score */}
      <Select
        value={String(filters.aria_score_min || 'any')}
        onValueChange={(v) => updateFilter('aria_score_min', v === 'any' ? undefined : Number(v))}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="ARIA Score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Score</SelectItem>
          <SelectItem value="50">50+</SelectItem>
          <SelectItem value="60">60+</SelectItem>
          <SelectItem value="70">70+</SelectItem>
          <SelectItem value="80">80+</SelectItem>
        </SelectContent>
      </Select>

      {/* Below Market */}
      <Select
        value={String(filters.below_market_min || 'any')}
        onValueChange={(v) => updateFilter('below_market_min', v === 'any' ? undefined : Number(v))}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Below Mkt" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any %</SelectItem>
          <SelectItem value="5">5%+</SelectItem>
          <SelectItem value="10">10%+</SelectItem>
          <SelectItem value="15">15%+</SelectItem>
          <SelectItem value="20">20%+</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Posted */}
      <Select
        value={filters.date_posted || 'any'}
        onValueChange={(v) => updateFilter('date_posted', v === 'any' ? undefined : v)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
