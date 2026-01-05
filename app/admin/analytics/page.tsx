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
  BarChart3, 
  TrendingUp,
  Users,
  Coins,
  FileText,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

// Mock analytics data
const overviewStats = [
  { title: "Total Onboardings", value: "1,247", change: "+156 this month", changeType: "positive", icon: Users },
  { title: "Forms Submitted", value: "3,892", change: "+423 this month", changeType: "positive", icon: FileText },
  { title: "AI Extractions", value: "2,156", change: "+312 this month", changeType: "positive", icon: TrendingUp },
  { title: "Token Revenue", value: "$2,340", change: "+18% from last month", changeType: "positive", icon: Coins },
];

// Mock monthly data
const monthlyData = [
  { month: "Aug", onboardings: 89, forms: 245, revenue: 1200 },
  { month: "Sep", onboardings: 112, forms: 312, revenue: 1450 },
  { month: "Oct", onboardings: 134, forms: 389, revenue: 1680 },
  { month: "Nov", onboardings: 148, forms: 421, revenue: 1890 },
  { month: "Dec", onboardings: 156, forms: 456, revenue: 2100 },
  { month: "Jan", onboardings: 178, forms: 498, revenue: 2340 },
];

// Mock top performers
const topPerformers = [
  { name: "Sarah Johnson", onboardings: 45, forms: 128, efficiency: "98%" },
  { name: "Mike Chen", onboardings: 38, forms: 102, efficiency: "95%" },
  { name: "Lisa Williams", onboardings: 32, forms: 89, efficiency: "92%" },
  { name: "John Davis", onboardings: 28, forms: 76, efficiency: "90%" },
];

// Mock form analytics
const formAnalytics = [
  { type: "Real Estate", submissions: 1245, completion: "87%", avgTime: "12 min" },
  { type: "Insurance", submissions: 1023, completion: "92%", avgTime: "8 min" },
  { type: "Mortgage", submissions: 876, completion: "85%", avgTime: "15 min" },
  { type: "Custom Forms", submissions: 748, completion: "78%", avgTime: "18 min" },
];

export default function AdminAnalytics() {
  return (
    <AdminLayout 
      title="Platform Analytics" 
      subtitle="Comprehensive insights into platform performance"
    >
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
                </div>
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
        {/* Monthly Trend Chart (Visual representation) */}
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-app-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Monthly Trends
            </CardTitle>
            <CardDescription className="text-app-muted">Onboardings and form submissions over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-app-foreground font-medium">{data.month}</span>
                    <span className="text-app-muted">{data.onboardings} onboardings</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-2 bg-app-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(data.onboardings / 200) * 100}%` }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-app-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(data.forms / 500) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-app">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-app-muted">Onboardings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm text-app-muted">Forms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Brokers */}
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-app-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Performing Brokers
            </CardTitle>
            <CardDescription className="text-app-muted">By client onboardings this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={performer.name} className="flex items-center gap-4 p-3 rounded-lg bg-app-muted/30">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? "bg-accent/20 text-accent" :
                  index === 1 ? "bg-gray-400/20 text-gray-400" :
                  index === 2 ? "bg-amber-600/20 text-amber-600" :
                  "bg-app-muted text-app-muted-foreground"
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-app-foreground truncate">{performer.name}</p>
                  <p className="text-xs text-app-muted">{performer.forms} forms submitted</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-app-foreground">{performer.onboardings}</p>
                  <p className="text-xs text-primary">{performer.efficiency} efficiency</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Form Analytics */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Form Performance Analytics
          </CardTitle>
          <CardDescription className="text-app-muted">Breakdown by form type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {formAnalytics.map((form) => (
              <div key={form.type} className="p-4 rounded-lg bg-app-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-app-foreground">{form.type}</h4>
                  <Badge className="bg-primary/20 text-primary">{form.completion}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-app-muted">Submissions</span>
                    <span className="text-app-foreground font-medium">{form.submissions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-app-muted">Avg. Time</span>
                    <span className="text-app-foreground font-medium">{form.avgTime}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-app-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full"
                    style={{ width: form.completion }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
