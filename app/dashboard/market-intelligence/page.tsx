"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  TrendingDown,
  MapPin,
  Home,
  BarChart3,
  Clock,
  DollarSign,
  Users as UsersIcon,
  Sparkles,
  Download,
  Bookmark,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trash2,
  ChevronRight,
  Activity,
  Target,
  Percent,
  Building,
  Trophy,
  Zap,
  Shield,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  useMarketAnalysis,
  useSavedAnalyses,
  useSaveAnalysis,
  useDeleteAnalysis,
  useExportPDF,
} from "@/lib/hooks/use-market-intelligence";
import type { MarketAnalysisResult } from "@/lib/types/market-intelligence";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  Legend,
} from "recharts";

// ─── Helpers ───────────────────────────────────────────────────────────
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return value.toLocaleString();
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10";
  if (score >= 60) return "bg-blue-500/10";
  if (score >= 40) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500 to-emerald-600";
  if (score >= 60) return "from-blue-500 to-blue-600";
  if (score >= 40) return "from-amber-500 to-amber-600";
  return "from-red-500 to-red-600";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getMarketTypeStyles(type: string) {
  switch (type) {
    case "sellers":
      return { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: "🔥" };
    case "buyers":
      return { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: "🏷️" };
    default:
      return { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: "⚖️" };
  }
}

// ─── ARIA Score Ring ───────────────────────────────────────────────────
function ARIAScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" className="text-gray-100"
          strokeWidth="8"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500 font-medium">/100</span>
      </div>
    </div>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────────
function MetricCard({
  icon: Icon, label, value, subtitle, trend,
}: {
  icon: React.ElementType; label: string; value: string; subtitle?: string;
  trend?: "up" | "down" | "stable" | null;
}) {
  return (
    <div className="app-card p-5 group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-gray-400"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> :
             trend === "down" ? <ArrowDownRight className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Data Source Badge ─────────────────────────────────────────────────
function DataSourceBadge({ name, active }: { name: string; active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-600 border-red-200"
      }`}
    >
      {active ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {name}
    </Badge>
  );
}

// ─── Crime Intelligence Layer ─────────────────────────────────────────
function CrimeLayerDetail({ payload }: { payload: any }) {
  const score = Number(payload?.safety_score ?? 0);
  const incidents = Number(payload?.incidents_sample ?? 0);
  const violent = Number(payload?.violent_crimes_sample ?? 0);
  const property = Number(payload?.property_crimes_sample ?? 0);
  const breakdown: Array<{ category: string; count: number; per_capita: number; trend: string }> = payload?.breakdown ?? [];
  const fbi = payload?.fbi_benchmark ?? {};
  const comparison = payload?.national_comparison ?? '';
  const isEstimated = !!payload?.is_estimated;
  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const scoreBg = score >= 70 ? 'bg-emerald-50 border-emerald-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const scoreTextColor = score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-red-700';
  const scoreLabel = score >= 70 ? 'SAFE' : score >= 40 ? 'MODERATE' : 'HIGH RISK';

  const allZero = incidents === 0 && violent === 0 && property === 0;

  const trendColor = (t: string) => t === 'down' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : t === 'up' ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200';
  const trendArrow = (t: string) => t === 'down' ? '↓' : t === 'up' ? '↑' : '→';

  const barColors = ['#f87171', '#fb923c', '#fbbf24', '#a78bfa', '#60a5fa'];
  const chartData = breakdown.filter(b => b.count > 0).map(b => ({ name: b.category, count: b.count, trend: b.trend }));

  return (
    <div className="space-y-5">

      {/* Score + Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-xl border p-4 text-center ${scoreBg}`}>
          <div className="text-4xl font-bold mb-0.5" style={{ color: scoreColor }}>{score}</div>
          <div className={`text-xs font-bold tracking-widest mt-0.5 ${scoreTextColor}`}>{scoreLabel}</div>
          <div className="text-xs text-gray-500 mt-1">Safety Score</div>
          <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-4xl font-bold text-gray-700">{incidents.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">Total Incidents</div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
          <div className="text-4xl font-bold text-red-600">{violent.toLocaleString()}</div>
          <div className="text-xs text-red-700 font-semibold mt-1">Violent Crimes</div>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
          <div className="text-4xl font-bold text-orange-500">{property.toLocaleString()}</div>
          <div className="text-xs text-orange-700 font-semibold mt-1">Property Crimes</div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      {chartData.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Incidents by Category</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 11 }} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v: number) => [v, 'Incidents']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((_: any, i: number) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-3">
            {breakdown.filter(b => b.count > 0).map((b, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${trendColor(b.trend)}`}>
                {trendArrow(b.trend)} {b.category}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Category Breakdown</h4>
          <div className="space-y-2">
            {breakdown.map((b, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barColors[i % barColors.length] }} />
                  <span className="text-sm text-gray-800">{b.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">0 incidents</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${trendColor(b.trend)}`}>{trendArrow(b.trend)} {b.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Grid & Infrastructure Layer ──────────────────────────────────────
function GridLayerDetail({ payload }: { payload: any }) {
  const capacityPct = Number(payload?.capacity_pct ?? 0);
  const gridScore = Number(payload?.grid_score ?? 0);
  const utility = payload?.utility_name ?? 'Unknown';
  const substations = payload?.nearest_substations ?? [];
  const capacityColor = capacityPct >= 80 ? '#ef4444' : capacityPct >= 65 ? '#f59e0b' : '#10b981';
  const capacityLabel = capacityPct >= 80 ? 'HIGH LOAD' : capacityPct >= 65 ? 'MODERATE' : 'HEALTHY';
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-4xl font-bold" style={{ color: capacityColor }}>{Math.round(capacityPct)}%</div>
          <div className="text-xs font-bold mt-0.5" style={{ color: capacityColor }}>{capacityLabel}</div>
          <div className="text-xs text-gray-500 mt-1">Grid Capacity Used</div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${capacityPct}%`, backgroundColor: capacityColor }} />
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
          <div className="text-4xl font-bold text-amber-700">{gridScore}</div>
          <div className="text-xs text-amber-600 font-semibold mt-1">Grid Score /100</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <div className="text-sm font-bold text-gray-800 leading-tight">{utility}</div>
          <div className="text-xs text-gray-500 mt-1">Utility Provider</div>
        </div>
      </div>
      {substations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Nearest Substations</h4>
          <div className="space-y-2">
            {substations.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.voltage && s.voltage !== 'N/A' ? `${s.voltage}kV` : ''}{s.status ? ` • ${s.status}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-amber-600">{s.distance_miles} mi</div>
                  <div className="text-xs text-gray-400">distance</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── News Signals Layer ───────────────────────────────────────────────
function NewsLayerDetail({ payload }: { payload: any }) {
  const articles = payload?.last_7_days ?? [];
  if (articles.length === 0) {
    return <div className="text-center py-6 text-gray-400 text-sm">No recent news articles found for this area.</div>;
  }
  return (
    <div className="space-y-2">
      {articles.slice(0, 8).map((a: any, i: number) => (
        <a key={i} href={a.url || '#'} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 hover:border-primary/30 hover:bg-primary/5 transition-colors group">
          <Newspaper className="w-4 h-4 text-gray-300 group-hover:text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 group-hover:text-primary leading-snug line-clamp-2">{a.headline}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {a.source && <span className="text-xs text-gray-400 font-medium">{a.source}</span>}
              {a.date && <span className="text-xs text-gray-300">•</span>}
              {a.date && <span className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString()}</span>}
              {a.signal && (
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  a.signal === 'BUY' ? 'bg-emerald-100 text-emerald-700' :
                  a.signal === 'SELL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{a.signal}</span>
              )}
            </div>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary shrink-0" />
        </a>
      ))}
    </div>
  );
}

// ─── People & Demographics Layer ─────────────────────────────────────
function PeopleLayerDetail({ payload }: { payload: any }) {
  const pop = payload?.population;
  const income = payload?.median_income;
  const owner = payload?.owner ?? 0;
  const renter = payload?.renter ?? 0;
  const total = owner + renter;
  const ownerPct = total > 0 ? Math.round((owner / total) * 100) : null;
  const renterPct = ownerPct != null ? 100 - ownerPct : null;
  const ownerRentRatio = payload?.owner_renter_ratio;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-2xl font-bold text-emerald-700">{pop ? pop.toLocaleString() : '—'}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-0.5">Total Population</div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-2xl font-bold text-blue-700">{income ? `$${income.toLocaleString()}` : '—'}</div>
          <div className="text-xs text-blue-600 font-semibold mt-0.5">Median Household Income</div>
        </div>
      </div>
      {ownerPct != null && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> Owner vs Renter Split</h4>
          <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${ownerPct}%` }} />
            <div className="bg-blue-400 rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-emerald-600 font-semibold">Owner-occupied: {ownerPct}%</span>
            <span className="text-xs text-blue-500 font-semibold">Renters: {renterPct}%</span>
          </div>
          {ownerRentRatio != null && (
            <div className="mt-2 text-xs text-gray-500">Owner/Renter ratio: <span className="font-semibold text-gray-800">{ownerRentRatio}</span></div>
          )}
        </div>
      )}
    </div>
  );
}

function renderLayerDetail(layerKey: string, row: any) {
  const p = row?.payload ?? {};
  switch (layerKey) {
    case 'crime': return <CrimeLayerDetail payload={p} />;
    case 'grid': return <GridLayerDetail payload={p} />;
    case 'news': return <NewsLayerDetail payload={p} />;
    case 'people': return <PeopleLayerDetail payload={p} />;
    default: return (
      <pre className="text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100 overflow-auto max-h-60">
        {JSON.stringify(p, null, 2)}
      </pre>
    );
  }
}

// ─── Main Page Component ───────────────────────────────────────────────
export default function MarketIntelligencePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MarketAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Tab 2 (Forecast)
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any | null>(null);

  // Tab 3 (Layers)
  const [layersLoading, setLayersLoading] = useState(false);
  const [layersError, setLayersError] = useState<string | null>(null);
  const [layersData, setLayersData] = useState<any[] | null>(null);
  const [openLayerKeys, setOpenLayerKeys] = useState<Record<string, boolean>>({
    crime: true,
    grid: false,
    news: false,
    people: false,
  });

  // Tab 4 (Comparable ZIPs)
  const [comparablesLoading, setComparablesLoading] = useState(false);
  const [comparablesError, setComparablesError] = useState<string | null>(null);
  const [comparablesData, setComparablesData] = useState<any[] | null>(null);
  const [comparablesAsOf, setComparablesAsOf] = useState<string | null>(null);

  // Predictions tab
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [predictionsData, setPredictionsData] = useState<any[] | null>(null);

  const analyze = useMarketAnalysis();
  const { data: savedAnalyses, isLoading: savedLoading } = useSavedAnalyses();
  const saveAnalysis = useSaveAnalysis();
  const deleteAnalysis = useDeleteAnalysis();
  const exportPDF = useExportPDF();

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    try {
      const data = await analyze.mutateAsync(query.trim());
      setResult(data);
      setActiveTab("overview");
      setForecastData(null);
      setForecastError(null);
      setLayersData(null);
      setLayersError(null);
      setComparablesData(null);
      setComparablesError(null);
      setComparablesAsOf(null);
      setPredictionsData(null);
      setPredictionsError(null);
    } catch {
      toast.error(analyze.error?.message || "Failed to analyze market");
    }
  };

  const zipForTabs = result?.zipCode || null;

  async function loadForecast(zip: string, force = false) {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const url = `/api/market-intelligence/forecast?zip=${encodeURIComponent(zip)}${force ? '&force=1' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load forecast");
      setForecastData(data);
    } catch (e) {
      setForecastError(e instanceof Error ? e.message : "Failed to load forecast");
      setForecastData(null);
    } finally {
      setForecastLoading(false);
    }
  }

  async function loadLayers(zip: string, force = false) {
    setLayersLoading(true);
    setLayersError(null);
    try {
      const url = `/api/market-intelligence/layers?zip=${encodeURIComponent(zip)}${force ? '&force=1' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load layers");
      setLayersData(data.layers ?? []);
    } catch (e) {
      setLayersError(e instanceof Error ? e.message : "Failed to load layers");
      setLayersData(null);
    } finally {
      setLayersLoading(false);
    }
  }

  async function loadComparables(zip: string) {
    setComparablesLoading(true);
    setComparablesError(null);
    try {
      const res = await fetch(`/api/market-intelligence/comparables?zip=${encodeURIComponent(zip)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load comparable zips");
      setComparablesData(data.comparables ?? []);
      setComparablesAsOf(data.as_of_date ?? null);
    } catch (e) {
      setComparablesError(e instanceof Error ? e.message : "Failed to load comparable zips");
      setComparablesData(null);
      setComparablesAsOf(null);
    } finally {
      setComparablesLoading(false);
    }
  }

  async function loadPredictions(zip: string, force = false) {
    setPredictionsLoading(true);
    setPredictionsError(null);
    try {
      const res = await fetch(`/api/predictions?zip=${encodeURIComponent(zip)}${force ? '&force=1' : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load predictions");
      setPredictionsData(data.predictions ?? []);
    } catch (e) {
      setPredictionsError(e instanceof Error ? e.message : "Failed to load predictions");
      setPredictionsData(null);
    } finally {
      setPredictionsLoading(false);
    }
  }

  useEffect(() => {
    if (!zipForTabs) return;
    if (activeTab === "forecast" && !forecastLoading && forecastData == null && !forecastError) {
      void loadForecast(zipForTabs);
    }
    if (activeTab === "layers" && !layersLoading && layersData == null && !layersError) {
      void loadLayers(zipForTabs);
    }
    if (activeTab === "comparables" && !comparablesLoading && comparablesData == null && !comparablesError) {
      void loadComparables(zipForTabs);
    }
    if (activeTab === "predictions" && !predictionsLoading && predictionsData == null && !predictionsError) {
      void loadPredictions(zipForTabs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, zipForTabs]);

  const forecastSeries = useMemo(() => {
    const series = forecastData?.forecast?.predicted_series;
    if (!Array.isArray(series)) return [];
    return series
      .map((p: any) => ({
        date: String(p.date ?? p.ds ?? ""),
        y: typeof p.y === "number" ? p.y : typeof p.yhat === "number" ? p.yhat : null,
        lower: typeof p.lower === "number" ? p.lower : typeof p.yhat_lower === "number" ? p.yhat_lower : null,
        upper: typeof p.upper === "number" ? p.upper : typeof p.yhat_upper === "number" ? p.yhat_upper : null,
      }))
      .filter((p: any) => p.date && p.y != null);
  }, [forecastData]);

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveAnalysis.mutateAsync(result);
      toast.success("Analysis saved to dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save analysis";
      toast.error(message);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    try {
      await exportPDF.mutateAsync(result);
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export report");
    }
  };

  const handleLoadSaved = (saved: { market_data: MarketAnalysisResult }) => {
    setResult(saved.market_data);
    setQuery(saved.market_data.zipCode || "");
  };

  // Chart data prep
  const priceHistoryData = result?.rentCast.history
    .filter(h => h.medianPrice)
    .map(h => ({
      date: new Date(h.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      price: h.medianPrice,
    })) || [];

  const listingsHistoryData = result?.rentCast.history
    .filter(h => h.activeListings)
    .map(h => ({
      date: new Date(h.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      listings: h.activeListings,
      newListings: h.newListings,
    })) || [];

  const domHistoryData = result?.rentCast.history
    .filter(h => h.averageDaysOnMarket)
    .map(h => ({
      date: new Date(h.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dom: h.averageDaysOnMarket,
    })) || [];

  const mortgageHistoryData = result?.fred.history.map(h => ({
    date: new Date(h.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    rate: h.value,
  })) || [];

  const radarData = result
    ? Object.values(result.ariaScore.breakdown).map(b => ({
        factor: b.label.replace("Market ", "").replace("Listing ", "List. "),
        score: b.score,
        fullMark: 100,
      }))
    : [];

  return (
    <DashboardLayout
      title="Market Intelligence"
      subtitle="AI-powered real estate market insights for brokers"
    >
      {/* Search Section */}
      <Card className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-blue-500/5 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold text-gray-900">
                ARIA Market Score™
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Enter a US City or Zip Code to get instant market analysis
            </p>
            <div className="flex gap-3 max-w-lg mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="e.g. West Palm Beach or 33401"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="pl-10 h-12 bg-white border-app text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyze.isPending || !query.trim()}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {analyze.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Analyze Market
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Compare Markets Link */}
      <div className="flex justify-center">
        <Link href="/dashboard/market-intelligence/compare">
          <Button className="gap-2 h-12 px-8 bg-gradient-to-r from-primary to-emerald-600 hover:from-emerald-600 hover:to-primary text-white font-semibold shadow-md hover:shadow-lg transition-all">
            <Trophy className="w-5 h-5" />
            Market Battle — Compare Zip Codes Side-by-Side
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {analyze.isPending && (
        <Card className="app-card">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Market Data...</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Gathering live market data, computing ARIA Score,
              and generating AI insights.
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {["Pricing", "Rates", "Demographics", "Inflation", "AI Engine"].map((s) => (
                <Badge key={s} className="animate-pulse text-xs bg-primary/10 text-primary border border-primary/20">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {analyze.isError && (
        <Card className="app-card border-red-200">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Analysis Failed</h3>
            <p className="text-sm text-red-600">{analyze.error?.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !analyze.isPending && (
        <div className="min-w-0 w-full overflow-hidden space-y-6">
          {/* Header Row — Score + Market Type */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* ARIA Score */}
            <Card className="app-card lg:col-span-3">
              <CardContent className="pt-6 flex flex-col items-center">
                <ARIAScoreRing score={result.ariaScore.total} />
                <h3 className="text-sm font-semibold text-gray-900 mt-3">ARIA Market Score™</h3>
                <p className="text-xs text-gray-500">Proprietary composite rating</p>
              </CardContent>
            </Card>

            {/* Location + Market Type */}
            <Card className="app-card lg:col-span-5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-gray-900">
                      {result.location}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {result.zipCode} {result.state ? `• ${result.state}` : ""}
                    </p>
                  </div>
                </div>
                {(() => {
                  const mt = getMarketTypeStyles(result.marketType.type);
                  return (
                    <div className={`rounded-xl border p-4 ${mt.bg}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{mt.icon}</span>
                        <span className={`text-lg font-bold ${mt.color}`}>
                          {result.marketType.label} Market
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">{result.marketType.description}</p>
                    </div>
                  );
                })()}
                {/* Data Sources */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <DataSourceBadge name="Pricing Data" active={result.dataSourceStatus.rentCast} />
                  <DataSourceBadge name="Mortgage Rates" active={result.dataSourceStatus.fred} />
                  <DataSourceBadge name="Demographics" active={result.dataSourceStatus.census} />
                  <DataSourceBadge name="Inflation" active={result.dataSourceStatus.bls} />
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="app-card lg:col-span-4">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Save this analysis or export a professional PDF report for your clients.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                    className="w-full bg-white border-gray-300 hover:bg-gray-50 text-gray-800"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export PDF Report
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    disabled={saveAnalysis.isPending}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    {saveAnalysis.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Save to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={DollarSign}
              label="Median Price"
              value={formatCurrency(result.rentCast.medianPrice)}
              subtitle={result.rentCast.medianPricePerSqFt ? `$${result.rentCast.medianPricePerSqFt.toFixed(0)}/sqft` : undefined}
            />
            <MetricCard
              icon={Building}
              label="Active Listings"
              value={formatNumber(result.rentCast.activeListings)}
              subtitle={result.rentCast.newListings ? `${result.rentCast.newListings} new` : undefined}
            />
            <MetricCard
              icon={Clock}
              label="Avg Days on Market"
              value={result.rentCast.averageDaysOnMarket?.toString() || "N/A"}
              trend={result.rentCast.averageDaysOnMarket
                ? result.rentCast.averageDaysOnMarket < 30 ? "down" : result.rentCast.averageDaysOnMarket > 60 ? "up" : "stable"
                : null}
            />
            <MetricCard
              icon={BarChart3}
              label="Months of Supply"
              value={
                result.ariaScore.breakdown.inventoryHealth.raw != null
                  ? result.ariaScore.breakdown.inventoryHealth.raw.toFixed(1)
                  : "N/A"
              }
            />
            <MetricCard
              icon={Percent}
              label="Mortgage Rate"
              value={result.fred.currentMortgageRate ? `${result.fred.currentMortgageRate}%` : "N/A"}
              subtitle={result.fred.rateChange ? `${result.fred.rateChange > 0 ? "+" : ""}${result.fred.rateChange}% vs last week` : undefined}
              trend={result.fred.rateTrend === "up" ? "up" : result.fred.rateTrend === "down" ? "down" : "stable"}
            />
            <MetricCard
              icon={DollarSign}
              label="Median Income"
              value={formatCurrency(result.census.medianIncome)}
            />
            <MetricCard
              icon={UsersIcon}
              label="Population"
              value={formatNumber(result.census.population)}
            />
            <MetricCard
              icon={TrendingUp}
              label="Inflation Rate"
              value={result.bls.inflationRate ? `${result.bls.inflationRate}%` : "N/A"}
              trend={result.bls.inflationRate ? (result.bls.inflationRate > 3 ? "up" : result.bls.inflationRate < 2 ? "down" : "stable") : null}
            />
          </div>

          {/* AI Recommendation — Full Width */}
          <Card className="app-card overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">AI Market Recommendation</h3>
                  <p className="text-xs text-gray-500">AI-powered insights for brokers</p>
                </div>
              </div>
              <p className="text-base text-gray-800 leading-relaxed">
                {result.aiSummary}
              </p>
            </div>
          </Card>

          {/* Charts Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
            <TabsList className="bg-white border border-gray-200 shadow-sm p-1 h-auto rounded-xl flex flex-wrap">
              <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="forecast" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">90‑Day Forecast</TabsTrigger>
              <TabsTrigger value="layers" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Intelligence Layers</TabsTrigger>
              <TabsTrigger value="comparables" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Comparable ZIPs</TabsTrigger>
              <TabsTrigger value="predictions" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Predictions</TabsTrigger>
              <TabsTrigger value="pricing" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Price Trends</TabsTrigger>
              <TabsTrigger value="inventory" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Inventory</TabsTrigger>
              <TabsTrigger value="rates" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm">Mortgage Rates</TabsTrigger>
            </TabsList>

            {/* Overview Tab — Radar + Score Breakdown */}
            <TabsContent value="overview">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      ARIA Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <PolarAngleAxis
                            dataKey="factor"
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "#9ca3af", fontSize: 10 }}
                          />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No data available for radar chart
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Score Breakdown List */}
                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Factor Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.values(result.ariaScore.breakdown).map((factor) => (
                      <div key={factor.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-900">{factor.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">{factor.weight}% weight</span>
                            <span className={`text-sm font-bold ${getScoreColor(factor.score)}`}>{factor.score}</span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getScoreGradient(factor.score)} transition-all duration-1000`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        {factor.raw !== null && (
                          <p className="text-xs text-gray-500 mt-1">
                            {factor.label === "Price Trend" && `${factor.raw > 0 ? "+" : ""}${factor.raw}% YoY`}
                            {factor.label === "Inventory Health" && `${factor.raw} months of supply`}
                            {factor.label === "Market Velocity" && `${factor.raw} avg days on market`}
                            {factor.label === "Affordability" && `${factor.raw}x price-to-income ratio`}
                            {factor.label === "Listing Activity" && `${factor.raw} new listings`}
                            {factor.label === "Rate Impact" && `${factor.raw}% mortgage rate`}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab 2: 90-Day Forecast (Supabase-backed) */}
            <TabsContent value="forecast">
              <Card className="app-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        90‑Day Price Forecast
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">Projection for ZIP {result.zipCode}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => zipForTabs && loadForecast(zipForTabs, true)}
                      disabled={!zipForTabs || forecastLoading}
                    >
                      {forecastLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {forecastError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {forecastError}
                    </div>
                  )}

                  {!forecastError && forecastLoading && !forecastData && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}

                  {!forecastError && forecastData && (() => {
                    const daysCollected = Number(forecastData.days_collected ?? 0);
                    const requiredDays = Number(forecastData.required_days ?? 180);
                    const hasEnough = daysCollected >= requiredDays;
                    const hasLiveForecast = forecastSeries.length > 0;

                    if (!hasEnough && !hasLiveForecast) {
                      const pct = clamp(Math.round((daysCollected / Math.max(1, requiredDays)) * 100), 0, 100);
                      const remaining = Math.max(0, requiredDays - daysCollected);
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-900">Collecting data</span>
                            <span className="text-gray-500">{daysCollected}/{requiredDays} days</span>
                          </div>
                          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-500">
                            Predictions available in {remaining} days.
                          </p>
                        </div>
                      );
                    }

                    const isLiveTrend = !hasEnough && hasLiveForecast;

                    const fc = forecastData.forecast;
                    const conf = fc?.confidence_pct != null ? `${Number(fc.confidence_pct).toFixed(0)}%` : "—";
                    const change = fc?.predicted_change_pct != null ? `${Number(fc.predicted_change_pct).toFixed(1)}%` : "—";
                    const endVal = fc?.predicted_value_end != null ? `$${Math.round(Number(fc.predicted_value_end)).toLocaleString()}` : "—";
                    const endDate = fc?.end_date ? new Date(fc.end_date).toLocaleDateString() : "—";

                    return (
                      <div className="space-y-4">
                        {isLiveTrend && (
                          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                            <Activity className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 leading-relaxed">
                              <span className="font-semibold">Live trendline forecast</span> — Historical dataset is building in the background ({daysCollected}/{requiredDays} days collected). Accuracy improves as more data is gathered.
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                            Prediction: <span className="font-semibold ml-1 text-gray-900">{change} → {endVal}</span> by {endDate}
                          </Badge>
                          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                            Confidence: <span className="font-semibold ml-1 text-gray-900">{conf}</span>
                          </Badge>
                        </div>

                        {forecastSeries.length > 0 ? (
                          <ResponsiveContainer width="100%" height={360}>
                            <AreaChart data={forecastSeries}>
                              <defs>
                                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="forecastLine" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}K`} />
                              <Tooltip
                                formatter={(value: number, name: string) => {
                                  const label = name === "upper" ? "Upper" : name === "lower" ? "Lower" : "Forecast";
                                  return [`$${Math.round(value).toLocaleString()}`, label];
                                }}
                                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                              />
                              <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#forecastBand)" fillOpacity={1} />
                              <Area type="monotone" dataKey="lower" stroke="transparent" fill="#ffffff" fillOpacity={1} />
                              <Area type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2.5} fill="url(#forecastLine)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[320px] flex items-center justify-center text-gray-500">
                            Forecast series not available yet.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Intelligence Layers (Supabase-backed) */}
            <TabsContent value="layers">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Intelligence Layers</h3>
                    <p className="text-xs text-gray-500">Signals and context for ZIP {result.zipCode}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => zipForTabs && loadLayers(zipForTabs, true)}
                    disabled={!zipForTabs || layersLoading}
                  >
                    {layersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                  </Button>
                </div>

                {layersError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {layersError}
                  </div>
                )}

                {!layersError && layersLoading && !layersData && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {!layersError && layersData && layersData.length === 0 && (
                  <Card className="app-card">
                    <CardContent className="py-10 text-center text-gray-500">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No intelligence layers yet for this ZIP.
                      <p className="text-xs mt-1 text-gray-400">Run the nightly pipeline to populate layers.</p>
                    </CardContent>
                  </Card>
                )}

                {!layersError && layersData && layersData.length > 0 && (
                  <div className="space-y-3">
                    {[
                      { key: "crime", title: "Crime Intelligence", accent: "text-red-600", bg: "bg-red-50", icon: TrendingDown },
                      { key: "grid", title: "Grid & Infrastructure", accent: "text-amber-700", bg: "bg-amber-50", icon: Zap },
                      { key: "news", title: "News Signals", accent: "text-violet-700", bg: "bg-violet-50", icon: Sparkles },
                      { key: "people", title: "People & Demographics", accent: "text-emerald-700", bg: "bg-emerald-50", icon: UsersIcon },
                    ].map((meta) => {
                      const row = layersData.find((l: any) => l.layer_key === meta.key) ?? null;
                      const open = !!openLayerKeys[meta.key];
                      return (
                        <Card key={meta.key} className="app-card overflow-hidden">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setOpenLayerKeys((s) => ({ ...s, [meta.key]: !s[meta.key] }))}
                          >
                            <CardHeader className="py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                                    <meta.icon className={`w-5 h-5 ${meta.accent}`} />
                                  </div>
                                  <div>
                                    <CardTitle className="text-sm text-gray-900">{meta.title}</CardTitle>
                                    <p className="text-xs text-gray-500">
                                      {row?.headline || (row ? `As of ${row.as_of_date}` : "Not available yet")}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
                              </div>
                            </CardHeader>
                          </button>
                          {open && (
                            <CardContent className="pt-0 pb-5">
                              {row ? (
                                <div className="pt-1">
                                  {row.headline && (
                                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{row.headline}</p>
                                  )}
                                  {renderLayerDetail(meta.key, row)}
                                  {row.badge && (
                                    <div className="mt-4">
                                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">{row.badge}</Badge>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-sm text-gray-400">
                                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                  Not available yet for this ZIP.
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 4: Comparable ZIPs (Supabase-backed) */}
            <TabsContent value="comparables">
              <Card className="app-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        Comparable ZIPs
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        Ranked similarity list for ZIP {result.zipCode}{comparablesAsOf ? ` (as of ${comparablesAsOf})` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => zipForTabs && loadComparables(zipForTabs)}
                      disabled={!zipForTabs || comparablesLoading}
                    >
                      {comparablesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {comparablesError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {comparablesError}
                    </div>
                  )}

                  {!comparablesError && comparablesLoading && !comparablesData && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}

                  {!comparablesError && comparablesData && comparablesData.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                      No comparable ZIPs yet for this market.
                      <p className="text-xs mt-1 text-gray-400">Run the nightly pipeline to populate comparables.</p>
                    </div>
                  )}

                  {!comparablesError && comparablesData && comparablesData.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                            <th className="py-2 pr-4">Rank</th>
                            <th className="py-2 pr-4">ZIP</th>
                            <th className="py-2 pr-4">City</th>
                            <th className="py-2 pr-4">ARIA</th>
                            <th className="py-2 pr-4">Trend</th>
                            <th className="py-2 pr-2">Median Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparablesData.map((r: any, idx: number) => {
                            const isBase = String(r.zip) === String(result.zipCode);
                            const trend = r.trend === "up" ? "↑" : r.trend === "down" ? "↓" : "→";
                            return (
                              <tr
                                key={`${r.zip}-${idx}`}
                                className={`border-b border-gray-100 ${isBase ? "bg-primary/5" : "hover:bg-gray-50"}`}
                              >
                                <td className="py-2 pr-4 text-gray-500">{r.rank ?? idx + 1}</td>
                                <td className="py-2 pr-4 font-semibold text-gray-900">
                                  {r.zip} {isBase ? <span className="text-xs text-primary ml-1">• current</span> : null}
                                </td>
                                <td className="py-2 pr-4 text-gray-700">{r.city ? `${r.city}${r.state ? `, ${r.state}` : ""}` : "—"}</td>
                                <td className="py-2 pr-4">
                                  <span className={`font-bold ${getScoreColor(Number(r.aria_score ?? 0))}`}>
                                    {r.aria_score ?? "—"}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-gray-700">{trend}</td>
                                <td className="py-2 pr-2 text-gray-900">{r.median_price != null ? `$${Math.round(Number(r.median_price)).toLocaleString()}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Prediction Models</h3>
                    <p className="text-sm text-gray-500 mt-0.5">7 models analyzing price, population, grid, neighborhood, sellers, volatility, and cross-industry signals</p>
                  </div>
                  {zipForTabs && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => loadPredictions(zipForTabs, true)}
                      disabled={predictionsLoading}
                      className="gap-1.5"
                    >
                      {predictionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                      Refresh
                    </Button>
                  )}
                </div>

                {predictionsError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{predictionsError}</p>
                  </div>
                )}

                {!predictionsError && predictionsLoading && !predictionsData && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span className="text-sm text-gray-500">Computing predictions...</span>
                  </div>
                )}

                {!predictionsError && predictionsData && predictionsData.length === 0 && (
                  <Card className="app-card">
                    <CardContent className="py-10 text-center">
                      <Target className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500">No prediction data available yet for this ZIP.</p>
                      <p className="text-xs text-gray-400 mt-1">Data needs to be collected for a few days before predictions can be generated.</p>
                    </CardContent>
                  </Card>
                )}

                {!predictionsError && predictionsData && predictionsData.length > 0 && (() => {
                  const MODEL_META: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
                    cross_industry: { icon: Trophy, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
                    price_forecast: { icon: TrendingUp, color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
                    population_migration: { icon: UsersIcon, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                    grid_demand: { icon: Zap, color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
                    neighborhood_trajectory: { icon: MapPin, color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
                    motivated_seller_agg: { icon: Target, color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                    market_volatility: { icon: Activity, color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
                  };

                  const MODEL_LABELS: Record<string, string> = {
                    cross_industry: 'Cross-Industry Momentum',
                    price_forecast: 'Real Estate Price Forecast',
                    population_migration: 'Population & Migration',
                    grid_demand: 'Grid & Infrastructure Demand',
                    neighborhood_trajectory: 'Neighborhood Trajectory',
                    motivated_seller_agg: 'Motivated Seller Aggregate',
                    market_volatility: 'Market Volatility',
                  };

                  const ORDER = ['cross_industry', 'price_forecast', 'neighborhood_trajectory', 'population_migration', 'market_volatility', 'grid_demand', 'motivated_seller_agg'];

                  const sorted = [...predictionsData].sort((a, b) => {
                    const ai = ORDER.indexOf(a.model_key);
                    const bi = ORDER.indexOf(b.model_key);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  });

                  // Cross-industry card (full width at top)
                  const crossModel = sorted.find((p) => p.model_key === 'cross_industry');
                  const otherModels = sorted.filter((p) => p.model_key !== 'cross_industry');

                  const dirColor = (d: string) => d === 'up' ? 'text-emerald-600' : d === 'down' ? 'text-red-600' : 'text-amber-600';
                  const dirBg = (d: string) => d === 'up' ? 'bg-emerald-50 border-emerald-200' : d === 'down' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
                  const dirArrow = (d: string) => d === 'up' ? <ArrowUpRight className="w-4 h-4" /> : d === 'down' ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />;

                  return (
                    <div className="space-y-4">
                      {crossModel && (() => {
                        const meta = MODEL_META[crossModel.model_key] ?? { icon: Activity, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
                        const Icon = meta.icon;
                        const payload = crossModel.payload ?? {};
                        const recommendation = payload.recommendation ?? 'HOLD';
                        const recColor = recommendation === 'BUY' ? 'bg-emerald-600 text-white' : recommendation === 'SELL' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800';

                        return (
                          <Card className={`border-2 ${meta.borderColor} ${meta.bgColor}`}>
                            <CardContent className="pt-6 pb-5">
                              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                <div className={`w-16 h-16 rounded-2xl ${meta.bgColor} border ${meta.borderColor} flex items-center justify-center shrink-0`}>
                                  <Icon className={`w-8 h-8 ${meta.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`text-lg font-bold ${meta.color}`}>Market Momentum Score</h3>
                                    <Badge className={`${recColor} text-xs font-bold px-2.5`}>{recommendation}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{crossModel.headline}</p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <div className="text-center">
                                    <div className={`text-4xl font-bold ${meta.color}`}>{Math.round(crossModel.score)}</div>
                                    <div className="text-xs text-gray-500">Score</div>
                                  </div>
                                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-semibold ${dirBg(crossModel.direction)} ${dirColor(crossModel.direction)}`}>
                                    {dirArrow(crossModel.direction)}
                                    {crossModel.direction}
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-gray-700">{Math.round(crossModel.confidence_pct)}%</div>
                                    <div className="text-xs text-gray-500">Confidence</div>
                                  </div>
                                </div>
                              </div>

                              {payload.topDrivers && payload.topDrivers.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                  {payload.topDrivers.map((d: any, i: number) => (
                                    <div key={i} className="rounded-lg border border-white/80 bg-white/60 p-2.5 text-center">
                                      <div className="text-xs text-gray-500 truncate">{d.model}</div>
                                      <div className="text-lg font-bold text-gray-800">{Math.round(d.score)}</div>
                                      <div className={`text-xs font-medium ${dirColor(d.direction)}`}>{d.direction}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })()}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {otherModels.map((pred) => {
                          const meta = MODEL_META[pred.model_key] ?? { icon: Activity, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
                          const Icon = meta.icon;
                          const label = MODEL_LABELS[pred.model_key] ?? pred.model_key;
                          const payload = pred.payload ?? {};

                          return (
                            <Card key={pred.model_key} className={`border ${meta.borderColor} hover:shadow-md transition-shadow`}>
                              <CardContent className="pt-5 pb-4">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className={`w-10 h-10 rounded-xl ${meta.bgColor} border ${meta.borderColor} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-5 h-5 ${meta.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900">{label}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pred.headline}</p>
                                  </div>
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${dirBg(pred.direction)} ${dirColor(pred.direction)}`}>
                                    {dirArrow(pred.direction)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-gray-500">Score</span>
                                      <span className="font-semibold text-gray-900">{Math.round(pred.score)}/100</span>
                                    </div>
                                    <Progress value={pred.score} className="h-2" />
                                  </div>
                                  <div className="text-center px-3 shrink-0">
                                    <div className="text-sm font-bold text-gray-700">{Math.round(pred.confidence_pct)}%</div>
                                    <div className="text-[10px] text-gray-400">Confidence</div>
                                  </div>
                                </div>

                                {/* Model-specific details */}
                                {pred.model_key === 'price_forecast' && payload.series && (
                                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-2">
                                    <ResponsiveContainer width="100%" height={80}>
                                      <AreaChart data={payload.series.slice(-13)}>
                                        <Area type="monotone" dataKey="y" stroke="#10b981" fill="#10b98120" strokeWidth={1.5} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}

                                {pred.model_key === 'neighborhood_trajectory' && payload.stage && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <Badge className={`text-xs ${
                                      payload.stage.includes('Gentrification') ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                      payload.stage === 'Decline' ? 'bg-red-100 text-red-800 border-red-200' :
                                      'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                      {payload.stage}
                                    </Badge>
                                    {payload.recommendation && (
                                      <Badge className={`text-xs ${
                                        payload.recommendation === 'BUY' ? 'bg-emerald-600 text-white' :
                                        payload.recommendation === 'SELL' ? 'bg-red-600 text-white' :
                                        'bg-amber-100 text-amber-800'
                                      }`}>
                                        {payload.recommendation}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {pred.model_key === 'market_volatility' && payload.level && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <Badge className={`text-xs ${
                                      payload.level === 'Low' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                      payload.level === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                                      'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                      {payload.level} Volatility
                                    </Badge>
                                    <span className="text-xs text-gray-500">{payload.avgDailySwingPct?.toFixed(1)}% avg swing</span>
                                  </div>
                                )}

                                {pred.model_key === 'grid_demand' && payload.riskLevel && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <Badge className={`text-xs ${
                                      payload.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                      payload.riskLevel === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                                      'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                      {payload.riskLevel} Risk
                                    </Badge>
                                    <span className="text-xs text-gray-500">{payload.capacityUtilPct?.toFixed(0)}% capacity</span>
                                  </div>
                                )}

                                {pred.model_key === 'motivated_seller_agg' && (
                                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg bg-red-50 border border-red-100 p-1.5">
                                      <div className="text-sm font-bold text-red-700">{payload.highCount ?? 0}</div>
                                      <div className="text-[10px] text-red-500">High</div>
                                    </div>
                                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-1.5">
                                      <div className="text-sm font-bold text-amber-700">{payload.moderateCount ?? 0}</div>
                                      <div className="text-[10px] text-amber-500">Moderate</div>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-1.5">
                                      <div className="text-sm font-bold text-emerald-700">{payload.lowCount ?? 0}</div>
                                      <div className="text-[10px] text-emerald-500">Low</div>
                                    </div>
                                  </div>
                                )}

                                {pred.model_key === 'population_migration' && payload.factors && (
                                  <div className="mt-3 space-y-1">
                                    {payload.factors.slice(0, 3).map((f: any, i: number) => (
                                      <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">{f.name}</span>
                                        <span className={`font-medium ${dirColor(f.signal)}`}>
                                          {typeof f.value === 'number' ? f.value.toLocaleString() : f.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-3 text-[10px] text-gray-400 text-right">
                                  {pred.predicted_at ? new Date(pred.predicted_at).toLocaleDateString() : ''}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Median Home Price Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {priceHistoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={priceHistoryData}>
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Median Price"]}
                          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                        <Area
                          type="monotone" dataKey="price"
                          stroke="#10b981" strokeWidth={2.5}
                          fill="url(#priceGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex flex-col items-center justify-center text-gray-500">
                      <Home className="w-12 h-12 mb-3 opacity-30" />
                      <p>Price history data not available yet</p>
                      <p className="text-xs mt-1">Run a market analysis to collect historical data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary" />
                      Listings Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {listingsHistoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={listingsHistoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Bar dataKey="listings" name="Total Listings" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="newListings" name="New Listings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        Listings data not available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Days on Market Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {domHistoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={domHistoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Line
                            type="monotone" dataKey="dom" name="Avg DOM"
                            stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        Days on market data not available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Mortgage Rate Tab */}
            <TabsContent value="rates">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" />
                    30-Year Fixed Mortgage Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mortgageHistoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={mortgageHistoryData}>
                        <defs>
                          <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                          tickFormatter={(v) => `${v}%`}
                          domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, "30yr Rate"]}
                          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                        <Area
                          type="monotone" dataKey="rate"
                          stroke="#3b82f6" strokeWidth={2.5}
                          fill="url(#rateGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-500">
                      Mortgage rate data not available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Price Range Bar */}
          {result.rentCast.minPrice && result.rentCast.maxPrice && (
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" />
                  Price Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Min: {formatCurrency(result.rentCast.minPrice)}</span>
                    <span className="font-semibold text-gray-900">
                      Median: {formatCurrency(result.rentCast.medianPrice)}
                    </span>
                    <span className="text-gray-600">Max: {formatCurrency(result.rentCast.maxPrice)}</span>
                  </div>
                  <div className="relative h-4 bg-gradient-to-r from-emerald-100 via-emerald-300 to-emerald-500 rounded-full overflow-hidden">
                    {result.rentCast.medianPrice && result.rentCast.maxPrice && result.rentCast.minPrice && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white border-2 border-emerald-700 rounded-full shadow-lg"
                        style={{
                          left: `${((result.rentCast.medianPrice - result.rentCast.minPrice) /
                            (result.rentCast.maxPrice - result.rentCast.minPrice)) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Avg Price/SqFt</p>
                      <p className="text-lg font-bold text-gray-900">
                        {result.rentCast.medianPricePerSqFt ? `$${result.rentCast.medianPricePerSqFt.toFixed(0)}` : "N/A"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Avg Sq Footage</p>
                      <p className="text-lg font-bold text-gray-900">
                        {result.rentCast.averageSquareFootage ? `${formatNumber(Math.round(result.rentCast.averageSquareFootage))}` : "N/A"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Price-to-Income</p>
                      <p className="text-lg font-bold text-gray-900">
                        {result.rentCast.medianPrice && result.census.medianIncome
                          ? `${(result.rentCast.medianPrice / result.census.medianIncome).toFixed(1)}x`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Saved Analyses */}
      <Card className="app-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-gray-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" />
              Saved Analyses
            </CardTitle>
            {savedAnalyses && savedAnalyses.length > 0 && (
              <Badge variant="outline" className="text-xs">{savedAnalyses.length} saved</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {savedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !savedAnalyses || savedAnalyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-gray-500">No saved analyses yet</p>
              <p className="text-xs mt-1 text-gray-400">Run a market analysis and click &quot;Save&quot; to store it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedAnalyses.map((saved) => {
                const mt = getMarketTypeStyles(saved.market_type || "balanced");
                return (
                  <div
                    key={saved.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                    onClick={() => handleLoadSaved(saved)}
                  >
                    <div className={`w-12 h-12 rounded-xl ${getScoreBg(saved.aria_score)} flex items-center justify-center shrink-0`}>
                      <span className={`text-lg font-bold ${getScoreColor(saved.aria_score)}`}>{saved.aria_score}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span className="font-semibold text-gray-900 text-sm">{saved.location}</span>
                        <Badge variant="outline" className={`text-[10px] ${mt.bg} ${mt.color} border`}>
                          {mt.icon} {saved.market_type || "N/A"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{saved.ai_summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">
                        {new Date(saved.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost" size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnalysis.mutate(saved.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
