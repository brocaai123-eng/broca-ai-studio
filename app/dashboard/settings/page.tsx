"use client";

import { useState, useEffect } from "react";
import { 
  User,
  Upload,
  Save,
  Loader2,
  Share2,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-database";
import { useAuth } from "@/lib/supabase/auth-context";
import { toast } from "sonner";
import Link from "next/link";

export default function Settings() {
  const { data: profile, isLoading } = useProfile();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [isActivatingAffiliate, setIsActivatingAffiliate] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    if (user) {
      fetch(`/api/affiliate?userId=${user.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.affiliate) setIsAffiliate(true); })
        .catch(() => {});
    }
  }, [user]);

  const handleActivateAffiliate = async () => {
    if (!user || !profile) return;
    setIsActivatingAffiliate(true);
    try {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: profile.email,
          fullName: profile.full_name || profile.email,
        }),
      });
      if (res.ok) {
        setIsAffiliate(true);
        toast.success("Affiliate account activated! You can now earn commissions.");
      } else {
        const data = await res.json();
        if (data.error?.includes('already')) {
          setIsAffiliate(true);
        } else {
          toast.error(data.error || "Failed to activate affiliate");
        }
      }
    } catch {
      toast.error("Failed to activate affiliate account");
    } finally {
      setIsActivatingAffiliate(false);
    }
  };

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        company: profile.company || "",
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: formData.full_name,
        phone: formData.phone,
        company: formData.company,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Settings" subtitle="Manage your account settings and preferences">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Settings" 
      subtitle="Manage your account settings and preferences"
    >
      {/* Profile Section */}
      <div className="space-y-6">
        <div className="app-card p-6">
          <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Personal Information</h3>
          
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 rounded-xl bg-app-muted flex items-center justify-center relative group cursor-pointer">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-xl object-cover" />
              ) : (
                <User className="w-10 h-10 text-app-muted" />
              )}
              <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-app-foreground mb-1">Profile Photo</h4>
              <p className="text-sm text-app-muted mb-3">JPG, PNG or GIF. Max size 2MB.</p>
              <Button variant="outline" size="sm" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-app-foreground">Full Name</Label>
              <Input 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="bg-app-muted border-app text-app-foreground"
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-app-foreground">Email</Label>
              <Input 
                type="email"
                value={formData.email}
                disabled
                className="bg-app-muted border-app text-app-foreground opacity-60"
              />
              <p className="text-xs text-app-muted">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label className="text-app-foreground">Phone</Label>
              <Input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-app-muted border-app text-app-foreground"
                placeholder="Enter your phone number"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-app-foreground">Company</Label>
              <Input 
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="bg-app-muted border-app text-app-foreground"
                placeholder="Enter your company name"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-app flex justify-end">
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
        {/* Affiliate Marketing Section */}
        <div className="app-card p-6">
          <h3 className="font-display text-lg font-semibold text-app-foreground mb-4">Affiliate Marketing</h3>
          <p className="text-sm text-app-muted mb-4">
            Earn commissions by referring new users to BrocaAI. Every registered account can become an affiliate marketer.
          </p>

          {isAffiliate ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Affiliate account active</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">You are earning 25% commission on referrals</p>
              </div>
              <Link href="/affiliate">
                <Button variant="outline" size="sm">View Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Share2 className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-app-foreground">Start earning today</p>
                <p className="text-xs text-app-muted">25% commission on every subscription referral</p>
              </div>
              <Button
                onClick={handleActivateAffiliate}
                disabled={isActivatingAffiliate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isActivatingAffiliate ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                Become an Affiliate
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
