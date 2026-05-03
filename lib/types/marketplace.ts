export type AssetType = 'real_estate' | 'boat' | 'broker_profile';
export type ListingStatus = 'draft' | 'live' | 'sold' | 'expired' | 'pending_review';
export type NeighborhoodDirection = 'ascending' | 'declining' | 'stable';
export type SignalType =
  | 'distressed_roof' | 'overgrown' | 'vacant' | 'pool_neglect'
  | 'tax_delinquent' | 'foreclosure' | 'probate' | 'divorce'
  | 'code_violation' | 'price_below_value' | 'extended_dom'
  | 'absentee_owner' | 'long_hold';

export type RealEstateSubtype = 'house' | 'condo' | 'land' | 'commercial';
export type BoatSubtype = 'sailboat' | 'yacht' | 'speedboat' | 'catamaran' | 'fishing_boat' | 'other';
export type BrokerSpecialty = 'residential' | 'commercial' | 'luxury' | 'wholesale' | 'marine' | 'land' | 'industrial';
export type PropertyCondition = 'excellent' | 'good' | 'fair' | 'needs_work';
export type HullMaterial = 'fiberglass' | 'aluminum' | 'steel' | 'wood' | 'other';

export interface RealEstateSpecs {
  subtype: RealEstateSubtype;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  lot_size?: string;
  year_built?: number;
  condition?: PropertyCondition;
  zoning?: string;
}

export interface BoatSpecs {
  subtype: BoatSubtype;
  vessel_name?: string;
  length_ft?: number;
  beam?: string;
  draft?: string;
  cabin_count?: number;
  engine_type?: string;
  engine_hours?: number;
  hull_material?: HullMaterial;
  fuel_type?: string;
  year_built?: number;
  condition?: PropertyCondition;
  marina_city?: string;
  marina_state?: string;
  horsepower?: number;
}

export interface MarketplaceListing {
  id: string;
  user_id: string;
  broker_id: string | null;
  asset_type: AssetType;
  status: ListingStatus;
  title: string;
  description: string | null;
  asking_price: number | null;
  aria_score: number | null;
  below_market_pct: number | null;
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  specs: RealEstateSpecs | BoatSpecs | Record<string, unknown>;
  neighborhood_direction: NeighborhoodDirection | null;
  estimated_days_to_close: number | null;
  estimated_value: number | null;
  crime_score: number | null;
  motivated_seller_score: number | null;
  price_reduced_at: string | null;
  view_count: number;
  model_version: string | null;
  created_at: string;
  updated_at: string;
  today_views?: number;
  // Joined data
  broker?: BrokerProfileData | null;
  broker_profile?: BrokerProfileData | null;
  is_saved?: boolean;
}

export interface BrokerProfileData {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  license_number: string | null;
  brokerage_name: string | null;
  specialties: BrokerSpecialty[];
  zip_codes_served: string[];
  cover_photo_url: string | null;
  bio: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  aria_performance_score: number | null;
  total_listings: number;
  deals_closed: number;
  avg_days_to_close: number | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string;
  } | null;
  active_listings?: MarketplaceListing[];
}

export interface ListingFilters {
  search?: string;
  asset_type?: AssetType;
  subtype?: string;
  price_min?: number;
  price_max?: number;
  aria_score_min?: number;
  below_market_min?: number;
  date_posted?: 'any' | 'today' | 'this_week' | 'this_month';
  zip?: string;
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'score_desc';
}

export interface BrokerFilters {
  search?: string;
  specialty?: BrokerSpecialty | 'all';
  sort_by?: 'top_rated' | 'most_listings' | 'fastest_close' | 'newest';
}

export interface DealSignal {
  id: string;
  property_address: string | null;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  signal_type: SignalType;
  confidence: number | null;
  source_api: string | null;
  satellite_image_url: string | null;
  notes: string | null;
  listing_id: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
}

export interface PredictionFeedback {
  id: string;
  zip: string;
  prediction_date: string;
  metric: string;
  predicted_value: number | null;
  actual_value: number | null;
  model_version: string | null;
  confidence_score: number | null;
  created_at: string;
}

export interface MarketSnapshot {
  id: string;
  zip: string;
  snapshot_date: string;
  median_price: number | null;
  active_listings: number | null;
  avg_days_on_market: number | null;
  new_listings: number | null;
  months_of_supply: number | null;
  price_per_sqft: number | null;
  created_at: string;
}

export interface NewsSignal {
  id: string;
  zip: string | null;
  signal_date: string;
  headline: string;
  source_url: string | null;
  sentiment_score: number | null;
  signal_type: string | null;
  impact_level: 'low' | 'medium' | 'high' | 'breaking' | null;
  confidence: number | null;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  from_user_id: string | null;
  to_user_id: string;
  listing_id: string | null;
  broker_profile_id: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type ListingWizardStep = 'asset_type' | 'details' | 'photos' | 'review';

export interface ListingFormData {
  asset_type: AssetType | null;
  title: string;
  description: string;
  asking_price: string;
  location_city: string;
  location_state: string;
  location_zip: string;
  photos: File[];
  photo_previews: string[];
  specs: Record<string, string | number | undefined>;
}
