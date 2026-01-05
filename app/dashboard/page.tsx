"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  X,
  Coins,
  Send,
  FolderOpen,
  CreditCard,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import BrocaLogo from "@/components/ui/BrocaLogo";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/dashboard/clients" },
  { icon: ClipboardList, label: "Forms", href: "/dashboard/forms" },
  { icon: FolderOpen, label: "Documents", href: "/dashboard/documents" },
  { icon: Coins, label: "Tokens", href: "/dashboard/tokens", badge: "234" },
  { icon: CreditCard, label: "Subscription", href: "/dashboard/subscription" },
  { icon: Sparkles, label: "AI Assistant", href: "/ai-assistant" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const stats = [
  { label: "Active Clients", value: "24", change: "+5 this week", icon: Users, color: "text-primary" },
  { label: "Pending Onboardings", value: "8", change: "3 need review", icon: Clock, color: "text-accent" },
  { label: "Documents Uploaded", value: "156", change: "+12 today", icon: FolderOpen, color: "text-blue-500" },
  { label: "Tokens Remaining", value: "234/500", change: "47% used", icon: Coins, color: "text-primary" },
];

const recentActivity = [
  { action: "Onboarding completed", client: "Sarah Johnson", time: "2 hours ago", status: "completed" },
  { action: "Documents uploaded", client: "Michael Brown", time: "4 hours ago", status: "completed" },
  { action: "ID verification pending", client: "Emily Davis", time: "5 hours ago", status: "pending" },
  { action: "Onboarding sent", client: "Robert Wilson", time: "Yesterday", status: "completed" },
  { action: "Form submitted", client: "Jennifer Martinez", time: "Yesterday", status: "completed" },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

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
            <Link href="/">
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
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${pathname === item.href 
                    ? "bg-sidebar-primary/20 text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <Badge className="bg-primary/20 text-primary text-xs px-2 py-0.5">
                    {item.badge}
                  </Badge>
                )}
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
            <p className="text-app-muted">Here's what's happening with your client onboardings today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="app-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    stat.color === "text-primary" ? "bg-primary/10" : 
                    stat.color === "text-accent" ? "bg-accent/10" : 
                    stat.color === "text-blue-500" ? "bg-blue-500/10" :
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
                      <p className="text-sm text-app-muted">{activity.client}</p>
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
                <Link href="/dashboard/clients">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <Send className="w-5 h-5 text-primary" />
                    Send Onboarding
                  </Button>
                </Link>
                <Link href="/ai-assistant">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Ask BROCA AI
                  </Button>
                </Link>
                <Link href="/dashboard/documents">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <FileText className="w-5 h-5 text-primary" />
                    Upload Document
                  </Button>
                </Link>
                <Link href="/dashboard/clients">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <Users className="w-5 h-5 text-primary" />
                    Add New Client
                  </Button>
                </Link>
                <Link href="/dashboard/tokens">
                  <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-app-card border-app hover:bg-app-muted text-app-foreground">
                    <Coins className="w-5 h-5 text-primary" />
                    Buy More Tokens
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
