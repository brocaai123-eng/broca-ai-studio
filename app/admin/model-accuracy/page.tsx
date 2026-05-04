'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Brain, TrendingUp, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';

interface PredictionRow {
  id: string;
  zip: string;
  metric: string;
  model_version: string;
  prediction_date: string;
  predicted_value: number;
  actual_value: number;
  confidence_score: number | null;
  error_pct: number | null;
  abs_error: number | null;
  status: 'OK' | 'REVIEW' | 'POOR';
}

interface VersionSummary {
  model_version: string;
  metric: string;
  count: number;
  avg_abs_error_pct: number;
  accuracy_pct: number;
  ok: number;
  review: number;
  poor: number;
}

interface AccuracyData {
  rows: PredictionRow[];
  version_summary: VersionSummary[];
  pending_count: number;
  total_resolved: number;
}

const METRIC_LABELS: Record<string, string> = {
  price: 'Price',
  inventory: 'Inventory',
  crime_trend: 'Crime Trend',
  energy_load: 'Energy Load',
  aria_score: 'ARIA Score',
};

const STATUS_COLORS: Record<string, string> = {
  OK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  POOR: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
};

const STATUS_ICONS = {
  OK: CheckCircle2,
  REVIEW: AlertTriangle,
  POOR: XCircle,
};

function formatValue(metric: string, val: number) {
  if (metric === 'price') return `$${Math.round(val).toLocaleString()}`;
  if (metric === 'inventory') return `${Math.round(val)} units`;
  if (metric === 'energy_load') return `${val.toFixed(2)}¢/kWh`;
  return String(Math.round(val));
}

function AccuracyBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function ModelAccuracyPage() {
  const { session } = useAuth();
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('90');
  const [filterMetric, setFilterMetric] = useState('all');
  const [filterZip, setFilterZip] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days });
      if (filterMetric !== 'all') params.set('metric', filterMetric);
      if (filterZip !== 'all') params.set('zip', filterZip);
      const token = session?.access_token;
      const res = await fetch(`/api/admin/model-accuracy?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accuracy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, days, filterMetric, filterZip]);

  // Derive unique zip codes from loaded rows for filter dropdown
  const uniqueZips = data ? [...new Set(data.rows.map((r) => r.zip))].sort() : [];

  // Overall headline stats
  const totalOk = data?.version_summary.reduce((s, v) => s + v.ok, 0) ?? 0;
  const totalAll = data?.total_resolved ?? 0;
  const overallAccuracy = totalAll > 0 ? Math.round((totalOk / totalAll) * 1000) / 10 : null;

  return (
    <AdminLayout
      title="Model Accuracy Dashboard"
      subtitle="Track ARIA prediction accuracy over time — internal use only"
      headerAction={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36 bg-app-muted border-app">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
            <SelectItem value="365">Last 365 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterMetric} onValueChange={setFilterMetric}>
          <SelectTrigger className="w-40 bg-app-muted border-app">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metrics</SelectItem>
            {Object.entries(METRIC_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniqueZips.length > 0 && (
          <Select value={filterZip} onValueChange={setFilterZip}>
            <SelectTrigger className="w-36 bg-app-muted border-app">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ZIPs</SelectItem>
              {uniqueZips.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="bg-app-card border-app">
          <CardContent className="py-12 text-center text-red-500">{error}</CardContent>
        </Card>
      ) : !data || data.total_resolved === 0 ? (
        <Card className="bg-app-card border-app">
          <CardContent className="py-12 text-center space-y-3">
            <Brain className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">No resolved predictions yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Predictions are written each time a forecast or ARIA score is generated. Actuals are backfilled after 30 days by the nightly cron.
              {data && data.pending_count > 0 && ` ${data.pending_count} predictions are pending resolution.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-app-card border-app">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">Overall Accuracy</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">within ±5% error</p>
              </CardContent>
            </Card>
            <Card className="bg-app-card border-app">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">Resolved Predictions</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data.total_resolved}</p>
                <p className="text-xs text-muted-foreground mt-0.5">with actual values</p>
              </CardContent>
            </Card>
            <Card className="bg-app-card border-app">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">Pending Resolution</p>
                <p className="text-3xl font-bold text-foreground mt-1">{data.pending_count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">awaiting actuals</p>
              </CardContent>
            </Card>
            <Card className="bg-app-card border-app">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">Model Versions</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {new Set(data.version_summary.map((v) => v.model_version)).size}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">tracked</p>
              </CardContent>
            </Card>
          </div>

          {/* Version Comparison Table */}
          <Card className="bg-app-card border-app">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Model Version Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-muted-foreground font-medium pr-4">Model</th>
                      <th className="text-left pb-3 text-muted-foreground font-medium pr-4">Metric</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-4">Samples</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-4">Avg Error</th>
                      <th className="pb-3 text-muted-foreground font-medium pr-4 min-w-[140px]">Accuracy</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-4">✅ OK</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-4">⚠️ Review</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium">❌ Poor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.version_summary.map((v) => (
                      <tr key={`${v.model_version}__${v.metric}`} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-foreground">{v.model_version}</td>
                        <td className="py-3 pr-4 text-foreground">{METRIC_LABELS[v.metric] ?? v.metric}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{v.count}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-foreground">
                          {v.avg_abs_error_pct.toFixed(1)}%
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <AccuracyBar
                              pct={v.accuracy_pct}
                              color={v.accuracy_pct >= 80 ? 'bg-emerald-500' : v.accuracy_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}
                            />
                            <span className="text-xs font-semibold text-foreground w-12 text-right shrink-0">
                              {v.accuracy_pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right text-emerald-600 font-semibold">{v.ok}</td>
                        <td className="py-3 pr-4 text-right text-amber-600 font-semibold">{v.review}</td>
                        <td className="py-3 text-right text-red-600 font-semibold">{v.poor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Row-level detail */}
          <Card className="bg-app-card border-app">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Prediction Detail
                <span className="text-xs text-muted-foreground font-normal ml-auto">{data.rows.length} rows</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-muted-foreground font-medium pr-3">ZIP</th>
                      <th className="text-left pb-3 text-muted-foreground font-medium pr-3">Metric</th>
                      <th className="text-left pb-3 text-muted-foreground font-medium pr-3">Date</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-3">Predicted</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-3">Actual</th>
                      <th className="text-right pb-3 text-muted-foreground font-medium pr-3">Error %</th>
                      <th className="text-center pb-3 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.rows.slice(0, 100).map((row) => {
                      const Icon = STATUS_ICONS[row.status];
                      return (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 pr-3 font-mono text-xs text-foreground">{row.zip}</td>
                          <td className="py-2 pr-3 text-foreground">{METRIC_LABELS[row.metric] ?? row.metric}</td>
                          <td className="py-2 pr-3 text-muted-foreground text-xs">{row.prediction_date}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-foreground">
                            {formatValue(row.metric, row.predicted_value)}
                          </td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">
                            {formatValue(row.metric, row.actual_value)}
                          </td>
                          <td className="py-2 pr-3 text-right font-semibold">
                            <span className={
                              row.abs_error === null ? 'text-muted-foreground' :
                              row.abs_error <= 5 ? 'text-emerald-600' :
                              row.abs_error <= 10 ? 'text-amber-600' : 'text-red-600'
                            }>
                              {row.error_pct !== null ? `${row.error_pct > 0 ? '+' : ''}${row.error_pct}%` : '—'}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status]}`}>
                              <Icon className="w-3 h-3" />
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.rows.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center pt-4">
                    Showing 100 of {data.rows.length} rows. Use filters to narrow down.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
