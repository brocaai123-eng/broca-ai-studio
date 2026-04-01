"use client";

import Link from "next/link";
import {
  Activity,
  MapPin,
  TrendingUp,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSavedAnalyses } from "@/lib/hooks/use-market-intelligence";

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

function getMarketIcon(type: string | null): string {
  switch (type) {
    case "sellers": return "🔥";
    case "buyers": return "🏷️";
    default: return "⚖️";
  }
}

export default function MarketIntelligenceWidget() {
  const { data: savedAnalyses, isLoading } = useSavedAnalyses();
  const recent = savedAnalyses?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <Card className="app-card h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-app-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="app-card h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-app-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Market Intelligence
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/dashboard/market-intelligence">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-app-foreground mb-1">ARIA Market Score™</p>
            <p className="text-xs text-app-muted mb-4">
              Get AI-powered market insights with live data
            </p>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Link href="/dashboard/market-intelligence">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Analyze a Market
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((analysis) => (
              <Link
                key={analysis.id}
                href="/dashboard/market-intelligence"
                className="flex items-center gap-3 p-3 bg-app-muted rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${getScoreBg(analysis.aria_score)} flex items-center justify-center shrink-0`}>
                  <span className={`text-sm font-bold ${getScoreColor(analysis.aria_score)}`}>
                    {analysis.aria_score}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-sm font-medium text-app-foreground truncate">
                      {analysis.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]">{getMarketIcon(analysis.market_type)}</span>
                    <span className="text-xs text-app-muted capitalize">{analysis.market_type || "N/A"}</span>
                    <span className="text-xs text-app-muted">•</span>
                    <span className="text-xs text-app-muted">
                      {new Date(analysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-app-muted shrink-0" />
              </Link>
            ))}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full bg-app-card border-app hover:bg-app-muted text-app-foreground"
            >
              <Link href="/dashboard/market-intelligence">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                New Analysis
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
