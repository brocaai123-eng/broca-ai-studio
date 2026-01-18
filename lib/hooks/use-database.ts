'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  Profile,
  Client,
  Document,
  FormTemplate,
  TokenTransaction,
  BrokerSubscription,
  BrokerStats,
} from '@/lib/types/database';

const supabase = createClient();

// =====================================================
// PROFILE HOOKS
// =====================================================

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Return null if no profile found (user might be new)
      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// =====================================================
// SUBSCRIPTION HOOKS
// =====================================================

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Use API route to bypass RLS
      const response = await fetch(`/api/subscription?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Subscription fetch error:', data.error);
        return null;
      }

      return data.subscription as BrokerSubscription | null;
    },
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      return data;
    },
  });
}

// =====================================================
// BROKER STATS HOOK
// =====================================================

export function useBrokerStats() {
  return useQuery({
    queryKey: ['broker-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('get_broker_stats', { broker_uuid: user.id });

      if (error) throw error;
      return data[0] as BrokerStats;
    },
  });
}

// =====================================================
// CLIENTS HOOKS
// =====================================================

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          form_template:form_templates(id, name, category)
        `)
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
  });
}

// Fetch a single client with all their documents
export function useClientDetails(clientId: string | null) {
  return useQuery({
    queryKey: ['client-details', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch client with form template
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          *,
          form_template:form_templates(id, name, category, fields)
        `)
        .eq('id', clientId)
        .eq('broker_id', user.id)
        .single();

      if (clientError) throw clientError;
      if (!client) return null;

      // Fetch documents for this client
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      return {
        ...client,
        documents: documents || [],
      } as Client & { 
        documents: Document[];
        form_template?: { id: string; name: string; category: string; fields: unknown[] } | null;
      };
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'broker_id' | 'created_at' | 'updated_at' | 'last_activity'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, broker_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['broker-stats'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['broker-stats'] });
    },
  });
}

// Create client and send onboarding email
export function useCreateClientWithEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      email, 
      phone, 
      notes, 
      formTemplateId,
      formType,
      formName,
      sendEmail = true 
    }: { 
      name: string; 
      email: string; 
      phone?: string; 
      notes?: string;
      formTemplateId?: string;
      formType?: string;
      formName?: string;
      sendEmail?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call API route to create client and send email
      const response = await fetch('/api/clients/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
          clientNotes: notes,
          formTemplateId,
          formType,
          formName,
          brokerId: user.id,
          sendEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['broker-stats'] });
    },
  });
}

// Resend onboarding email to existing client
export function useResendClientOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/clients/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          brokerId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend onboarding email');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// =====================================================
// DOCUMENTS HOOKS
// =====================================================

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          client:clients(name)
        `)
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Document & { client: { name: string } | null })[];
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doc: Omit<Document, 'id' | 'broker_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('documents')
        .insert({ ...doc, broker_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['broker-stats'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
      const { data, error } = await supabase
        .from('documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['broker-stats'] });
    },
  });
}

// =====================================================
// FORM TEMPLATES HOOKS
// =====================================================

export function useFormTemplates() {
  return useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

      // Return empty array if table doesn't exist or RLS blocks access
      if (error) {
        console.warn('Failed to fetch form templates:', error.message);
        return [];
      }
      return data as FormTemplate[];
    },
  });
}

export function useFormTemplate(id: string) {
  return useQuery({
    queryKey: ['form-template', id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .eq('broker_id', user.id)
        .single();

      if (error) throw error;
      return data as FormTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: Omit<FormTemplate, 'id' | 'broker_id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('form_templates')
        .insert({ ...form, broker_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
    },
  });
}

export function useUpdateFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<FormTemplate, 'id' | 'broker_id' | 'created_at' | 'updated_at'>> }) => {
      const { data: result, error } = await supabase
        .from('form_templates')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
      queryClient.invalidateQueries({ queryKey: ['form-template', variables.id] });
    },
  });
}

export function useDeleteFormTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-templates'] });
    },
  });
}

// =====================================================
// TOKEN HOOKS
// =====================================================

export function useTokenTransactions() {
  return useQuery({
    queryKey: ['token-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as TokenTransaction[];
    },
  });
}

export function useDeductTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, actionType, description }: { amount: number; actionType: string; description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('deduct_tokens', {
          p_broker_id: user.id,
          p_amount: amount,
          p_action_type: actionType,
          p_description: description,
        });

      if (error) throw error;
      if (!data) throw new Error('Insufficient tokens');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['token-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['broker-stats'] });
    },
  });
}

// =====================================================
// REFERRAL HOOKS
// =====================================================

interface ReferralStats {
  total_invites: number;
  pending_invites: number;
  accepted_invites: number;
  tokens_earned: number;
}

interface BrokerReferral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_name: string | null;
  referral_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  tokens_rewarded: boolean;
  reward_amount: number;
  referred_user_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  referred_user?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export function useReferrals() {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { referrals: [], stats: null };

      const response = await fetch(`/api/broker/referrals?brokerId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Referrals fetch error:', data.error);
        return { referrals: [], stats: null };
      }

      return {
        referrals: data.referrals as BrokerReferral[],
        stats: data.stats as ReferralStats,
      };
    },
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/broker/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: user.id, email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send referral');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

export function useCancelReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referralId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`/api/broker/referrals?referralId=${referralId}&brokerId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel referral');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

