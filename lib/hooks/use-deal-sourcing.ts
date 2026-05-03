'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DealSignal } from '@/lib/types/marketplace';

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

export function useDealSignals(filters: { zip?: string; signal_type?: string }) {
  return useQuery({
    queryKey: ['deal-signals', filters],
    queryFn: () =>
      fetchJSON<{ signals: DealSignal[] }>(
        `/api/deal-sourcing${buildSearchParams(filters as Record<string, unknown>)}`,
      ),
  });
}

export function useScanProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { address: string; zip: string }) =>
      fetchJSON<{ signals: DealSignal[] }>('/api/deal-sourcing/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-signals'] });
    },
  });
}
