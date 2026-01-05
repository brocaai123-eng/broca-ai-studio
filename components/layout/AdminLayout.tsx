"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Coins,
  CreditCard,
  BarChart3,
  Shield,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BrocaLogo from "@/components/ui/BrocaLogo";

const adminSidebarItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Brokers", href: "/admin/brokers", badge: "24" },
  { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: Coins, label: "Tokens", href: "/admin/tokens" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

const AdminLayout = ({ children, title, subtitle, headerAction }: AdminLayoutProps) => {
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
            <Link href="/admin" className="flex items-center gap-2">
              <BrocaLogo size="sm" />
              <Badge className="bg-accent/20 text-accent text-xs px-2 py-0.5">
                Admin
              </Badge>
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
            {adminSidebarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${pathname === item.href 
                    ? "bg-accent/20 text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <Badge className="bg-accent/20 text-accent text-xs px-2 py-0.5">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* Switch to Broker View */}
          <div className="px-4 pb-2">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                <Shield className="w-4 h-4 mr-2" />
                Switch to Broker View
              </Button>
            </Link>
          </div>

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">Platform Admin</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">admin@broca.ai</p>
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
                placeholder="Search brokers, subscriptions..." 
                className="pl-10 w-80 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-app-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            {headerAction || (
              <Link href="/admin/brokers">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Broker
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Page Title */}
          <div>
            <h1 className="font-display text-2xl font-bold text-app-foreground">{title}</h1>
            {subtitle && <p className="text-app-muted">{subtitle}</p>}
          </div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
