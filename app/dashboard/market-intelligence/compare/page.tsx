"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  MapPin,
  Home,
  DollarSign,
  Clock,
  BarChart3,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { MarketAnalysisResult } from "@/lib/types/market-intelligence";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b"];
const COLOR_NAMES = ["Emerald", "Blue", "Amber"];
const MAX_ZIPS = 3;

export default function MarketBattlePage() {
  const [zipInputs, setZipInputs] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<(MarketAnalysisResult | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [error, setError] = useState<(string | null)[]>([]);

  const addZipSlot = () => {
    if (zipInputs.length < MAX_ZIPS) {
      setZipInputs([...zipInputs, ""]);
    }
  };

  const removeZipSlot = (idx: number) => {
    if (zipInputs.length <= 2) return;
    setZipInputs(zipInputs.filter((_, i) => i !== idx));
    setResults(results.filter((_, i) => i !== idx));
    setError(error.filter((_, i) => i !== idx));
    setLoading(loading.filter((_, i) => i !== idx));
  };

  const updateZip = (idx: number, value: string) => {
    const next = [...zipInputs];
    next[idx] = value;
    setZipInputs(next);
  };

  const analyzeAll = async () => {
    const validInputs = zipInputs.filter((z) => z.trim());
    if (validInputs.length < 2) {
      toast.error("Enter at least 2 zip codes to compare");
      return;
    }

    const newLoading = zipInputs.map((z) => !!z.trim());
    const newResults: (MarketAnalysisResult | null)[] = zipInputs.map(() => null);
    const newErrors: (string | null)[] = zipInputs.map(() => null);

    setLoading(newLoading);
    setResults(newResults);
    setError(newErrors);

    const promises = zipInputs.map(async (zip, idx) => {
      if (!zip.trim()) return;
      try {
        const res = await fetch("/api/market-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: zip.trim() }),
        });
        if (!res.ok) {
          const err = await res.json();
          newErrors[idx] = err.error || "Analysis failed";
        } else {
          newResults[idx] = await res.json();
        }
      } catch {
        newErrors[idx] = "Network error";
      }
    });

    await Promise.all(promises);
    setResults([...newResults]);
    setError([...newErrors]);
    setLoading(zipInputs.map(() => false));
  };

  const validResults = results.filter(Boolean) as MarketAnalysisResult[];
  const hasResults = validResults.length >= 2;

  // Find winner for each metric
  const getWinner = (
    extractor: (r: MarketAnalysisResult) => number | null,
    higherIsBetter = true
  ) => {
    if (!hasResults) return -1;
    let bestIdx = -1;
    let bestVal: number | null = null;
    validResults.forEach((r, i) => {
      const v = extractor(r);
      if (v == null) return;
      if (bestVal == null || (higherIsBetter ? v > bestVal : v < bestVal)) {
        bestVal = v;
        bestIdx = i;
      }
    });
    return bestIdx;
  };

  // Metric rows for comparison table
  const metrics = hasResults
    ? [
        {
          label: "ARIA Score",
          icon: Activity,
          values: validResults.map((r) => r.ariaScore.total),
          format: (v: number | null) => (v != null ? `${v}/100` : "N/A"),
          winner: getWinner((r) => r.ariaScore.total),
        },
        {
          label: "Median Price",
          icon: DollarSign,
          values: validResults.map((r) => r.rentCast.medianPrice),
          format: (v: number | null) =>
            v != null ? `$${v.toLocaleString()}` : "N/A",
          winner: getWinner((r) => r.rentCast.medianPrice),
        },
        {
          label: "Price / SqFt",
          icon: Home,
          values: validResults.map((r) => r.rentCast.medianPricePerSqFt),
          format: (v: number | null) =>
            v != null ? `$${v.toFixed(0)}` : "N/A",
          winner: -1,
        },
        {
          label: "Active Listings",
          icon: BarChart3,
          values: validResults.map((r) => r.rentCast.activeListings),
          format: (v: number | null) =>
            v != null ? v.toLocaleString() : "N/A",
          winner: getWinner((r) => r.rentCast.activeListings),
        },
        {
          label: "Avg Days on Market",
          icon: Clock,
          values: validResults.map((r) => r.rentCast.averageDaysOnMarket),
          format: (v: number | null) =>
            v != null ? `${v.toFixed(0)} days` : "N/A",
          winner: getWinner((r) => r.rentCast.averageDaysOnMarket, false),
        },
        {
          label: "Median Income",
          icon: DollarSign,
          values: validResults.map((r) => r.census.medianIncome),
          format: (v: number | null) =>
            v != null ? `$${v.toLocaleString()}` : "N/A",
          winner: getWinner((r) => r.census.medianIncome),
        },
        {
          label: "Population",
          icon: MapPin,
          values: validResults.map((r) => r.census.population),
          format: (v: number | null) =>
            v != null ? v.toLocaleString() : "N/A",
          winner: getWinner((r) => r.census.population),
        },
        {
          label: "Market Type",
          icon: TrendingUp,
          values: validResults.map((r) => r.marketType.label),
          format: (v: string | null) => v || "N/A",
          winner: -1,
        },
      ]
    : [];

  // Radar chart data combining all results
  const radarData = hasResults
    ? Object.keys(validResults[0].ariaScore.breakdown).map((key) => {
        const entry: Record<string, string | number> = {
          factor: validResults[0].ariaScore.breakdown[
            key as keyof typeof validResults[0]["ariaScore"]["breakdown"]
          ].label
            .replace("Market ", "")
            .replace("Listing ", "List. "),
        };
        validResults.forEach((r, i) => {
          entry[`zip${i}`] =
            r.ariaScore.breakdown[
              key as keyof typeof r["ariaScore"]["breakdown"]
            ].score;
        });
        return entry;
      })
    : [];

  // Price history overlay
  const priceHistoryOverlay = () => {
    if (!hasResults) return [];
    const dateMap = new Map<string, Record<string, number | null>>();
    validResults.forEach((r, i) => {
      r.rentCast.history.forEach((h) => {
        const dateKey = new Date(h.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {});
        dateMap.get(dateKey)![`zip${i}`] = h.medianPrice;
      });
    });
    return Array.from(dateMap.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  };

  // Bar chart data for key metrics
  const barChartData = hasResults
    ? [
        {
          metric: "ARIA Score",
          ...Object.fromEntries(
            validResults.map((r, i) => [`zip${i}`, r.ariaScore.total])
          ),
        },
        {
          metric: "Median Price ($K)",
          ...Object.fromEntries(
            validResults.map((r, i) => [
              `zip${i}`,
              r.rentCast.medianPrice
                ? Math.round(r.rentCast.medianPrice / 1000)
                : 0,
            ])
          ),
        },
        {
          metric: "Avg DOM",
          ...Object.fromEntries(
            validResults.map((r, i) => [
              `zip${i}`,
              r.rentCast.averageDaysOnMarket || 0,
            ])
          ),
        },
        {
          metric: "Income ($K)",
          ...Object.fromEntries(
            validResults.map((r, i) => [
              `zip${i}`,
              r.census.medianIncome
                ? Math.round(r.census.medianIncome / 1000)
                : 0,
            ])
          ),
        },
      ]
    : [];

  const anyLoading = loading.some(Boolean);

  return (
    <DashboardLayout
      title="Market Battle"
      subtitle="Compare zip codes head-to-head with ARIA Score, pricing, and market metrics"
    >
      {/* Back Link */}
      <div className="mb-4">
        <Link href="/dashboard/market-intelligence">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Market Intelligence
          </Button>
        </Link>
      </div>

      {/* Input Section */}
      <Card className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-blue-500/5 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold text-gray-900">
                Market Battle
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Enter 2-3 zip codes to compare side-by-side
            </p>

            <div className="space-y-3">
              {zipInputs.map((zip, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={`Zip code ${idx + 1} (e.g. ${["33401", "90210", "10001"][idx]})`}
                      value={zip}
                      onChange={(e) => updateZip(idx, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && analyzeAll()}
                      className="pl-10 h-11 bg-white border-app text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  {idx >= 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeZipSlot(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              {zipInputs.length < MAX_ZIPS && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addZipSlot}
                  className="gap-1 text-gray-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Zip Code
                </Button>
              )}
              <Button
                onClick={analyzeAll}
                disabled={anyLoading || zipInputs.filter((z) => z.trim()).length < 2}
                className="h-11 px-8 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {anyLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trophy className="w-4 h-4 mr-2" />
                )}
                Compare Markets
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {anyLoading && (
        <Card className="app-card">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Analyzing {zipInputs.filter((z) => z.trim()).length} Markets...
            </h3>
            <p className="text-sm text-gray-600">
              Fetching data from RentCast, FRED, Census & BLS for each location
            </p>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {error.some(Boolean) && (
        <div className="space-y-2">
          {error.map(
            (err, idx) =>
              err && (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3"
                >
                  <X className="w-4 h-4" />
                  <span>
                    <strong>{zipInputs[idx] || `Zip ${idx + 1}`}:</strong> {err}
                  </span>
                </div>
              )
          )}
        </div>
      )}

      {/* Results */}
      {hasResults && !anyLoading && (
        <>
          {/* Winner Banner */}
          {(() => {
            const ariaWinner = getWinner((r) => r.ariaScore.total);
            if (ariaWinner < 0) return null;
            const w = validResults[ariaWinner];
            return (
              <Card className="app-card border-2" style={{ borderColor: COLORS[ariaWinner] }}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8" style={{ color: COLORS[ariaWinner] }} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">
                        Highest ARIA Score
                      </p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {w.location} — {w.ariaScore.total}/100
                      </h3>
                      <Badge
                        className="mt-1"
                        style={{
                          backgroundColor: COLORS[ariaWinner] + "20",
                          color: COLORS[ariaWinner],
                        }}
                      >
                        {w.marketType.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* ARIA Score Cards Row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${validResults.length}, 1fr)` }}>
            {validResults.map((r, idx) => (
              <Card key={idx} className="app-card">
                <CardContent className="pt-6 text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <p className="text-sm font-medium text-gray-600 mb-1 truncate">
                    {r.location}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">{r.zipCode}</p>
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ color: COLORS[idx] }}
                  >
                    {r.ariaScore.total}
                  </div>
                  <p className="text-xs text-gray-500">ARIA Score</p>
                  <Badge
                    variant="outline"
                    className="mt-2"
                    style={{
                      borderColor: COLORS[idx],
                      color: COLORS[idx],
                    }}
                  >
                    {r.marketType.label}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Table */}
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Head-to-Head Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Metric
                      </th>
                      {validResults.map((r, idx) => (
                        <th key={idx} className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: COLORS[idx] }}
                            />
                            <span className="font-semibold text-gray-900 truncate max-w-[120px]">
                              {r.location}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m, mIdx) => (
                      <tr
                        key={mIdx}
                        className={
                          mIdx % 2 === 0
                            ? "bg-gray-50/50"
                            : "bg-white"
                        }
                      >
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          <div className="flex items-center gap-2">
                            <m.icon className="w-4 h-4 text-gray-400" />
                            {m.label}
                          </div>
                        </td>
                        {m.values.map((v, vIdx) => (
                          <td
                            key={vIdx}
                            className="text-center py-3 px-4"
                          >
                            <span
                              className={`font-semibold ${
                                m.winner === vIdx
                                  ? "text-primary"
                                  : "text-gray-900"
                              }`}
                            >
                              {m.format(v as never)}
                            </span>
                            {m.winner === vIdx && (
                              <Trophy className="w-3.5 h-3.5 text-primary inline ml-1" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Tabs defaultValue="radar" className="space-y-4">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="radar">ARIA Radar</TabsTrigger>
              <TabsTrigger value="bar">Key Metrics</TabsTrigger>
              <TabsTrigger value="price">Price History</TabsTrigger>
            </TabsList>

            {/* Radar Chart */}
            <TabsContent value="radar">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">
                    ARIA Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis
                        dataKey="factor"
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: "#9ca3af", fontSize: 10 }}
                      />
                      {validResults.map((r, idx) => (
                        <Radar
                          key={idx}
                          name={r.location}
                          dataKey={`zip${idx}`}
                          stroke={COLORS[idx]}
                          fill={COLORS[idx]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bar Chart */}
            <TabsContent value="bar">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">
                    Key Metrics Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="metric"
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      {validResults.map((r, idx) => (
                        <Bar
                          key={idx}
                          dataKey={`zip${idx}`}
                          name={r.location}
                          fill={COLORS[idx]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                      <Tooltip />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Price History Overlay */}
            <TabsContent value="price">
              <Card className="app-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">
                    Median Price Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {priceHistoryOverlay().length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={priceHistoryOverlay()}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 11 }}
                          tickFormatter={(v: number) =>
                            `$${(v / 1000).toFixed(0)}K`
                          }
                        />
                        {validResults.map((r, idx) => (
                          <Line
                            key={idx}
                            type="monotone"
                            dataKey={`zip${idx}`}
                            name={r.location}
                            stroke={COLORS[idx]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        ))}
                        <Tooltip
                          formatter={(value: number) =>
                            `$${value?.toLocaleString()}`
                          }
                        />
                        <Legend />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-500 py-12">
                      No price history data available for comparison
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* AI Summaries Side by Side */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${validResults.length}, 1fr)` }}>
            {validResults.map((r, idx) => (
              <Card key={idx} className="app-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx] }}
                    />
                    <span className="text-gray-900 truncate">
                      {r.location} — AI Summary
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {r.aiSummary}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
