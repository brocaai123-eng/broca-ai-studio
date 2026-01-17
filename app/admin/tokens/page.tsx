"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Coins, 
  TrendingUp,
  Users,
  ArrowUpRight,
  Search,
  Filter,
  Loader2
} from "lucide-react";
import { useAllBrokers, useAllTokenTransactions, usePlatformStats } from "@/lib/hooks/use-admin";
import { formatDistanceToNow } from "date-fns";

export default function AdminTokens() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  const { data: brokers, isLoading: brokersLoading } = useAllBrokers();
  const { data: transactions, isLoading: transactionsLoading } = useAllTokenTransactions();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();

  const isLoading = brokersLoading || transactionsLoading || statsLoading;

  const filteredBrokers = (brokers || []).filter(broker => {
    const matchesSearch = 
      (broker.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (broker.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "all" || 
      (broker.subscription?.plan?.name?.toLowerCase() || '') === filterPlan.toLowerCase();
    return matchesSearch && matchesPlan;
  });

  // Calculate token stats
  const totalTokensIssued = brokers?.reduce((sum, b) => sum + (b.subscription?.tokens_remaining || 0) + (b.subscription?.tokens_used || 0), 0) || 0;
  const totalTokensUsed = brokers?.reduce((sum, b) => sum + (b.subscription?.tokens_used || 0), 0) || 0;
  const totalTokensRemaining = brokers?.reduce((sum, b) => sum + (b.subscription?.tokens_remaining || 0), 0) || 0;
  const brokersWithTokens = brokers?.filter(b => b.subscription && b.subscription.plan?.tokens_per_month !== -1).length || 0;

  const tokenStats = [
    { title: "Total Tokens Issued", value: totalTokensIssued.toLocaleString(), change: "All brokers", icon: Coins },
    { title: "Tokens Consumed", value: totalTokensUsed.toLocaleString(), change: totalTokensIssued > 0 ? `${Math.round((totalTokensUsed / totalTokensIssued) * 100)}% utilization` : "0%", icon: TrendingUp },
    { title: "Available Tokens", value: totalTokensRemaining.toLocaleString(), change: "Across all brokers", icon: Coins },
    { title: "Active Brokers", value: brokersWithTokens.toString(), change: "Using tokens", icon: Users },
  ];

  return (
    <AdminLayout 
      title="Token Management" 
      subtitle="Monitor and manage token allocation across brokers"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tokenStats.map((stat) => (
              <Card key={stat.title} className="bg-app-card border-app">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-accent" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-primary" />
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-app-foreground">{stat.value}</p>
                    <p className="text-sm text-app-muted">{stat.title}</p>
                    <p className="text-xs text-primary mt-1">{stat.change}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Broker Token Allocation */}
            <Card className="bg-app-card border-app">
              <CardHeader>
                <div>
                  <CardTitle className="text-app-foreground">Broker Tokens</CardTitle>
                  <CardDescription className="text-app-muted">Token allocation per broker</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted-foreground" />
                    <Input placeholder="Search brokers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-app-muted border-app text-app-foreground" />
                  </div>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger className="w-32 bg-app-muted border-app text-app-foreground">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-app-card border-app text-app-foreground">
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filteredBrokers.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No brokers found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBrokers.map((broker) => (
                      <div key={broker.id} className="flex items-center justify-between p-3 rounded-lg bg-app-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                            {(broker.full_name || broker.email)?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-app-foreground">{broker.full_name || broker.email}</p>
                            <Badge className="mt-1 text-xs bg-app-muted text-app-muted-foreground">
                              {broker.subscription?.plan?.name || 'No Plan'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          {broker.subscription?.plan?.tokens_per_month === -1 ? (
                            <p className="text-lg font-bold text-accent">∞</p>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-app-foreground">
                                {broker.subscription?.tokens_remaining || 0} / {broker.subscription?.plan?.tokens_per_month || 0}
                              </p>
                              <p className="text-xs text-app-muted">{broker.subscription?.tokens_used || 0} used</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Token Transactions */}
            <Card className="bg-app-card border-app">
              <CardHeader>
                <CardTitle className="text-app-foreground">Recent Token Activity</CardTitle>
                <CardDescription className="text-app-muted">Latest token transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions?.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No token transactions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-app">
                        <TableHead className="text-app-muted">Broker</TableHead>
                        <TableHead className="text-app-muted">Action</TableHead>
                        <TableHead className="text-app-muted">Tokens</TableHead>
                        <TableHead className="text-app-muted">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id} className="border-app">
                          <TableCell className="text-app-foreground">
                            {transaction.broker?.full_name || transaction.broker?.email || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-app-foreground capitalize">
                            {transaction.description || transaction.action_type}
                          </TableCell>
                          <TableCell className={transaction.tokens_amount > 0 ? "text-primary" : "text-destructive"}>
                            {transaction.tokens_amount > 0 ? '+' : ''}{transaction.tokens_amount}
                          </TableCell>
                          <TableCell className="text-app-muted">
                            {transaction.created_at ? formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true }) : 'Unknown'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
