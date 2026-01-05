"use client";

import { useState } from "react";
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
  ArrowRight
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface TokenUsage {
  id: string;
  date: string;
  actionType: "ai_scan" | "onboarding" | "email" | "form";
  description: string;
  tokensUsed: number;
  balanceAfter: number;
}

const tokenUsageHistory: TokenUsage[] = [
  { id: "1", date: "Jan 5, 2026", actionType: "ai_scan", description: "Document scan - Purchase Agreement", tokensUsed: 5, balanceAfter: 234 },
  { id: "2", date: "Jan 5, 2026", actionType: "onboarding", description: "Onboarding sent to Sarah Johnson", tokensUsed: 10, balanceAfter: 239 },
  { id: "3", date: "Jan 4, 2026", actionType: "email", description: "Email generated for Michael Brown", tokensUsed: 3, balanceAfter: 249 },
  { id: "4", date: "Jan 4, 2026", actionType: "form", description: "Custom form processed - Insurance", tokensUsed: 8, balanceAfter: 252 },
  { id: "5", date: "Jan 3, 2026", actionType: "ai_scan", description: "ID verification - Emily Davis", tokensUsed: 7, balanceAfter: 260 },
  { id: "6", date: "Jan 3, 2026", actionType: "onboarding", description: "Onboarding sent to Robert Wilson", tokensUsed: 10, balanceAfter: 267 },
  { id: "7", date: "Jan 2, 2026", actionType: "email", description: "Follow-up email for Jennifer Martinez", tokensUsed: 3, balanceAfter: 277 },
  { id: "8", date: "Jan 2, 2026", actionType: "ai_scan", description: "Document scan - Bank Statement", tokensUsed: 5, balanceAfter: 280 },
];

const actionTypeConfig: Record<TokenUsage["actionType"], { label: string; icon: React.ElementType; color: string }> = {
  ai_scan: { label: "AI Document Scan", icon: FileText, color: "bg-blue-100 text-blue-700" },
  onboarding: { label: "Onboarding Sent", icon: Users, color: "bg-green-100 text-green-700" },
  email: { label: "Email Generated", icon: Mail, color: "bg-purple-100 text-purple-700" },
  form: { label: "Form Processed", icon: Sparkles, color: "bg-orange-100 text-orange-700" },
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
    features: ["500 AI tokens", "Valid for 60 days", "All features included", "Priority processing"]
  },
  { 
    id: "premium", 
    name: "Premium", 
    tokens: 1500, 
    price: 199, 
    perToken: "0.13",
    features: ["1500 AI tokens", "Valid for 90 days", "All features included", "Priority processing", "Dedicated support"]
  },
];

const stats = [
  { label: "Current Balance", value: "234", subtext: "tokens remaining", icon: Coins, color: "text-primary" },
  { label: "Used This Month", value: "266", subtext: "of 500 allocated", icon: TrendingUp, color: "text-accent" },
  { label: "Daily Average", value: "8.5", subtext: "tokens per day", icon: Calendar, color: "text-primary" },
  { label: "Days Until Renewal", value: "12", subtext: "Jan 17, 2026", icon: Clock, color: "text-blue-500" },
];

export default function Tokens() {
  const [filterType, setFilterType] = useState<string>("all");
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const filteredHistory = filterType === "all" 
    ? tokenUsageHistory 
    : tokenUsageHistory.filter(item => item.actionType === filterType);

  const tokenPercentage = (234 / 500) * 100;
  const isLowTokens = tokenPercentage < 20;

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
          <DialogContent className="bg-app-card border-app max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-app-foreground text-xl">Purchase Token Package</DialogTitle>
              <DialogDescription className="text-app-muted">
                Select a token package to continue using AI features
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {tokenPackages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    pkg.popular 
                      ? "border-primary bg-primary/5" 
                      : "border-app-muted/30 bg-app-muted/10 hover:border-app-muted"
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-app-foreground">{pkg.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-app-foreground">${pkg.price}</span>
                    </div>
                    <p className="text-sm text-app-muted mt-1">${pkg.perToken} per token</p>
                  </div>
                  <div className="text-center mb-4">
                    <span className="text-2xl font-bold text-primary">{pkg.tokens}</span>
                    <span className="text-app-muted ml-1">tokens</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-app-muted">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${pkg.popular ? "bg-primary hover:bg-primary/90" : "bg-app-muted hover:bg-app-muted/80"}`}
                    variant={pkg.popular ? "default" : "secondary"}
                  >
                    Select Package
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
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
          <span className="text-sm text-app-muted">234 / 500 tokens</span>
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
          <span>250</span>
          <span>500</span>
        </div>
      </div>

      {/* Usage History */}
      <div className="app-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-lg font-semibold text-app-foreground">Usage History</h2>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px] bg-app-muted border-app text-app-foreground">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-app-card border-app">
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="ai_scan">AI Document Scan</SelectItem>
              <SelectItem value="onboarding">Onboarding Sent</SelectItem>
              <SelectItem value="email">Email Generated</SelectItem>
              <SelectItem value="form">Form Processed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-app hover:bg-transparent">
                <TableHead className="text-app-muted">Date</TableHead>
                <TableHead className="text-app-muted">Action</TableHead>
                <TableHead className="text-app-muted">Description</TableHead>
                <TableHead className="text-app-muted text-right">Tokens</TableHead>
                <TableHead className="text-app-muted text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((item) => {
                const config = actionTypeConfig[item.actionType];
                return (
                  <TableRow key={item.id} className="border-app hover:bg-app-muted/50">
                    <TableCell className="text-app-foreground">{item.date}</TableCell>
                    <TableCell>
                      <Badge className={`${config.color} border-0`}>
                        <config.icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-app-muted">{item.description}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">-{item.tokensUsed}</TableCell>
                    <TableCell className="text-right text-app-foreground font-medium">{item.balanceAfter}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
