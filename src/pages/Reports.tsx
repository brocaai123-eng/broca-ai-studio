import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  DollarSign,
  Download,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrocaLogo from "@/components/ui/BrocaLogo";

const stats = [
  { label: "Deals Closed", value: "24", change: "+8 vs last month", icon: TrendingUp, positive: true },
  { label: "Time Saved", value: "47h", change: "This month", icon: Clock, positive: true },
  { label: "AI Requests", value: "1,234", change: "This month", icon: Sparkles, positive: true },
  { label: "Revenue", value: "$156K", change: "+23% vs last month", icon: DollarSign, positive: true },
];

const monthlyData = [
  { month: "Jul", deals: 18, aiUsage: 890 },
  { month: "Aug", deals: 21, aiUsage: 1050 },
  { month: "Sep", deals: 19, aiUsage: 920 },
  { month: "Oct", deals: 25, aiUsage: 1180 },
  { month: "Nov", deals: 22, aiUsage: 1090 },
  { month: "Dec", deals: 24, aiUsage: 1234 },
];

const Reports = () => {
  const maxDeals = Math.max(...monthlyData.map(d => d.deals));

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <header className="h-20 border-b border-app bg-app-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-app-muted hover:text-app-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-xl font-semibold text-app-foreground">Reports & Analytics</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Last 30 Days
          </Button>
          <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
            <Download className="w-4 h-4 mr-2 text-primary" />
            Export
          </Button>
          <Link to="/">
            <BrocaLogo size="sm" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="app-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-app-muted mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-app-foreground">{stat.value}</p>
              <p className={`text-xs mt-2 ${stat.positive ? "text-primary" : "text-destructive"}`}>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Deals Chart */}
          <div className="app-card p-6">
            <h2 className="font-display text-lg font-semibold text-app-foreground mb-6">Deals Closed</h2>
            <div className="h-64 flex items-end justify-between gap-4">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary/80 rounded-t-lg transition-all duration-500 hover:bg-primary"
                    style={{ height: `${(data.deals / maxDeals) * 100}%` }}
                  />
                  <span className="text-xs text-app-muted">{data.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Usage Chart */}
          <div className="app-card p-6">
            <h2 className="font-display text-lg font-semibold text-app-foreground mb-6">AI Usage</h2>
            <div className="space-y-4">
              {monthlyData.map((data) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-app-muted">{data.month}</span>
                    <span className="text-app-foreground font-medium">{data.aiUsage} requests</span>
                  </div>
                  <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-broca-mint rounded-full transition-all duration-500"
                      style={{ width: `${(data.aiUsage / 1500) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="app-card p-6">
          <h2 className="font-display text-lg font-semibold text-app-foreground mb-6">Performance Insights</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-app-muted rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium text-app-foreground">Top AI Feature</span>
              </div>
              <p className="text-2xl font-bold text-app-foreground mb-1">Document Summaries</p>
              <p className="text-sm text-app-muted">456 uses this month</p>
            </div>
            <div className="p-4 bg-app-muted rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-medium text-app-foreground">Average Time Saved</span>
              </div>
              <p className="text-2xl font-bold text-app-foreground mb-1">2.3 hours/deal</p>
              <p className="text-sm text-app-muted">Compared to manual work</p>
            </div>
            <div className="p-4 bg-app-muted rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium text-app-foreground">Closing Rate</span>
              </div>
              <p className="text-2xl font-bold text-app-foreground mb-1">68%</p>
              <p className="text-sm text-app-muted">+12% since using BROCA</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
