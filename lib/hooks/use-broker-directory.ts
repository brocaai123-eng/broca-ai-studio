'use client';

import { useQuery } from '@tanstack/react-query';
import type { BrokerProfileData, BrokerFilters } from '@/lib/types/marketplace';

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

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// =====================================================
// BROKER DIRECTORY QUERIES
// =====================================================

export function useBrokers(filters: BrokerFilters) {
  return useQuery({
    queryKey: ['brokers', filters],
    queryFn: () =>
      fetchJSON<{ brokers: BrokerProfileData[]; total: number }>(
        `/api/marketplace/brokers${buildSearchParams(filters as Record<string, unknown>)}`,
      ),
  });
}

export function useBrokerProfile(id: string) {
  return useQuery({
    queryKey: ['broker-profile', id],
    queryFn: () =>
      fetchJSON<{ broker: BrokerProfileData }>(`/api/marketplace/brokers/${id}`),
    enabled: !!id,
  });
}
