import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MarketAnalysisResult, SavedMarketAnalysis } from '@/lib/types/market-intelligence';

// Analyze a market (city/zip/county)
export function useMarketAnalysis() {
  return useMutation<MarketAnalysisResult, Error, string>({
    mutationFn: async (query: string) => {
      const res = await fetch('/api/market-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to analyze market');
      }
      return res.json();
    },
  });
}

// Fetch saved analyses
export function useSavedAnalyses() {
  return useQuery<SavedMarketAnalysis[]>({
    queryKey: ['market-analyses'],
    queryFn: async () => {
      const res = await fetch('/api/market-intelligence/saved');
      if (!res.ok) throw new Error('Failed to fetch saved analyses');
      const data = await res.json();
      return data.analyses || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Save an analysis
export function useSaveAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (result: MarketAnalysisResult) => {
      const res = await fetch('/api/market-intelligence/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: result.location,
          zipCode: result.zipCode,
          state: result.state,
          county: result.county,
          ariaScore: result.ariaScore.total,
          marketData: result,
          aiSummary: result.aiSummary,
          marketType: result.marketType.type,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save analysis');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-analyses'] });
    },
  });
}

// Delete a saved analysis
export function useDeleteAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/market-intelligence/saved?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete analysis');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-analyses'] });
    },
  });
}

// Export to PDF (downloads as HTML file)
export function useExportPDF() {
  return useMutation({
    mutationFn: async (data: MarketAnalysisResult) => {
      const res = await fetch('/api/market-intelligence/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const html = await res.text();
      // Download as HTML file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BrocaAI_Market_Report_${data.zipCode}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
