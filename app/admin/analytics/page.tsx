"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp,
  Users,
  Coins,
  FileText,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { usePlatformStats, useAllBrokers, useActivityLog } from "@/lib/hooks/use-admin";
import { formatDistanceToNow } from "date-fns";

export default function AdminAnalytics() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: brokers, isLoading: brokersLoading } = useAllBrokers();
  const { data: activityLog, isLoading: activityLoading } = useActivityLog();

  const isLoading = statsLoading || brokersLoading || activityLoading;

  // Calculate analytics
  const totalClients = brokers?.reduce((sum, b) => sum + (b.clients_count || 0), 0) || 0;
  const totalTokensUsed = brokers?.reduce((sum, b) => sum + (b.subscription?.tokens_used || 0), 0) || 0;

  const overviewStats = [
    { title: "Total Onboardings", value: stats?.total_onboardings?.toString() || "0", change: "All time", changeType: "positive", icon: Users },
    { title: "Total Clients", value: totalClients.toString(), change: "Across all brokers", changeType: "positive", icon: FileText },
    { title: "AI Extractions", value: totalTokensUsed.toLocaleString(), change: "Tokens consumed", changeType: "positive", icon: TrendingUp },
    { title: "Monthly Revenue", value: `$${stats?.monthly_revenue?.toLocaleString() || "0"}`, change: "This month", changeType: "positive", icon: Coins },
  ];

  // Get top performers
  const topPerformers = [...(brokers || [])]
    .sort((a, b) => (b.clients_count || 0) - (a.clients_count || 0))
    .slice(0, 5);

  return (
    <AdminLayout 
      title="Platform Analytics" 
      subtitle="Comprehensive insights into platform performance"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Time Range Selector */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-app-muted" />
              <Select defaultValue="30days">
                <SelectTrigger className="w-40 bg-app-muted border-app text-app-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-app-card border-app text-app-foreground">
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="border-app text-app-foreground bg-app-card hover:bg-app-muted">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {overviewStats.map((stat) => (
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
            {/* Top Performers */}
            <Card className="bg-app-card border-app">
              <CardHeader>
                <CardTitle className="text-app-foreground">Top Performing Brokers</CardTitle>
                <CardDescription className="text-app-muted">By client count</CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No brokers yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topPerformers.map((broker, index) => (
                      <div key={broker.id} className="flex items-center gap-4 p-3 rounded-lg bg-app-muted/30">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? "bg-accent/20 text-accent" :
                          index === 1 ? "bg-primary/20 text-primary" :
                          "bg-app-muted text-app-muted-foreground"
                        }`}>
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

            {/* Recent Activity */}
            <Card className="bg-app-card border-app">
              <CardHeader>
                <CardTitle className="text-app-foreground">Recent Activity</CardTitle>
                <CardDescription className="text-app-muted">Latest platform actions</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLog?.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {activityLog?.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-app-muted/30">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-app-foreground">{activity.description || activity.action_type}</p>
                          <p className="text-xs text-app-muted">
                            {activity.user?.full_name || activity.user?.email || 'System'} • {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Platform Stats Summary */}
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground">Platform Summary</CardTitle>
              <CardDescription className="text-app-muted">Overall platform statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-app-muted/30">
                  <p className="text-3xl font-bold text-accent">{stats?.total_brokers || 0}</p>
                  <p className="text-sm text-app-muted">Total Brokers</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-app-muted/30">
                  <p className="text-3xl font-bold text-primary">{stats?.active_brokers || 0}</p>
                  <p className="text-sm text-app-muted">Active Subscriptions</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-app-muted/30">
                  <p className="text-3xl font-bold text-app-foreground">{totalClients}</p>
                  <p className="text-sm text-app-muted">Total Clients</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-app-muted/30">
                  <p className="text-3xl font-bold text-app-foreground">{(stats?.total_tokens_consumed || 0).toLocaleString()}</p>
                  <p className="text-sm text-app-muted">Tokens Consumed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
