"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Settings,
  Search,
  Menu,
  X,
  Coins,
  CreditCard,
  Shield,
  UserPlus,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BrocaLogo from "@/components/ui/BrocaLogo";
import { useProfile } from "@/lib/hooks/use-database";
import { useAuth } from "@/lib/supabase/auth-context";
import { useAllBrokers } from "@/lib/hooks/use-admin";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

const AdminLayout = ({ children, title, subtitle, headerAction }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { user, signOut } = useAuth();
  const { data: brokers } = useAllBrokers();

  // Priority: profile.full_name > user_metadata.full_name > email username > "Platform Admin"
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Platform Admin";
  const userEmail = profile?.email || user?.email || "";

  const brokerCount = brokers?.length || 0;

  const adminSidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: Users, label: "Brokers", href: "/admin/brokers", badge: brokerCount > 0 ? brokerCount.toString() : undefined },
    { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
    { icon: Coins, label: "Tokens", href: "/admin/tokens" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  // Filter sidebar items based on search
  const filteredItems = adminSidebarItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setSearchFocused(false);
  };

  return (
    <div className="min-h-screen bg-app flex">
      {/* Fixed Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border">
            <Link href="/admin" className="flex items-center gap-2">
              <BrocaLogo size="sm" variant="sidebar" />
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

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-4 py-2 mt-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Sign Out</span>
            </button>
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

      {/* Main Content - with left margin for fixed sidebar */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top Header - Fixed */}
        <header className="sticky top-0 z-30 h-20 border-b border-app bg-app-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-app-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <Input 
                placeholder="Search brokers, subscriptions..." 
                className="pl-10 w-80 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              {searchFocused && searchQuery && filteredItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-app-card border border-app rounded-lg shadow-lg z-50 overflow-hidden">
                  {filteredItems.map((item) => (
                    <button
                      key={item.href}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-muted text-left transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(item.href); }}
                    >
                      <item.icon className="w-5 h-5 text-accent" />
                      <span className="text-app-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
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

        {/* Page Content - Scrollable */}
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
