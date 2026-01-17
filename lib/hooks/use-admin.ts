'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  Profile,
  BrokerSubscription,
  SubscriptionPlan,
  PlatformTransaction,
  BrokerInvitation,
  ActivityLog,
  PlatformStats,
  TokenTransaction,
  BrokerWithSubscription,
} from '@/lib/types/database';

const supabase = createClient();

// =====================================================
// ADMIN CHECK HOOK
// =====================================================

export function useIsAdmin() {
  return useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) return false;
      return data?.role === 'admin';
    },
  });
}

// =====================================================
// PLATFORM STATS HOOK
// =====================================================

export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_stats');

      if (error) throw error;
      return data[0] as PlatformStats;
    },
  });
}

// =====================================================
// ALL BROKERS HOOKS
// =====================================================

export function useAllBrokers() {
  return useQuery({
    queryKey: ['admin', 'brokers'],
    queryFn: async () => {
      // Get all brokers with their subscriptions
      const { data: brokers, error: brokersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'broker')
        .order('created_at', { ascending: false });

      if (brokersError) throw brokersError;

      // Get subscriptions for all brokers
      const { data: subscriptions, error: subsError } = await supabase
        .from('broker_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `);

      if (subsError) throw subsError;

      // Get client counts for all brokers
      const { data: clientCounts, error: clientsError } = await supabase
        .from('clients')
        .select('broker_id');

      if (clientsError) throw clientsError;

      // Combine data
      const brokersWithData: BrokerWithSubscription[] = brokers.map((broker) => {
        const subscription = subscriptions?.find((s) => s.broker_id === broker.id);
        const clientCount = clientCounts?.filter((c) => c.broker_id === broker.id).length || 0;

        return {
          ...broker,
          subscription: subscription || undefined,
          clients_count: clientCount,
        };
      });

      return brokersWithData;
    },
  });
}

export function useUpdateBrokerSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brokerId, planId, status }: { brokerId: string; planId?: string; status?: string }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (planId) updates.plan_id = planId;
      if (status) updates.status = status;

      // Check if subscription exists
      const { data: existing } = await supabase
        .from('broker_subscriptions')
        .select('id')
        .eq('broker_id', brokerId)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('broker_subscriptions')
          .update(updates)
          .eq('broker_id', brokerId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new subscription
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('tokens_per_month')
          .eq('id', planId)
          .single();

        const { data, error } = await supabase
          .from('broker_subscriptions')
          .insert({
            broker_id: brokerId,
            plan_id: planId,
            status: status || 'active',
            tokens_remaining: plan?.tokens_per_month || 0,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brokers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-stats'] });
    },
  });
}

export function useDeleteBroker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brokerId: string) => {
      const { error } = await supabase.auth.admin.deleteUser(brokerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brokers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-stats'] });
    },
  });
}

// =====================================================
// BROKER INVITATIONS HOOKS
// =====================================================

export function useBrokerInvitations() {
  return useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broker_invitations')
        .select(`
          *,
          plan:subscription_plans(name, price)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (BrokerInvitation & { plan: { name: string; price: number } | null })[];
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, name, planId }: { email: string; name?: string; planId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Call API route to create invitation and send email
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          planId,
          adminId: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // Call API route to resend invitation email
      const response = await fetch('/api/admin/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('broker_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
  });
}

// =====================================================
// PLATFORM TRANSACTIONS HOOKS
// =====================================================

export function usePlatformTransactions() {
  return useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_transactions')
        .select(`
          *,
          broker:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as (PlatformTransaction & { broker: { full_name: string; email: string } | null })[];
    },
  });
}

// =====================================================
// ALL TOKEN TRANSACTIONS (ADMIN)
// =====================================================

export function useAllTokenTransactions() {
  return useQuery({
    queryKey: ['admin', 'token-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_transactions')
        .select(`
          *,
          broker:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as (TokenTransaction & { broker: { full_name: string; email: string } | null })[];
    },
  });
}

// =====================================================
// ADD TOKENS (ADMIN)
// =====================================================

export function useAddTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brokerId, amount, description }: { brokerId: string; amount: number; description?: string }) => {
      const { data, error } = await supabase.rpc('add_tokens', {
        p_broker_id: brokerId,
        p_amount: amount,
        p_description: description || 'Admin token allocation',
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to add tokens');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brokers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'token-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-stats'] });
    },
  });
}

// =====================================================
// ACTIVITY LOG HOOKS
// =====================================================

export function useActivityLog() {
  return useQuery({
    queryKey: ['admin', 'activity-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as (ActivityLog & { user: { full_name: string; email: string } | null })[];
    },
  });
}

// =====================================================
// SUBSCRIPTION PLANS (ADMIN)
// =====================================================

export function useAllSubscriptionPlans() {
  return useQuery({
    queryKey: ['admin', 'subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price');

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
}

// =====================================================
// SUBSCRIPTION STATS
// =====================================================

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ['admin', 'subscription-stats'],
    queryFn: async () => {
      // Get all subscriptions with plans
      const { data: subscriptions, error: subsError } = await supabase
        .from('broker_subscriptions')
        .select(`
          *,
          plan:subscription_plans(name, price)
        `)
        .eq('status', 'active');

      if (subsError) throw subsError;

      // Calculate stats
      const planCounts: Record<string, { count: number; revenue: number; price: number }> = {};
      let monthlyRevenue = 0;
      
      subscriptions?.forEach((sub) => {
        const planName = sub.plan?.name || 'Unknown';
        const price = sub.plan?.price || 0;
        
        if (!planCounts[planName]) {
          planCounts[planName] = { count: 0, revenue: 0, price };
        }
        planCounts[planName].count++;
        planCounts[planName].revenue += price;
        
        // Calculate monthly revenue from active subscription prices
        monthlyRevenue += price;
      });

      return {
        totalActive: subscriptions?.length || 0,
        monthlyRevenue,
        planBreakdown: Object.entries(planCounts).map(([name, data]) => ({
          name,
          count: data.count,
          revenue: data.revenue,
          price: data.price,
        })),
      };
    },
  });
}
