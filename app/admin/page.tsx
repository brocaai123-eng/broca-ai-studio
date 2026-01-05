"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Users, 
  Coins, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Activity
} from "lucide-react";

// Mock stats data
const stats = [
  {
    title: "Total Brokers",
    value: "24",
    change: "+3",
    changeType: "positive" as const,
    icon: Users,
    description: "Active broker accounts"
  },
  {
    title: "Monthly Revenue",
    value: "$4,280",
    change: "+12%",
    changeType: "positive" as const,
    icon: DollarSign,
    description: "This month's earnings"
  },
  {
    title: "Tokens Consumed",
    value: "12,456",
    change: "+8%",
    changeType: "positive" as const,
    icon: Coins,
    description: "Across all brokers"
  },
  {
    title: "Client Onboardings",
    value: "156",
    change: "+23%",
    changeType: "positive" as const,
    icon: TrendingUp,
    description: "This month"
  }
];

// Mock recent activity
const recentActivity = [
  { id: 1, type: "broker_signup", broker: "Sarah Johnson", action: "New broker signed up", time: "2 hours ago", plan: "Professional" },
  { id: 2, type: "subscription", broker: "Mike Chen", action: "Upgraded to Enterprise", time: "5 hours ago", plan: "Enterprise" },
  { id: 3, type: "tokens", broker: "Lisa Williams", action: "Purchased 500 tokens", time: "8 hours ago", tokens: 500 },
  { id: 4, type: "onboarding", broker: "John Davis", action: "Completed 5 client onboardings", time: "1 day ago", count: 5 },
  { id: 5, type: "broker_signup", broker: "Emily Brown", action: "New broker signed up", time: "2 days ago", plan: "Starter" },
];

// Mock top brokers
const topBrokers = [
  { id: 1, name: "Sarah Johnson", email: "sarah@realestate.com", clients: 45, tokens: 1200, plan: "Enterprise" },
  { id: 2, name: "Mike Chen", email: "mike@insurance.com", clients: 38, tokens: 980, plan: "Professional" },
  { id: 3, name: "Lisa Williams", email: "lisa@mortgage.com", clients: 32, tokens: 750, plan: "Professional" },
  { id: 4, name: "John Davis", email: "john@realestate.com", clients: 28, tokens: 620, plan: "Starter" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout 
      title="Platform Overview" 
      subtitle="Manage your brokers and monitor platform performance"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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
              <CardTitle className="text-app-foreground">Recent Activity</CardTitle>
              <CardDescription className="text-app-muted">Latest platform events</CardDescription>
            </div>
            <Activity className="w-5 h-5 text-app-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-app-muted/30">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === "broker_signup" ? "bg-primary/20" :
                    activity.type === "subscription" ? "bg-accent/20" :
                    activity.type === "tokens" ? "bg-yellow-500/20" :
                    "bg-blue-500/20"
                  }`}>
                    {activity.type === "broker_signup" ? <UserPlus className="w-5 h-5 text-primary" /> :
                     activity.type === "subscription" ? <DollarSign className="w-5 h-5 text-accent" /> :
                     activity.type === "tokens" ? <Coins className="w-5 h-5 text-yellow-500" /> :
                     <Users className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-app-foreground truncate">{activity.broker}</p>
                    <p className="text-xs text-app-muted truncate">{activity.action}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-app-muted">{activity.time}</p>
                    {activity.plan && (
                      <Badge variant="outline" className="mt-1 text-xs border-app text-app-muted">
                        {activity.plan}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Brokers */}
        <Card className="bg-app-card border-app">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground">Top Brokers</CardTitle>
              <CardDescription className="text-app-muted">By client onboardings</CardDescription>
            </div>
            <Link href="/admin/brokers">
              <Button variant="ghost" size="sm" className="text-app-muted hover:text-app-foreground">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topBrokers.map((broker, index) => (
                <div key={broker.id} className="flex items-center gap-4 p-3 rounded-lg bg-app-muted/30">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-app-foreground truncate">{broker.name}</p>
                    <p className="text-xs text-app-muted truncate">{broker.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-app-foreground">{broker.clients} clients</p>
                    <p className="text-xs text-app-muted">{broker.tokens} tokens used</p>
                  </div>
                  <Badge className={`text-xs ${
                    broker.plan === "Enterprise" ? "bg-accent/20 text-accent" :
                    broker.plan === "Professional" ? "bg-primary/20 text-primary" :
                    "bg-app-muted text-app-muted"
                  }`}>
                    {broker.plan}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground">Quick Actions</CardTitle>
          <CardDescription className="text-app-muted">Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/admin/brokers">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border-app text-app-foreground bg-app-card hover:bg-app-muted">
                <UserPlus className="w-6 h-6" />
                <span>Invite Broker</span>
              </Button>
            </Link>
            <Link href="/admin/tokens">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border-app text-app-foreground bg-app-card hover:bg-app-muted">
                <Coins className="w-6 h-6" />
                <span>Manage Tokens</span>
              </Button>
            </Link>
            <Link href="/admin/subscriptions">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border-app text-app-foreground bg-app-card hover:bg-app-muted">
                <DollarSign className="w-6 h-6" />
                <span>View Revenue</span>
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 border-app text-app-foreground bg-app-card hover:bg-app-muted">
                <TrendingUp className="w-6 h-6" />
                <span>Analytics</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
