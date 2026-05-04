'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MarketplaceListing,
  ListingFilters,
  ListingFormData,
  ContactMessage,
} from '@/lib/types/marketplace';

function buildSearchParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// =====================================================
// LISTING QUERIES
// =====================================================

export function useListings(filters: ListingFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () =>
      fetchJSON<{ listings: MarketplaceListing[]; total: number }>(
        `/api/marketplace${buildSearchParams(filters as Record<string, unknown>)}`,
      ),
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () =>
      fetchJSON<{ listing: MarketplaceListing }>(`/api/marketplace/${id}`),
    enabled: !!id,
  });
}

// =====================================================
// LISTING MUTATIONS
// =====================================================

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formData, userId, brokerData }: { formData: ListingFormData; userId: string; brokerData?: Record<string, unknown> }) => {
      let photoUrls: string[] = [];

      if (formData.photos.length > 0) {
        const uploadForm = new FormData();
        uploadForm.append('userId', userId);
        formData.photos.forEach((file) => uploadForm.append('files', file));
        try {
          const uploadRes = await fetch('/api/marketplace/upload', {
            method: 'POST',
            body: uploadForm,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            photoUrls = uploadData.urls ?? [];
          }
        } catch {
          // Photos failed to upload — continue without them
        }
      }

      const priceRaw = String(formData.asking_price).replace(/,/g, '');
      const payload = {
        userId,
        title: formData.title,
        description: formData.description || null,
        asset_type: formData.asset_type,
        asking_price: parseFloat(priceRaw) || null,
        location_city: formData.location_city || null,
        location_state: formData.location_state || null,
        location_zip: formData.location_zip || null,
        photos: photoUrls,
        specs: formData.specs ?? {},
        brokerData: brokerData ?? null,
      };
      return fetchJSON<{ listing: MarketplaceListing }>('/api/marketplace/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<MarketplaceListing> & { id: string }) =>
      fetchJSON<{ listing: MarketplaceListing }>(`/api/marketplace/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketplace/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

// =====================================================
// SAVE / UNSAVE
// =====================================================

export function useSaveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketplace/${id}/save`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
    },
  });
}

export function useUnsaveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketplace/${id}/save`, {
        method: 'DELETE',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
    },
  });
}

// =====================================================
// VIEWS / ANALYTICS
// =====================================================

export function useTrackView() {
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ success: boolean }>(`/api/marketplace/${id}/views`, {
        method: 'POST',
      }),
  });
}

// =====================================================
// ARIA SCORE
// =====================================================

export function useCalculateAriaScore() {
  return useMutation({
    mutationFn: (payload: { listing_id?: string; specs: Record<string, unknown> }) =>
      fetchJSON<{ aria_score: number; below_market_pct: number }>(
        '/api/marketplace/aria-score',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ),
  });
}

// =====================================================
// CONTACT
// =====================================================

export function useSendContactMessage() {
  return useMutation({
    mutationFn: (
      message: Omit<ContactMessage, 'id' | 'from_user_id' | 'is_read' | 'created_at'>,
    ) =>
      fetchJSON<{ success: boolean }>('/api/marketplace/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }),
  });
}
