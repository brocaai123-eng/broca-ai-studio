"use client";

import { useState, useEffect } from "react";
import { 
  User,
  Upload,
  Save,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-database";
import { toast } from "sonner";

export default function Settings() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

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
      </div>
    </DashboardLayout>
  );
}
