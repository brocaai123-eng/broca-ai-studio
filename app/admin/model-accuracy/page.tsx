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
import {
  Loader2, Brain, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, Clock, BarChart3, Activity,
} from 'lucide-react';
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

interface PendingRow {
  id: string;
  zip: string;
  metric: string;
  model_version: string;
  prediction_date: string;
  predicted_value: number;
  confidence_score: number | null;
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
  pending_rows: PendingRow[];
  version_summary: VersionSummary[];
  pending_count: number;
  total_resolved: number;
}

const METRIC_LABELS: Record<string, string> = {
  price: 'Price Forecast',
  inventory: 'Inventory',
  crime_trend: 'Crime Trend',
  energy_load: 'Energy Load',
  aria_score: 'ARIA Score',
  population_score: 'Population Score',
  grid_capacity_pct: 'Grid Capacity %',
  neighborhood_score: 'Neighborhood Score',
  seller_avg_score: 'Seller Distress Score',
  volatility_index: 'Volatility Index',
};

const STATUS_COLORS: Record<string, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  REVIEW: 'bg-amber-100 text-amber-700 border border-amber-200',
  POOR: 'bg-red-100 text-red-700 border border-red-200',
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
  if (metric === 'grid_capacity_pct') return `${val.toFixed(1)}%`;
  if (metric === 'population_score') return `${Math.round(val)}/100`;
  if (metric === 'neighborhood_score') return `${Math.round(val)}/100`;
  if (metric === 'seller_avg_score') return `${Math.round(val)}/100`;
  if (metric === 'volatility_index') return `${val.toFixed(1)}/100`;
  if (metric === 'aria_score') return `${Math.round(val)}/100`;
  return String(Math.round(val));
}

function daysUntilResolution(predictionDate: string): number {
  const pred = new Date(predictionDate);
  const resolveAt = new Date(pred);
  resolveAt.setDate(resolveAt.getDate() + 30);
  const diff = resolveAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function AccuracyBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden w-full">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: string }) {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900'}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
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

  const uniqueZips = data ? [...new Set(data.rows.map((r) => r.zip))].sort() : [];
  const totalOk = data?.version_summary.reduce((s, v) => s + v.ok, 0) ?? 0;
  const totalAll = data?.total_resolved ?? 0;
  const overallAccuracy = totalAll > 0 ? Math.round((totalOk / totalAll) * 1000) / 10 : null;

  const pendingRows = data?.pending_rows ?? [];
  const hasResolved = data && data.total_resolved > 0;
  const hasPending = data && (data.pending_count > 0 || pendingRows.length > 0);

  return (
    <AdminLayout
      title="Model Accuracy Dashboard"
      subtitle="Track prediction accuracy over time — internal use only"
      headerAction={
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-800 font-medium shadow-sm">
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
          <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-800 font-medium shadow-sm">
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
            <SelectTrigger className="w-36 bg-white border-gray-300 text-gray-800 font-medium shadow-sm">
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
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-gray-500">Loading accuracy data…</p>
          </div>
        </div>
      ) : error ? (
        <Card className="bg-red-50 border border-red-200">
          <CardContent className="py-10 text-center text-red-600 text-sm">{error}</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* Pipeline Status Banner */}
          <div className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {[
              {
                step: '1', icon: Activity, label: 'Predictions Written',
                value: totalAll + (data?.pending_count ?? 0),
                sub: 'total logged so far',
                color: 'bg-blue-50 border-r border-gray-200',
                iconColor: 'text-blue-500',
              },
              {
                step: '2', icon: Clock, label: 'Awaiting Resolution',
                value: data?.pending_count ?? 0,
                sub: 'resolve after 30 days',
                color: 'bg-amber-50 border-r border-gray-200',
                iconColor: 'text-amber-500',
              },
              {
                step: '3', icon: BarChart3, label: 'Resolved & Compared',
                value: totalAll,
                sub: 'with actual outcomes',
                color: 'bg-emerald-50',
                iconColor: 'text-emerald-500',
              },
            ].map(({ step, icon: Icon, label, value, sub, color, iconColor }) => (
              <div key={step} className={`${color} p-5 flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Resolved KPIs — only if there is resolved data */}
          {hasResolved && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard
                label="Overall Accuracy"
                value={overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
                sub="within ±5% error"
                accent="text-emerald-600"
              />
              <KpiCard label="Resolved" value={totalAll} sub="with actual values" />
              <KpiCard
                label="Within Target"
                value={totalOk}
                sub="≤5% error margin"
                accent="text-emerald-600"
              />
              <KpiCard
                label="Model Versions"
                value={new Set(data!.version_summary.map((v) => v.model_version)).size}
                sub="tracked"
              />
            </div>
          )}

          {/* Pending Predictions — always show if any exist */}
          {hasPending && (
            <Card className="bg-white border border-amber-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-amber-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Predictions
                  <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold">
                    {pendingRows.length} waiting
                  </Badge>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  These predictions were logged by the nightly pipeline. Actual outcomes will be compared after 30 days.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider pr-4">ZIP</th>
                        <th className="text-left pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider pr-4">Metric</th>
                        <th className="text-left pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider pr-4">Predicted Date</th>
                        <th className="text-right pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider pr-4">Predicted Value</th>
                        <th className="text-right pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider pr-4">Confidence</th>
                        <th className="text-right pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Resolves In</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingRows.map((row) => {
                        const daysLeft = daysUntilResolution(row.prediction_date);
                        return (
                          <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-3 pr-4 font-mono text-xs font-semibold text-gray-800">{row.zip}</td>
                            <td className="py-3 pr-4 text-gray-700">{METRIC_LABELS[row.metric] ?? row.metric}</td>
                            <td className="py-3 pr-4 text-gray-500 text-xs">{row.prediction_date}</td>
                            <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                              {formatValue(row.metric, row.predicted_value)}
                            </td>
                            <td className="py-3 pr-4 text-right text-gray-500">
                              {row.confidence_score != null ? `${Math.round(row.confidence_score)}%` : '—'}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                daysLeft === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                <Clock className="w-3 h-3" />
                                {daysLeft === 0 ? 'Ready' : `${daysLeft}d`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No resolved data yet — empty state with context */}
          {!hasResolved && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-800">No resolved predictions yet</p>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    The nightly pipeline logs price predictions to this table. After 30 days, the system compares
                    each predicted value against the real outcome and populates the accuracy table here.
                  </p>
                </div>
                {hasPending && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {pendingRows.length} prediction{pendingRows.length !== 1 ? 's' : ''} in the queue above
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Version Comparison Table — only when resolved data exists */}
          {hasResolved && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Model Version Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Model', 'Metric', 'Samples', 'Avg Error', 'Accuracy', '✅ OK', '⚠️ Review', '❌ Poor'].map((h) => (
                          <th key={h} className={`pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider ${h === 'Model' || h === 'Metric' ? 'text-left pr-4' : h === 'Accuracy' ? 'text-left pr-4 min-w-[140px]' : 'text-right pr-4 last:pr-0'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data!.version_summary.map((v) => (
                        <tr key={`${v.model_version}__${v.metric}`} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 pr-4 font-mono text-xs text-gray-700">{v.model_version}</td>
                          <td className="py-3 pr-4 text-gray-800">{METRIC_LABELS[v.metric] ?? v.metric}</td>
                          <td className="py-3 pr-4 text-right text-gray-500">{v.count}</td>
                          <td className="py-3 pr-4 text-right font-semibold text-gray-900">{v.avg_abs_error_pct.toFixed(1)}%</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <AccuracyBar
                                pct={v.accuracy_pct}
                                color={v.accuracy_pct >= 80 ? 'bg-emerald-500' : v.accuracy_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}
                              />
                              <span className="text-xs font-bold text-gray-900 w-12 text-right shrink-0">
                                {v.accuracy_pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right text-emerald-600 font-bold">{v.ok}</td>
                          <td className="py-3 pr-4 text-right text-amber-600 font-bold">{v.review}</td>
                          <td className="py-3 text-right text-red-600 font-bold">{v.poor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row-level detail — only when resolved data exists */}
          {hasResolved && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Prediction Detail
                  <span className="text-xs text-gray-400 font-normal ml-auto">{data!.rows.length} rows</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['ZIP', 'Metric', 'Date', 'Predicted', 'Actual', 'Error %', 'Status'].map((h) => (
                          <th key={h} className={`pb-3 text-xs text-gray-400 font-semibold uppercase tracking-wider ${['ZIP', 'Metric', 'Date'].includes(h) ? 'text-left pr-3' : h === 'Status' ? 'text-center' : 'text-right pr-3'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data!.rows.slice(0, 100).map((row) => {
                        const Icon = STATUS_ICONS[row.status];
                        return (
                          <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-gray-800">{row.zip}</td>
                            <td className="py-2.5 pr-3 text-gray-700">{METRIC_LABELS[row.metric] ?? row.metric}</td>
                            <td className="py-2.5 pr-3 text-gray-400 text-xs">{row.prediction_date}</td>
                            <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">
                              {formatValue(row.metric, row.predicted_value)}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-gray-500">
                              {formatValue(row.metric, row.actual_value)}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-semibold">
                              <span className={
                                row.abs_error === null ? 'text-gray-400' :
                                row.abs_error <= 5 ? 'text-emerald-600' :
                                row.abs_error <= 10 ? 'text-amber-600' : 'text-red-600'
                              }>
                                {row.error_pct !== null ? `${row.error_pct > 0 ? '+' : ''}${row.error_pct}%` : '—'}
                              </span>
                            </td>
                            <td className="py-2.5 text-center">
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
                  {data!.rows.length > 100 && (
                    <p className="text-xs text-gray-400 text-center pt-4 pb-1">
                      Showing 100 of {data!.rows.length} rows. Use filters to narrow down.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
