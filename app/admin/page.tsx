"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePlatformStats, useAllBrokers, useSubscriptionStats } from "@/lib/hooks/use-admin";
import { formatDistanceToNow } from "date-fns";
import { 
  Users, 
  Coins, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Activity,
  Loader2
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: allBrokers, isLoading: brokersLoading } = useAllBrokers();
  const { data: subscriptionStats, isLoading: subscriptionLoading } = useSubscriptionStats();

  const isLoading = statsLoading || brokersLoading || subscriptionLoading;

  // Prepare stats for display
  const displayStats = [
    {
      title: "Total Brokers",
      value: stats?.total_brokers?.toString() || "0",
      change: stats?.active_brokers ? `${stats.active_brokers} active` : "0 active",
      changeType: "positive" as const,
      icon: Users,
      description: "Active broker accounts"
    },
    {
      title: "Monthly Revenue",
      value: `$${subscriptionStats?.monthlyRevenue?.toLocaleString() || "0"}`,
      change: "This month",
      changeType: "positive" as const,
      icon: DollarSign,
      description: "Monthly earnings"
    },
    {
      title: "Tokens Consumed",
      value: stats?.total_tokens_consumed?.toLocaleString() || "0",
      change: "All time",
      changeType: "positive" as const,
      icon: Coins,
      description: "Across all brokers"
    },
    {
      title: "Total Onboardings",
      value: stats?.total_onboardings?.toString() || "0",
      change: "All time",
      changeType: "positive" as const,
      icon: TrendingUp,
      description: "All brokers"
    }
  ];

  // Get top brokers by client count
  const topBrokers = allBrokers
    ?.sort((a, b) => (b.clients_count || 0) - (a.clients_count || 0))
    .slice(0, 4) || [];

  return (
    <AdminLayout 
      title="Platform Overview" 
      subtitle="Manage your brokers and monitor platform performance"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayStats.map((stat) => (
          <Card key={stat.title} className="bg-app-card border-app">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.changeType === "positive" ? "text-primary" : "text-destructive"
                }`}>
                  {stat.changeType === "positive" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-app-foreground">{stat.value}</p>
                <p className="text-sm text-app-muted">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-app-card border-app">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground">Top Brokers</CardTitle>
              <CardDescription className="text-app-muted">By client count</CardDescription>
            </div>
            <Activity className="w-5 h-5 text-app-muted" />
          </CardHeader>
          <CardContent>
            {topBrokers.length === 0 ? (
              <div className="text-center py-8 text-app-muted">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No brokers yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topBrokers.map((broker, index) => (
                  <div key={broker.id} className="flex items-center gap-4 p-3 rounded-lg bg-app-muted/30">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-app-foreground truncate">
                        {broker.full_name || broker.email}
                      </p>
                      <p className="text-xs text-app-muted truncate">{broker.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-app-foreground">{broker.clients_count || 0} clients</p>
                      <Badge variant="outline" className="mt-1 text-xs border-app text-app-muted">
                        {broker.subscription?.plan?.name || 'No plan'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Brokers */}
        <Card className="bg-app-card border-app">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground">Quick Actions</CardTitle>
              <CardDescription className="text-app-muted">Platform management</CardDescription>
            </div>
            <Link href="/admin/brokers">
              <Button variant="ghost" size="sm" className="text-app-muted hover:text-app-foreground">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/brokers">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Brokers
                </Button>
              </Link>
              <Link href="/admin/tokens">
                <Button className="w-full justify-start" variant="outline">
                  <Coins className="w-4 h-4 mr-2" />
                  Allocate Tokens
                </Button>
              </Link>
              <Link href="/admin/subscriptions">
                <Button className="w-full justify-start" variant="outline">
                  <DollarSign className="w-4 h-4 mr-2" />
                  View Revenue
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button className="w-full justify-start" variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Platform Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </AdminLayout>
  );
}
