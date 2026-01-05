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
  Calendar,
  ArrowUpRight,
  Download
} from "lucide-react";

// Mock subscription data
const subscriptionStats = [
  { title: "Active Subscriptions", value: "24", change: "+3 this month", icon: Users },
  { title: "Monthly Revenue", value: "$4,280", change: "+12% from last month", icon: DollarSign },
  { title: "Avg Revenue per Broker", value: "$178", change: "+5% from last month", icon: TrendingUp },
  { title: "Churn Rate", value: "2.1%", change: "-0.5% from last month", icon: CreditCard },
];

const recentTransactions = [
  { id: 1, broker: "Sarah Johnson", type: "Subscription", plan: "Enterprise", amount: "$299", date: "2025-01-05", status: "completed" },
  { id: 2, broker: "Mike Chen", type: "Token Purchase", tokens: "500", amount: "$50", date: "2025-01-04", status: "completed" },
  { id: 3, broker: "Lisa Williams", type: "Upgrade", plan: "Professional → Enterprise", amount: "$200", date: "2025-01-03", status: "completed" },
  { id: 4, broker: "John Davis", type: "Subscription", plan: "Starter", amount: "$29", date: "2025-01-02", status: "completed" },
  { id: 5, broker: "Emily Brown", type: "Token Purchase", tokens: "200", amount: "$20", date: "2025-01-01", status: "pending" },
];

const planBreakdown = [
  { plan: "Starter", price: "$29/mo", brokers: 8, revenue: "$232", percentage: 33 },
  { plan: "Professional", price: "$99/mo", brokers: 12, revenue: "$1,188", percentage: 50 },
  { plan: "Enterprise", price: "$299/mo", brokers: 4, revenue: "$1,196", percentage: 17 },
];

export default function AdminSubscriptions() {
  return (
    <AdminLayout 
      title="Subscriptions & Revenue" 
      subtitle="Monitor subscription plans and revenue metrics"
    >
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
            {planBreakdown.map((plan) => (
              <div key={plan.plan} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`${
                      plan.plan === "Enterprise" ? "bg-accent/20 text-accent" :
                      plan.plan === "Professional" ? "bg-primary/20 text-primary" :
                      "bg-app-muted text-app-muted-foreground"
                    }`}>
                      {plan.plan}
                    </Badge>
                    <span className="text-sm text-app-muted">{plan.price}</span>
                  </div>
                  <span className="text-sm font-medium text-app-foreground">{plan.brokers} brokers</span>
                </div>
                <div className="w-full h-2 bg-app-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      plan.plan === "Enterprise" ? "bg-accent" :
                      plan.plan === "Professional" ? "bg-primary" :
                      "bg-app-muted-foreground"
                    }`}
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-app-muted text-right">{plan.revenue}/month</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-app-card border-app lg:col-span-2">
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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-app hover:bg-transparent">
                  <TableHead className="text-app-muted">Broker</TableHead>
                  <TableHead className="text-app-muted">Type</TableHead>
                  <TableHead className="text-app-muted">Amount</TableHead>
                  <TableHead className="text-app-muted">Date</TableHead>
                  <TableHead className="text-app-muted">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-app hover:bg-app-muted/30">
                    <TableCell className="font-medium text-app-foreground">{transaction.broker}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-app-foreground">{transaction.type}</p>
                        <p className="text-xs text-app-muted">{transaction.plan || `${transaction.tokens} tokens`}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-app-foreground">{transaction.amount}</TableCell>
                    <TableCell className="text-app-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {transaction.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${
                        transaction.status === "completed" ? "bg-primary/20 text-primary" : "bg-yellow-500/20 text-yellow-500"
                      }`}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
