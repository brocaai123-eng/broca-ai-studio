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
  Menu,
  X,
  FolderOpen,
  Coins,
  CreditCard,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, headerAction }: DashboardLayoutProps) => {
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
            {headerAction || (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
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

export default DashboardLayout;
