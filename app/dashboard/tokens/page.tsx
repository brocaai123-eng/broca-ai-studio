"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Coins, 
  TrendingUp, 
  Calendar,
  Clock,
  FileText,
  Mail,
  Sparkles,
  Users,
  Check,
  ArrowRight,
  Loader2,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSubscription, useTokenTransactions } from "@/lib/hooks/use-database";
import { useAuth } from "@/lib/supabase/auth-context";
import type { TokenActionType } from "@/lib/types/database";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const actionTypeConfig: Record<TokenActionType, { label: string; icon: React.ElementType; color: string }> = {
  ai_scan: { label: "AI Document Scan", icon: FileText, color: "bg-blue-100 text-blue-700" },
  onboarding: { label: "Onboarding Sent", icon: Users, color: "bg-green-100 text-green-700" },
  email: { label: "Email Generated", icon: Mail, color: "bg-purple-100 text-purple-700" },
  form: { label: "Form Processed", icon: Sparkles, color: "bg-orange-100 text-orange-700" },
  purchase: { label: "Token Purchase", icon: ShoppingCart, color: "bg-teal-100 text-teal-700" },
  allocation: { label: "Monthly Allocation", icon: Calendar, color: "bg-cyan-100 text-cyan-700" },
  admin_add: { label: "Admin Added", icon: Coins, color: "bg-amber-100 text-amber-700" },
  referral_bonus: { label: "Referral Bonus", icon: Users, color: "bg-emerald-100 text-emerald-700" },
};

const tokenPackages = [
  { 
    id: "basic", 
    name: "Basic", 
    tokens: 100, 
    price: 19, 
    perToken: "0.19",
    features: ["100 AI tokens", "Valid for 30 days", "All features included"]
  },
  { 
    id: "standard", 
    name: "Standard", 
    tokens: 500, 
    price: 79, 
    perToken: "0.16",
    popular: true,
    features: ["500 AI tokens", "Valid for 30 days", "All features included", "Priority processing"]
  },
  { 
    id: "premium", 
    name: "Premium", 
    tokens: 1500, 
    price: 199, 
    perToken: "0.13",
    features: ["1500 AI tokens", "Valid for 30 days", "All features included", "Priority processing", "Dedicated support"]
  },
];

function TokensContent() {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: tokenTransactions = [], isLoading: transactionsLoading } = useTokenTransactions();

  // Handle purchase success/cancel from URL params
  useEffect(() => {
    const purchase = searchParams.get('purchase');
    const tokens = searchParams.get('tokens');
    const sessionId = searchParams.get('session_id');
    
    if (purchase === 'success' && tokens && sessionId && user) {
      // Verify the purchase with backend
      const verifyPurchase = async () => {
        try {
          const response = await fetch('/api/stripe/verify-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, userId: user.id }),
          });
          
          if (response.ok) {
            toast.success(`Successfully purchased ${tokens} tokens!`);
          } else {
            // Webhook might have already processed it
            toast.success(`Purchase complete! ${tokens} tokens added.`);
          }
        } catch {
          toast.success(`Purchase complete! ${tokens} tokens added.`);
        }
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['token-transactions'] });
      };
      
      verifyPurchase();
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/tokens');
    } else if (purchase === 'cancelled') {
      toast.info('Token purchase was cancelled');
      window.history.replaceState({}, '', '/dashboard/tokens');
    }
  }, [searchParams, queryClient, user]);

  const isLoading = subscriptionLoading || transactionsLoading;

  const tokensRemaining = subscription?.tokens_remaining || 0;
  const tokensUsed = subscription?.tokens_used || 0;
  const totalTokens = subscription?.plan?.tokens_per_month || 500;
  const tokenPercentage = totalTokens > 0 ? ((tokensRemaining / totalTokens) * 100) : 0;
  const isLowTokens = tokensRemaining > 0 && tokenPercentage < 20;

  // Handle purchasing a token package
  const handlePurchasePackage = async (packageId: string) => {
    if (!user) {
      toast.error("You must be logged in to purchase tokens");
      return;
    }

    setPurchasingPackage(packageId);

    try {
      const response = await fetch('/api/stripe/token-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process purchase');
    } finally {
      setPurchasingPackage(null);
    }
  };

  // Calculate days until renewal
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const rawDaysUntilRenewal = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const daysUntilRenewal = Math.max(0, rawDaysUntilRenewal); // Don't show negative days
  const renewalDateStr = periodEnd?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || "N/A";

  // Calculate daily average
  const periodStart = subscription?.current_period_start ? new Date(subscription.current_period_start) : null;
  const daysElapsed = periodStart ? Math.max(1, Math.ceil((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const dailyAverage = (tokensUsed / daysElapsed).toFixed(1);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const stats = [
    { label: "Current Balance", value: tokensRemaining.toString(), subtext: "tokens remaining", icon: Coins, color: "text-primary" },
    { label: "Used This Month", value: tokensUsed.toString(), subtext: `of ${totalTokens} allocated`, icon: TrendingUp, color: "text-accent" },
    { label: "Daily Average", value: dailyAverage, subtext: "tokens per day", icon: Calendar, color: "text-primary" },
    { label: "Days Until Renewal", value: daysUntilRenewal.toString(), subtext: renewalDateStr, icon: Clock, color: "text-blue-500" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Token Usage" subtitle="Track your AI token consumption and purchase more">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Token Usage" 
      subtitle="Track your AI token consumption and purchase more"
      headerAction={
        <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Coins className="w-4 h-4 mr-2" />
              Buy Tokens
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-app-card border-app max-w-4xl">
            <DialogHeader className="text-center pb-2">
              <DialogTitle className="text-app-foreground text-2xl font-display">Purchase Token Package</DialogTitle>
              <DialogDescription className="text-app-muted">
                Add tokens to your account instantly. Never run out of AI features.
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {tokenPackages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                    pkg.popular 
                      ? "border-primary bg-gradient-to-b from-primary/10 to-primary/5 shadow-lg shadow-primary/10" 
                      : "border-app-muted/30 bg-app-muted/5 hover:border-primary/50"
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                      Best Value
                    </Badge>
                  )}
                  <div className="text-center mb-3">
                    <h3 className="text-lg font-bold text-app-foreground mb-1">{pkg.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-app-foreground">${pkg.price}</span>
                      <span className="text-app-muted text-xs">one-time</span>
                    </div>
                    <p className="text-xs text-app-muted mt-1">${pkg.perToken} per token</p>
                  </div>
                  <div className="text-center mb-3 py-2 bg-app-muted/30 rounded-lg">
                    <span className="text-2xl font-bold text-primary">{pkg.tokens.toLocaleString()}</span>
                    <span className="text-app-muted text-sm ml-1">tokens</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-app-foreground">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-primary" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full h-10 text-sm font-semibold ${pkg.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-app-muted/50 hover:bg-app-muted text-app-foreground border border-app-muted"}`}
                    variant={pkg.popular ? "default" : "outline"}
                    onClick={() => handlePurchasePackage(pkg.id)}
                    disabled={purchasingPackage === pkg.id}
                  >
                    {purchasingPackage === pkg.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {purchasingPackage === pkg.id ? "Processing..." : "Buy Now"}
                    {purchasingPackage !== pkg.id && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-app-muted mt-4">
              Secure payment powered by Stripe. Tokens are added instantly after purchase.
            </p>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Low Token Warning */}
      {isLowTokens && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-app-foreground">Low Token Balance</p>
              <p className="text-sm text-app-muted">You have less than 20% of your tokens remaining</p>
            </div>
          </div>
          <Button 
            onClick={() => setIsPurchaseOpen(true)}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Buy More Tokens
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="app-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-sm text-app-muted mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-app-foreground">{stat.value}</p>
            <p className="text-xs text-app-muted mt-1">{stat.subtext}</p>
          </div>
        ))}
      </div>

      {/* Token Balance Visual */}
      <div className="app-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-app-foreground">Monthly Allocation</h2>
          <span className="text-sm text-app-muted">{tokensRemaining} / {totalTokens} tokens</span>
        </div>
        <div className="h-4 bg-app-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isLowTokens ? "bg-destructive" : "bg-gradient-to-r from-primary to-broca-mint"
            }`}
            style={{ width: `${tokenPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-app-muted">
          <span>0</span>
          <span>{Math.floor(totalTokens / 2)}</span>
          <span>{totalTokens}</span>
        </div>
      </div>

      {/* Usage History */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="mb-6">
          <h2 className="font-display text-lg font-semibold text-gray-900">Usage History</h2>
        </div>

        <div className="max-h-[400px] overflow-y-auto overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100 hover:bg-transparent">
                <TableHead className="text-gray-500">Date</TableHead>
                <TableHead className="text-gray-500">Action</TableHead>
                <TableHead className="text-gray-500">Description</TableHead>
                <TableHead className="text-gray-500 text-right">Tokens</TableHead>
                <TableHead className="text-gray-500 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokenTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    No token transactions found
                  </TableCell>
                </TableRow>
              ) : (
                tokenTransactions.map((item) => {
                  const config = actionTypeConfig[item.action_type] || { label: item.action_type, icon: Coins, color: "bg-gray-100 text-gray-700" };
                  const isAddition = item.tokens_amount > 0;
                  return (
                    <TableRow key={item.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="text-gray-700">{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={`${config.color} border-0 font-medium`}>
                          <config.icon className="w-3 h-3 mr-1.5" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">{item.description || "N/A"}</TableCell>
                      <TableCell className={`text-right font-semibold ${isAddition ? "text-emerald-600" : "text-red-500"}`}>
                        {isAddition ? "+" : ""}{item.tokens_amount}
                      </TableCell>
                      <TableCell className="text-right text-gray-900 font-semibold">{item.balance_after}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Tokens() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Token Usage" subtitle="Track your AI token consumption and purchase more">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    }>
      <TokensContent />
    </Suspense>
  );
}