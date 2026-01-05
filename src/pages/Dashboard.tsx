import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Sparkles, 
  BarChart3, 
  Settings,
  Bell,
  Search,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrocaLogo from "@/components/ui/BrocaLogo";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/dashboard/clients" },
  { icon: FileText, label: "Deals", href: "/dashboard/deals" },
  { icon: FileText, label: "Documents", href: "/dashboard/documents" },
  { icon: Sparkles, label: "AI Assistant", href: "/ai-assistant" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const stats = [
  { label: "Active Deals", value: "12", change: "+3 this week", icon: TrendingUp, color: "text-primary" },
  { label: "Pending Contracts", value: "5", change: "2 need attention", icon: Clock, color: "text-accent" },
  { label: "Follow-ups Due", value: "8", change: "Today", icon: AlertCircle, color: "text-destructive" },
  { label: "AI Requests Used", value: "234/500", change: "47% used", icon: Sparkles, color: "text-primary" },
];

const recentActivity = [
  { action: "Contract summarized", deal: "Smith Property", time: "2 hours ago", status: "completed" },
  { action: "Email drafted", deal: "Johnson Listing", time: "4 hours ago", status: "completed" },
  { action: "Follow-up reminder", deal: "Williams Offer", time: "5 hours ago", status: "pending" },
  { action: "Deal analyzed", deal: "Brown Estate", time: "Yesterday", status: "completed" },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-app flex">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border">
            <Link to="/">
              <BrocaLogo size="sm" />
            </Link>
            <button 
              className="lg:hidden text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${location.pathname === item.href 
                    ? "bg-sidebar-primary/20 text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <span className="text-sidebar-foreground font-semibold">JS</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">John Smith</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">john@realestate.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-20 border-b border-app bg-app-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-app-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-app-muted" />
              <Input 
                placeholder="Search clients, deals, documents..." 
                className="pl-10 w-80 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-app-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Welcome */}
          <div>
            <h1 className="font-display text-2xl font-bold text-app-foreground">Welcome back, John</h1>
            <p className="text-app-muted">Here's what's happening with your deals today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="app-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    stat.color === "text-primary" ? "bg-primary/10" : 
                    stat.color === "text-accent" ? "bg-accent/10" : 
                    "bg-destructive/10"
                  }`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-sm text-app-muted mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-app-foreground">{stat.value}</p>
                <p className="text-xs text-app-muted mt-2">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 app-card p-6">
              <h2 className="font-display text-lg font-semibold text-app-foreground mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-app-muted rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === "completed" ? "bg-primary/20" : "bg-accent/20"
                    }`}>
                      {activity.status === "completed" 
                        ? <CheckCircle className="w-4 h-4 text-primary" />
                        : <Clock className="w-4 h-4 text-accent" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-app-foreground">{activity.action}</p>
                      <p className="text-sm text-app-muted">{activity.deal}</p>
                    </div>
                    <span className="text-xs text-app-muted">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="app-card p-6">
              <h2 className="font-display text-lg font-semibold text-app-foreground mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/ai-assistant">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Ask BROCA AI
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Upload Document
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Add New Client
                </Button>
                <Link to="/reports">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    View Reports
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
