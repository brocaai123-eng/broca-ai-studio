"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { useBrokerStats, useClients, useSubscription } from "@/lib/hooks/use-database";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Users, 
  FileText, 
  Sparkles,
  Plus,
  Clock,
  CheckCircle,
  Coins,
  Send,
  FolderOpen,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/layout/DashboardLayout";

function DashboardContent() {
  const [processingPayment, setProcessingPayment] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const processedRef = useRef(false);
  
  // Fetch data from database
  const { data: stats, isLoading: statsLoading } = useBrokerStats();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useSubscription();

  // Handle successful payment - create subscription from Stripe session
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const subscriptionStatus = searchParams.get('subscription');
    
    if (sessionId && subscriptionStatus === 'success' && !processedRef.current) {
      processedRef.current = true;
      setProcessingPayment(true);
      
      // Call API to create subscription from Stripe session
      fetch('/api/stripe/success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(res => res.json())
        .then(async (data) => {
          if (data.success) {
            toast.success('Subscription activated successfully!');
            // Wait a bit for database to sync, then refresh
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Force clear cache and refetch
            queryClient.removeQueries({ queryKey: ['subscription'] });
            await refetchSubscription();
            // Set processing to false before redirecting
            setProcessingPayment(false);
            // Remove query params from URL
            router.replace('/dashboard');
          } else {
            toast.error(data.error || 'Failed to activate subscription');
            setProcessingPayment(false);
          }
        })
        .catch(err => {
          console.error('Error processing payment:', err);
          toast.error('Failed to process payment');
          setProcessingPayment(false);
        });
    }
  }, [searchParams, refetchSubscription, queryClient, router]);

  // Redirect to plan selection if no active subscription (but not while processing payment)
  useEffect(() => {
    // Wait for everything to load
    if (authLoading || subLoading) return;
    
    // Don't redirect if we're processing a payment
    if (processingPayment) return;
    
    // Don't redirect if there's a session_id in the URL (payment just completed)
    const sessionId = searchParams.get('session_id');
    if (sessionId) return;
    
    // If user is logged in but has no subscription, redirect to plan selection
    // Add a small delay to allow for any async state updates
    if (user && !subscription) {
      const timer = setTimeout(() => {
        router.push('/signup?step=plan');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, subscription, subLoading, authLoading, router, processingPayment, searchParams]);

  const isLoading = statsLoading || clientsLoading || subLoading || processingPayment;

  // Get user's name for the welcome message
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Show loading while processing payment
  if (processingPayment) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-app-foreground mb-2">Activating Your Subscription</h2>
          <p className="text-app-muted">Please wait while we set up your account...</p>
        </div>
      </div>
    );
  }

  // Prepare stats for display
  const displayStats = [
    { 
      label: "Active Clients", 
      value: stats?.total_clients?.toString() || "0", 
      change: `${stats?.active_clients || 0} active`, 
      icon: Users, 
      color: "text-primary" 
    },
    { 
      label: "Pending Onboardings", 
      value: clients?.filter(c => c.status === 'pending' || c.status === 'in_progress').length.toString() || "0", 
      change: "Need attention", 
      icon: Clock, 
      color: "text-accent" 
    },
    { 
      label: "Documents Uploaded", 
      value: stats?.total_documents?.toString() || "0", 
      change: "All time", 
      icon: FolderOpen, 
      color: "text-blue-500" 
    },
    { 
      label: "Tokens Remaining", 
      value: `${stats?.tokens_remaining || 0}/${subscription?.plan?.tokens_per_month || 0}`, 
      change: `${stats?.tokens_used || 0} used`, 
      icon: Coins, 
      color: "text-primary" 
    },
  ];

  // Get recent activity from clients
  const recentActivity = clients
    ?.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
    .slice(0, 5)
    .map(client => ({
      action: client.status === 'completed' ? 'Onboarding completed' : 
              client.status === 'in_progress' ? 'Documents submitted' :
              client.status === 'pending' ? 'Onboarding sent' : 'Onboarding expired',
      client: client.name,
      time: formatDistanceToNow(new Date(client.last_activity), { addSuffix: true }),
      status: client.status
    })) || [];

  return (
    <DashboardLayout 
      title={`Welcome back, ${userName.split(' ')[0]}`}
      subtitle="Here's what's happening with your client onboardings today."
      headerAction={
        <Link href="/dashboard/clients">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayStats.map((stat) => (
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
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-app-muted">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Add your first client to get started</p>
                </div>
              ) : (
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
              )}
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
        </>
      )}
    </DashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-app flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
