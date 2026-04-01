"use client";

import { useState } from "react";
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
        <span className="text-xs text-app-muted font-medium">/100</span>
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
      <p className="text-xs text-app-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-app-foreground">{value}</p>
      {subtitle && <p className="text-xs text-app-muted mt-1">{subtitle}</p>}
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

// ─── Main Page Component ───────────────────────────────────────────────
export default function MarketIntelligencePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MarketAnalysisResult | null>(null);

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
    } catch {
      toast.error(analyze.error?.message || "Failed to analyze market");
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveAnalysis.mutateAsync(result);
      toast.success("Analysis saved to dashboard");
    } catch {
      toast.error("Failed to save analysis");
    }
  };

  const handleExport = () => {
    if (!result) return;
    exportPDF.mutate(result);
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
      subtitle="AI-powered market insights with live data from RentCast, FRED, Census & BLS"
    >
      {/* Search Section */}
      <Card className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-blue-500/5 p-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold text-app-foreground">
                ARIA Market Score™
              </h2>
            </div>
            <p className="text-sm text-app-muted mb-6">
              Enter a City, Zip Code, or County to get instant market analysis
            </p>
            <div className="flex gap-3 max-w-lg mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
                <Input
                  placeholder="e.g. West Palm Beach, 33401, or Miami-Dade"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="pl-10 h-12 bg-white border-app text-app-foreground"
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

      {/* Loading State */}
      {analyze.isPending && (
        <Card className="app-card">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-app-foreground mb-2">Analyzing Market Data...</h3>
            <p className="text-sm text-app-muted max-w-md mx-auto">
              Pulling live data from RentCast, FRED, Census & BLS, computing ARIA Score,
              and generating AI insights with Claude.
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {["RentCast", "FRED", "Census", "BLS", "Claude AI"].map((s) => (
                <Badge key={s} variant="outline" className="animate-pulse text-xs">
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
            <h3 className="text-lg font-semibold text-app-foreground mb-1">Analysis Failed</h3>
            <p className="text-sm text-red-600">{analyze.error?.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !analyze.isPending && (
        <>
          {/* Header Row — Score + Market Type + Actions */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* ARIA Score */}
            <Card className="app-card lg:col-span-3">
              <CardContent className="pt-6 flex flex-col items-center">
                <ARIAScoreRing score={result.ariaScore.total} />
                <h3 className="text-sm font-semibold text-app-foreground mt-3">ARIA Market Score™</h3>
                <p className="text-xs text-app-muted">Proprietary composite rating</p>
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
                    <h2 className="text-xl font-display font-bold text-app-foreground">
                      {result.location}
                    </h2>
                    <p className="text-sm text-app-muted">
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
                      <p className="text-xs text-gray-600">{result.marketType.description}</p>
                    </div>
                  );
                })()}
                {/* Data Sources */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <DataSourceBadge name="RentCast" active={result.dataSourceStatus.rentCast} />
                  <DataSourceBadge name="FRED" active={result.dataSourceStatus.fred} />
                  <DataSourceBadge name="Census" active={result.dataSourceStatus.census} />
                  <DataSourceBadge name="BLS" active={result.dataSourceStatus.bls} />
                </div>
              </CardContent>
            </Card>

            {/* AI Summary + Actions */}
            <Card className="app-card lg:col-span-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-app-foreground">AI Recommendation</h3>
                  <Badge variant="outline" className="text-[10px] ml-auto">Claude</Badge>
                </div>
                <p className="text-sm text-app-muted leading-relaxed mb-4">
                  {result.aiSummary}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-app-card border-app hover:bg-app-muted text-app-foreground"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="outline"
                    size="sm"
                    disabled={saveAnalysis.isPending}
                    className="flex-1 bg-app-card border-app hover:bg-app-muted text-app-foreground"
                  >
                    {saveAnalysis.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Save
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
                result.rentCast.activeListings && result.rentCast.newListings
                  ? (result.rentCast.activeListings / result.rentCast.newListings).toFixed(1)
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

          {/* Charts Section */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-app-muted">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pricing">Price Trends</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="rates">Mortgage Rates</TabsTrigger>
            </TabsList>

            {/* Overview Tab — Radar + Score Breakdown */}
            <TabsContent value="overview">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
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
                      <div className="h-[300px] flex items-center justify-center text-app-muted">
                        No data available for radar chart
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Score Breakdown List */}
                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Factor Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.values(result.ariaScore.breakdown).map((factor) => (
                      <div key={factor.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-app-foreground">{factor.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-app-muted">{factor.weight}% weight</span>
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
                          <p className="text-xs text-app-muted mt-1">
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

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
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
                    <div className="h-[350px] flex flex-col items-center justify-center text-app-muted">
                      <Home className="w-12 h-12 mb-3 opacity-30" />
                      <p>Price history data not available</p>
                      <p className="text-xs mt-1">RentCast subscription required for historical data</p>
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
                    <CardTitle className="text-base flex items-center gap-2">
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
                      <div className="h-[300px] flex items-center justify-center text-app-muted">
                        Listings data not available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="app-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
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
                      <div className="h-[300px] flex items-center justify-center text-app-muted">
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" />
                    30-Year Fixed Mortgage Rate (FRED)
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
                    <div className="h-[350px] flex items-center justify-center text-app-muted">
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
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" />
                  Price Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-app-muted">Min: {formatCurrency(result.rentCast.minPrice)}</span>
                    <span className="font-semibold text-app-foreground">
                      Median: {formatCurrency(result.rentCast.medianPrice)}
                    </span>
                    <span className="text-app-muted">Max: {formatCurrency(result.rentCast.maxPrice)}</span>
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
                    <div className="text-center p-3 bg-app-muted rounded-lg">
                      <p className="text-xs text-app-muted">Avg Price/SqFt</p>
                      <p className="text-lg font-bold text-app-foreground">
                        {result.rentCast.medianPricePerSqFt ? `$${result.rentCast.medianPricePerSqFt.toFixed(0)}` : "N/A"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-app-muted rounded-lg">
                      <p className="text-xs text-app-muted">Avg Sq Footage</p>
                      <p className="text-lg font-bold text-app-foreground">
                        {result.rentCast.averageSquareFootage ? `${formatNumber(Math.round(result.rentCast.averageSquareFootage))}` : "N/A"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-app-muted rounded-lg">
                      <p className="text-xs text-app-muted">Price-to-Income</p>
                      <p className="text-lg font-bold text-app-foreground">
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
        </>
      )}

      {/* Saved Analyses */}
      <Card className="app-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
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
            <div className="text-center py-8 text-app-muted">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No saved analyses yet</p>
              <p className="text-xs mt-1">Run a market analysis and click &quot;Save&quot; to store it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedAnalyses.map((saved) => {
                const mt = getMarketTypeStyles(saved.market_type || "balanced");
                return (
                  <div
                    key={saved.id}
                    className="flex items-center gap-4 p-4 bg-app-muted rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => handleLoadSaved(saved)}
                  >
                    <div className={`w-12 h-12 rounded-xl ${getScoreBg(saved.aria_score)} flex items-center justify-center shrink-0`}>
                      <span className={`text-lg font-bold ${getScoreColor(saved.aria_score)}`}>{saved.aria_score}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span className="font-semibold text-app-foreground text-sm">{saved.location}</span>
                        <Badge variant="outline" className={`text-[10px] ${mt.bg} ${mt.color} border`}>
                          {mt.icon} {saved.market_type || "N/A"}
                        </Badge>
                      </div>
                      <p className="text-xs text-app-muted mt-1 truncate">{saved.ai_summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-app-muted">
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
                      <ChevronRight className="w-4 h-4 text-app-muted opacity-0 group-hover:opacity-100 transition-opacity" />
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
