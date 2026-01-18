// Database Types for Broca AI Studio

export type UserRole = 'admin' | 'broker';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

export type DocumentType = 'contract' | 'id' | 'financial' | 'property' | 'other';

export type DocumentStatus = 'verified' | 'pending' | 'rejected';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending';

export type FormCategory = 'buyer' | 'seller' | 'rental' | 'general';

export type FormStatus = 'active' | 'draft';

export type TokenActionType = 'ai_scan' | 'onboarding' | 'email' | 'form' | 'purchase' | 'allocation' | 'admin_add' | 'referral_bonus';

export type TransactionType = 'subscription' | 'token_purchase' | 'upgrade' | 'refund';

export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export type ReferralStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

// Profile
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Subscription Plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  tokens_per_month: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

// Broker Subscription
export interface BrokerSubscription {
  id: string;
  broker_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  tokens_remaining: number;
  tokens_used: number;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
  broker?: Profile;
}

// Client
export interface Client {
  id: string;
  broker_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: OnboardingStatus;
  onboarding_progress: number;
  documents_submitted: number;
  documents_required: number;
  notes: string | null;
  last_activity: string;
  created_at: string;
  updated_at: string;
  // Onboarding fields
  onboarding_token?: string | null;
  form_template_id?: string | null;
  form_type?: string | null;
  form_data?: Record<string, unknown> | null;
  ai_extracted_data?: Record<string, unknown> | null;
  // Joined data
  form_template?: { id: string; name: string; category?: string; fields?: unknown[] } | null;
}

// Document
export interface Document {
  id: string;
  broker_id: string;
  client_id: string | null;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  file_path: string | null;
  file_type: 'pdf' | 'image' | 'doc';
  file_size: string | null;
  deal_name: string | null;
  created_at: string;
  updated_at: string;
  // Additional fields
  file_url?: string | null;
  document_type?: string | null;
  ai_extracted_data?: Record<string, unknown> | null;
  // Joined data
  client?: Client;
}

// Form Template
export interface FormTemplate {
  id: string;
  broker_id: string;
  name: string;
  description: string | null;
  category: FormCategory;
  fields: unknown[];
  fields_count: number;
  usage_count: number;
  status: FormStatus;
  last_used: string | null;
  created_at: string;
  updated_at: string;
}

// Token Transaction
export interface TokenTransaction {
  id: string;
  broker_id: string;
  action_type: TokenActionType;
  description: string | null;
  tokens_amount: number;
  balance_after: number;
  created_at: string;
  // Joined data
  broker?: Profile;
}

// Platform Transaction
export interface PlatformTransaction {
  id: string;
  broker_id: string | null;
  type: TransactionType;
  description: string | null;
  amount: number;
  plan_name: string | null;
  tokens: number | null;
  status: TransactionStatus;
  created_at: string;
  // Joined data
  broker?: Profile;
}

// Broker Invitation
export interface BrokerInvitation {
  id: string;
  email: string;
  name: string | null;
  plan_id: string | null;
  status: InvitationStatus;
  invited_by: string | null;
  expires_at: string;
  created_at: string;
  // Joined data
  plan?: SubscriptionPlan;
}

// Broker Referral (for invite & earn program)
export interface BrokerReferral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_name: string | null;
  referral_token: string;
  status: ReferralStatus;
  tokens_rewarded: boolean;
  reward_amount: number;
  referred_user_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  referrer?: Profile;
  referred_user?: Profile;
}

// Activity Log
export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined data
  user?: Profile;
}

// Stats Types
export interface BrokerStats {
  total_clients: number;
  active_clients: number;
  total_documents: number;
  tokens_remaining: number;
  tokens_used: number;
}

export interface PlatformStats {
  total_brokers: number;
  active_brokers: number;
  monthly_revenue: number;
  total_tokens_consumed: number;
  total_onboardings: number;
}

// Extended Broker (with subscription info)
export interface BrokerWithSubscription extends Profile {
  subscription?: BrokerSubscription & {
    plan?: SubscriptionPlan;
  };
  clients_count?: number;
  last_active?: string;
}
