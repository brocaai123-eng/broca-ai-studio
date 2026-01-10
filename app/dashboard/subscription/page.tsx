"use client";

import { useState } from "react";
import { 
  CreditCard, 
  Check, 
  Sparkles,
  Users,
  FileText,
  Crown,
  Download,
  ArrowRight,
  Loader2
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
import { useSubscription, useSubscriptionPlans, useBrokerStats } from "@/lib/hooks/use-database";

export default function Subscription() {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: stats, isLoading: statsLoading } = useBrokerStats();

  const isLoading = subscriptionLoading || plansLoading || statsLoading;

  const currentPlan = subscription?.plan;
  const renewalDate = subscription?.current_period_end 
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "N/A";

  if (isLoading) {
    return (
      <DashboardLayout title="Subscription & Billing" subtitle="Manage your subscription plan and billing information">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const tokensRemaining = subscription?.tokens_remaining || 0;
  const tokensUsed = subscription?.tokens_used || 0;
  const totalTokens = currentPlan?.tokens_per_month || 500;
  const tokenPercentage = totalTokens > 0 ? ((tokensRemaining / totalTokens) * 100) : 0;
  const clientCount = stats?.total_clients || 0;
  const documentCount = stats?.total_documents || 0;

  return (
    <DashboardLayout 
      title="Subscription & Billing" 
      subtitle="Manage your subscription plan and billing information"
      headerAction={
        <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-app-card border-app max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-app-foreground text-xl">Choose Your Plan</DialogTitle>
              <DialogDescription className="text-app-muted">
                Select the plan that best fits your business needs
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {plans.map((plan) => {
                const isCurrentPlan = plan.id === subscription?.plan_id;
                const isPopular = plan.name === "Professional";
                return (
                  <div 
                    key={plan.id}
                    className={`relative p-6 rounded-xl border-2 transition-all ${
                      isPopular 
                        ? "border-primary bg-primary/5" 
                        : "border-app-muted/30 bg-app-muted/10 hover:border-app-muted"
                    }`}
                  >
                    {isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Current Plan
                      </Badge>
                    )}
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-app-foreground">{plan.name}</h3>
                      <p className="text-sm text-app-muted mt-1">{plan.tokens_per_month} tokens/month</p>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-app-foreground">${plan.price}</span>
                        <span className="text-app-muted">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {(plan.features || []).map((feature: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-app-muted">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${isCurrentPlan ? "bg-app-muted text-app-muted-foreground cursor-not-allowed" : isPopular ? "bg-primary hover:bg-primary/90" : "bg-app-muted hover:bg-app-muted/80"}`}
                      variant={isPopular ? "default" : "secondary"}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? "Current Plan" : currentPlan && plan.price > currentPlan.price ? "Upgrade" : "Select"}
                      {!isCurrentPlan && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Current Plan Card */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 app-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-display text-xl font-semibold text-app-foreground">{currentPlan?.name || "No Plan"}</h2>
                <Badge className={`${subscription?.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"} border-0 capitalize`}>
                  {subscription?.status || "Inactive"}
                </Badge>
              </div>
              <p className="text-app-muted">Your subscription renews on {renewalDate}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-app-foreground">${currentPlan?.price || 0}</p>
              <p className="text-sm text-app-muted">per month</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {(currentPlan?.features || []).map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-app-muted/50">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-app-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-app flex flex-wrap gap-3">
            <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
              Change Plan
            </Button>
            <Button variant="outline" className="bg-app-card border-app text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
              Cancel Subscription
            </Button>
          </div>
        </div>

        {/* Usage Summary */}
        <div className="app-card p-6">
          <h3 className="font-display font-semibold text-app-foreground mb-6">Usage This Month</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-app-foreground">Active Clients</span>
                </div>
                <span className="font-medium text-app-foreground">{clientCount}</span>
              </div>
              <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(clientCount, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-app-foreground">AI Tokens</span>
                </div>
                <span className="font-medium text-app-foreground">{tokensRemaining} / {totalTokens}</span>
              </div>
              <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${tokenPercentage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-app-foreground">Documents</span>
                </div>
                <span className="font-medium text-app-foreground">{documentCount}</span>
              </div>
              <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                <div className="h-full w-full bg-blue-500 rounded-full" />
              </div>
              <p className="text-xs text-app-muted mt-1">Unlimited storage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-app-foreground">Payment Method</h3>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
              Edit
            </Button>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-app-muted/50 border border-app">
            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-app-foreground">Visa •••• 4242</p>
              <p className="text-sm text-app-muted">Expires 12/2027</p>
            </div>
          </div>
        </div>

        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-app-foreground">Billing Information</h3>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-app-muted">
            <p className="text-app-foreground font-medium">Acme Real Estate LLC</p>
            <p>123 Business Ave, Suite 456</p>
            <p>San Francisco, CA 94102</p>
            <p>billing@acmerealestate.com</p>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="app-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-app-foreground">Billing History</h3>
          <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-app hover:bg-transparent">
                <TableHead className="text-app-muted">Date</TableHead>
                <TableHead className="text-app-muted">Description</TableHead>
                <TableHead className="text-app-muted">Invoice</TableHead>
                <TableHead className="text-app-muted text-right">Amount</TableHead>
                <TableHead className="text-app-muted text-right">Status</TableHead>
                <TableHead className="text-app-muted"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-app-muted">
                  No billing history available yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}