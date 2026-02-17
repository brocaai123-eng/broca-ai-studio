// Affiliate System Types for Broca AI Studio

export type AffiliateStatus = 'pending' | 'active' | 'suspended' | 'terminated';
export type AffiliateReferralStatus = 'clicked' | 'signed_up' | 'trial' | 'active' | 'churned' | 'refunded';
export type AffiliateCommissionStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';
export type AffiliatePayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AffiliatePayoutMethod = 'stripe' | 'ach' | 'paypal';
export type AffiliateResourceType = 'video' | 'pdf' | 'document' | 'link';

export interface Affiliate {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  company: string | null;
  referral_code: string;
  commission_rate: number;
  status: AffiliateStatus;
  payout_method: AffiliatePayoutMethod | null;
  payout_email: string | null;
  stripe_connect_id: string | null;
  minimum_payout: number;
  total_clicks: number;
  bio: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id: string | null;
  referred_email: string;
  referred_name: string | null;
  status: AffiliateReferralStatus;
  plan_name: string | null;
  plan_price: number;
  mrr: number;
  commission_rate: number | null;
  monthly_commission: number;
  ip_address: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  signed_up_at: string | null;
  activated_at: string | null;
  churned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string | null;
  period_start: string;
  period_end: string;
  referred_email: string | null;
  plan_name: string | null;
  mrr_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: AffiliateCommissionStatus;
  created_at: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  payout_method: string;
  payout_reference: string | null;
  status: AffiliatePayoutStatus;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AffiliateResource {
  id: string;
  title: string;
  description: string | null;
  type: AffiliateResourceType;
  url: string;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export interface AffiliateStats {
  active_referrals: number;
  total_referrals: number;
  monthly_commission: number;
  lifetime_earned: number;
  pending_balance: number;
  paid_balance: number;
  available_balance: number;
  conversion_rate: number;
  total_clicks: number;
}
