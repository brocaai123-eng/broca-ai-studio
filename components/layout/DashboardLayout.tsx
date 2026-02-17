"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Sparkles, 
  Settings,
  Menu,
  X,
  FolderOpen,
  Coins,
  CreditCard,
  ClipboardList,
  Search,
  LogOut,
  UserPlus,
  Link as LinkIcon,
  Handshake,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BrocaLogo from "@/components/ui/BrocaLogo";
import { useProfile, useSubscription } from "@/lib/hooks/use-database";
import { useAuth } from "@/lib/supabase/auth-context";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", keywords: ["home", "overview", "stats"] },
  { icon: Users, label: "Clients", href: "/dashboard/clients", keywords: ["customer", "onboarding", "people"] },
  { icon: Handshake, label: "Collaboration", href: "/dashboard/collaboration", keywords: ["team", "collaborate", "milestones", "activity", "invites"] },
  { icon: Calendar, label: "Calendar", href: "/dashboard/calendar", keywords: ["schedule", "meetings", "events", "appointments", "reminders"] },
  { icon: LinkIcon, label: "Invite via Link", href: "/dashboard/invite-link", keywords: ["link", "share", "public", "form", "invite"] },
  { icon: ClipboardList, label: "Forms", href: "/dashboard/forms", keywords: ["template", "intake", "questionnaire"] },
  { icon: FolderOpen, label: "Documents", href: "/dashboard/documents", keywords: ["files", "upload", "pdf"] },
  { icon: Coins, label: "Tokens", href: "/dashboard/tokens", keywords: ["credits", "balance", "usage", "buy"] },
  { icon: CreditCard, label: "Subscription", href: "/dashboard/subscription", keywords: ["plan", "billing", "payment"] },
  { icon: UserPlus, label: "Invite Brokers", href: "/dashboard/referrals", keywords: ["referral", "invite", "earn", "bonus", "tokens"] },
  { icon: Sparkles, label: "AI Assistant", href: "/ai-assistant", keywords: ["chat", "help", "broca"] },
  { icon: Settings, label: "Settings", href: "/dashboard/settings", keywords: ["profile", "account", "preferences"] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, headerAction }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: subscription } = useSubscription();
  const { user, signOut } = useAuth();
  
  const tokensRemaining = subscription?.tokens_remaining || 0;

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

  // Get user initials from full name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Priority: profile.full_name > user_metadata.full_name > email username > "User"
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const userEmail = profile?.email || user?.email || "";
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
            <Link href="/">
              <BrocaLogo size="sm" variant="sidebar" />
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
                    ? "bg-sidebar-primary/20 text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium flex-1">{item.label}</span>
                {item.label === "Tokens" && (
                  <Badge className="bg-primary/20 text-primary text-xs px-2 py-0.5">
                    {tokensRemaining}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <span className="text-sidebar-foreground font-semibold">{userInitials}</span>
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
                      <item.icon className="w-5 h-5 text-primary" />
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
