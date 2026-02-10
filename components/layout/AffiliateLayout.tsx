"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  X,
  Search,
  LogOut,
  DollarSign,
  BookOpen,
  Link as LinkIcon,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BrocaLogo from "@/components/ui/BrocaLogo";
import { useAuth } from "@/lib/supabase/auth-context";
import { useAffiliateProfile } from "@/lib/hooks/use-affiliate";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/affiliate", keywords: ["home", "overview", "stats"] },
  { icon: Users, label: "Referrals", href: "/affiliate/referrals", keywords: ["customers", "signups", "conversions"] },
  { icon: DollarSign, label: "Commissions", href: "/affiliate/commissions", keywords: ["earnings", "payouts", "money", "balance"] },
  { icon: BookOpen, label: "Resources", href: "/affiliate/resources", keywords: ["guides", "videos", "marketing", "materials"] },
  { icon: Settings, label: "Settings", href: "/affiliate/settings", keywords: ["profile", "account", "payout", "preferences"] },
];

interface AffiliateLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

const AffiliateLayout = ({ children, title, subtitle, headerAction }: AffiliateLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data } = useAffiliateProfile();

  const affiliate = data?.affiliate;
  const stats = data?.stats;

  // Filter sidebar items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return sidebarItems.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.keywords?.some(k => k.includes(query))
    );
  }, [searchQuery]);

  const handleSearchSelect = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setSearchFocused(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = affiliate?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Affiliate";
  const userEmail = affiliate?.email || user?.email || "";
  const userInitials = getInitials(userName);

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
            <Link href="/affiliate" className="flex items-center gap-2">
              <BrocaLogo size="sm" variant="sidebar" />
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5">
                Affiliate
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
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${pathname === item.href
                    ? "bg-emerald-500/20 text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium flex-1">{item.label}</span>
                {item.label === "Commissions" && stats && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5">
                    ${stats.pending_balance?.toFixed(0) || '0'}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* Referral Link Quick Copy */}
          {affiliate?.referral_code && (
            <div className="px-4 pb-2">
              <div className="bg-sidebar-accent/50 rounded-lg p-3">
                <p className="text-xs text-sidebar-foreground/60 mb-1">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 flex-1 truncate">{`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?aff=${affiliate.referral_code}`}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/signup?aff=${affiliate.referral_code}`);
                    }}
                    className="text-sidebar-foreground/60 hover:text-emerald-400 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-semibold">{userInitials}</span>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 border-b border-app bg-app-card flex items-center justify-between px-6">
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
                placeholder="Search modules..."
                className="pl-10 w-72 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
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
                      <item.icon className="w-5 h-5 text-emerald-500" />
                      <span className="text-app-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchFocused && searchQuery && filteredItems.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-app-card border border-app rounded-lg shadow-lg z-50 p-4 text-center text-app-muted">
                  No modules found
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {headerAction}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
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

export default AffiliateLayout;
