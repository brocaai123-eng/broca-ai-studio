"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  CreditCard, 
  DollarSign, 
  TrendingUp,
  Users,
  ArrowUpRight,
  Download,
  Loader2
} from "lucide-react";
import { useSubscriptionStats, usePlatformTransactions } from "@/lib/hooks/use-admin";
import { formatDistanceToNow } from "date-fns";

export default function AdminSubscriptions() {
  const { data: stats, isLoading: statsLoading } = useSubscriptionStats();
  const { data: transactions, isLoading: transactionsLoading } = usePlatformTransactions();

  const isLoading = statsLoading || transactionsLoading;

  const subscriptionStats = [
    { title: "Active Subscriptions", value: stats?.totalActive?.toString() || "0", change: "Active brokers", icon: Users },
    { title: "Monthly Revenue", value: `$${stats?.monthlyRevenue?.toLocaleString() || "0"}`, change: "This month", icon: DollarSign },
    { title: "Avg Revenue per Broker", value: stats?.totalActive ? `$${Math.round((stats?.monthlyRevenue || 0) / stats.totalActive)}` : "$0", change: "Per active broker", icon: TrendingUp },
    { title: "Total Plans", value: stats?.planBreakdown?.length?.toString() || "0", change: "Available plans", icon: CreditCard },
  ];

  return (
    <AdminLayout 
      title="Subscriptions & Revenue" 
      subtitle="Monitor subscription plans and revenue metrics"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptionStats.map((stat) => (
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Breakdown */}
            <Card className="bg-app-card border-app">
              <CardHeader>
                <CardTitle className="text-app-foreground">Plan Distribution</CardTitle>
                <CardDescription className="text-app-muted">Brokers by subscription plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.planBreakdown?.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active subscriptions</p>
                  </div>
                ) : (
                  stats?.planBreakdown?.map((plan) => (
                    <div key={plan.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            plan.name === "Enterprise" ? "bg-accent/20 text-accent" :
                            plan.name === "Professional" ? "bg-primary/20 text-primary" :
                            "bg-app-muted text-app-muted-foreground"
                          }`}>
                            {plan.name}
                          </Badge>
                          <span className="text-sm text-app-muted">${plan.price}/mo</span>
                        </div>
                        <span className="text-sm font-medium text-app-foreground">{plan.count} brokers</span>
                      </div>
                      <div className="w-full h-2 bg-app-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            plan.name === "Enterprise" ? "bg-accent" :
                            plan.name === "Professional" ? "bg-primary" :
                            "bg-app-muted-foreground"
                          }`}
                          style={{ width: `${(plan.count / (stats?.totalActive || 1)) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-app-muted text-right">${plan.revenue.toLocaleString()} revenue</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="lg:col-span-2 bg-app-card border-app">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-app-foreground">Recent Transactions</CardTitle>
                  <CardDescription className="text-app-muted">Latest payment activity</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-app text-app-foreground bg-app-card hover:bg-app-muted">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {transactions?.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-app">
                        <TableHead className="text-app-muted">Broker</TableHead>
                        <TableHead className="text-app-muted">Type</TableHead>
                        <TableHead className="text-app-muted">Amount</TableHead>
                        <TableHead className="text-app-muted">Date</TableHead>
                        <TableHead className="text-app-muted">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id} className="border-app">
                          <TableCell className="text-app-foreground">
                            {transaction.broker?.full_name || transaction.broker?.email || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-app-foreground capitalize">{transaction.type}</TableCell>
                          <TableCell className="text-app-foreground font-medium">${transaction.amount}</TableCell>
                          <TableCell className="text-app-muted">
                            {transaction.created_at ? formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true }) : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge className={transaction.status === 'completed' ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-500"}>
                              {transaction.status}
                            </Badge>
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
