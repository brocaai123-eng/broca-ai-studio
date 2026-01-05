"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings,
  Shield,
  Bell,
  Palette,
  Mail,
  CreditCard,
  Coins,
  Globe,
  Save,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Platform settings state
  const [platformSettings, setPlatformSettings] = useState({
    platformName: "Broca AI",
    platformEmail: "admin@broca.ai",
    supportEmail: "support@broca.ai",
    timezone: "UTC",
    defaultLanguage: "en"
  });

  // Token settings state
  const [tokenSettings, setTokenSettings] = useState({
    starterTokens: "100",
    professionalTokens: "500",
    enterpriseTokens: "unlimited",
    tokenPrice: "0.10",
    aiExtractionCost: "5",
    formSubmissionCost: "2",
    documentProcessingCost: "10"
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    brokerSignupAlert: true,
    subscriptionAlert: true,
    lowTokenAlert: true,
    weeklyReport: true
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your platform settings have been updated successfully.",
      });
    }, 1000);
  };

  return (
    <AdminLayout 
      title="Platform Settings" 
      subtitle="Configure global platform settings and preferences"
    >
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-app-muted border border-app">
          <TabsTrigger value="general" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="tokens" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Coins className="w-4 h-4 mr-2" />
            Tokens & Pricing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Platform Information
              </CardTitle>
              <CardDescription className="text-app-muted">
                Basic platform configuration and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input 
                    value={platformSettings.platformName}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input 
                    type="email"
                    value={platformSettings.platformEmail}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, platformEmail: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input 
                    type="email"
                    value={platformSettings.supportEmail}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Timezone</Label>
                  <Select value={platformSettings.timezone} onValueChange={(value) => setPlatformSettings({ ...platformSettings, timezone: value })}>
                    <SelectTrigger className="bg-app-muted border-app text-app-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-app-card border-app">
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                      <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                      <SelectItem value="CST">Central Time (CST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Token & Pricing Settings */}
        <TabsContent value="tokens" className="space-y-6">
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Plan Token Allocation
              </CardTitle>
              <CardDescription className="text-app-muted">
                Configure monthly token allocation for each subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Starter Plan (tokens/month)</Label>
                  <Input 
                    type="number"
                    value={tokenSettings.starterTokens}
                    onChange={(e) => setTokenSettings({ ...tokenSettings, starterTokens: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Professional Plan (tokens/month)</Label>
                  <Input 
                    type="number"
                    value={tokenSettings.professionalTokens}
                    onChange={(e) => setTokenSettings({ ...tokenSettings, professionalTokens: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enterprise Plan</Label>
                  <Input 
                    value="Unlimited"
                    disabled
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Token Pricing & Costs
              </CardTitle>
              <CardDescription className="text-app-muted">
                Set token prices and action costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Token Price (USD per token)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={tokenSettings.tokenPrice}
                    onChange={(e) => setTokenSettings({ ...tokenSettings, tokenPrice: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>AI Data Extraction Cost (tokens)</Label>
                  <Input 
                    type="number"
                    value={tokenSettings.aiExtractionCost}
                    onChange={(e) => setTokenSettings({ ...tokenSettings, aiExtractionCost: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Form Submission Cost (tokens)</Label>
                  <Input 
                    type="number"
                    value={tokenSettings.formSubmissionCost}
                    onChange={(e) => setTokenSettings({ ...tokenSettings, formSubmissionCost: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Document Processing Cost (tokens)</Label>
                  <Input 
                    type="number"
                    value={tokenSettings.documentProcessingCost}
                    onChange={(e) => setTokenSettings({ ...tokenSettings, documentProcessingCost: e.target.value })}
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Channels
              </CardTitle>
              <CardDescription className="text-app-muted">
                Enable or disable notification channels for the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">Email Notifications</p>
                  <p className="text-sm text-app-muted">Send notifications via email</p>
                </div>
                <Switch 
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">SMS Notifications</p>
                  <p className="text-sm text-app-muted">Send notifications via SMS</p>
                </div>
                <Switch 
                  checked={notificationSettings.smsNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Admin Alerts
              </CardTitle>
              <CardDescription className="text-app-muted">
                Configure alerts you want to receive as admin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">New Broker Signup</p>
                  <p className="text-sm text-app-muted">Get notified when a new broker joins</p>
                </div>
                <Switch 
                  checked={notificationSettings.brokerSignupAlert}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, brokerSignupAlert: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">Subscription Changes</p>
                  <p className="text-sm text-app-muted">Get notified on plan upgrades/downgrades</p>
                </div>
                <Switch 
                  checked={notificationSettings.subscriptionAlert}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, subscriptionAlert: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">Low Token Warnings</p>
                  <p className="text-sm text-app-muted">Alert when brokers run low on tokens</p>
                </div>
                <Switch 
                  checked={notificationSettings.lowTokenAlert}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, lowTokenAlert: checked })}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-app-foreground">Weekly Platform Report</p>
                  <p className="text-sm text-app-muted">Receive weekly analytics summary</p>
                </div>
                <Switch 
                  checked={notificationSettings.weeklyReport}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, weeklyReport: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Platform Branding
              </CardTitle>
              <CardDescription className="text-app-muted">
                Customize the look and feel of your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Platform Logo</Label>
                  <div className="border-2 border-dashed border-app rounded-lg p-8 text-center">
                    <Upload className="w-8 h-8 mx-auto text-app-muted mb-2" />
                    <p className="text-sm text-app-muted">Click to upload or drag and drop</p>
                    <p className="text-xs text-app-muted mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Favicon</Label>
                  <div className="border-2 border-dashed border-app rounded-lg p-8 text-center">
                    <Upload className="w-8 h-8 mx-auto text-app-muted mb-2" />
                    <p className="text-sm text-app-muted">Click to upload or drag and drop</p>
                    <p className="text-xs text-app-muted mt-1">ICO, PNG 32x32px</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded bg-primary border border-app" />
                    <Input defaultValue="#1EB980" className="bg-app-muted border-app text-app-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded bg-accent border border-app" />
                    <Input defaultValue="#FFD700" className="bg-app-muted border-app text-app-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-app-muted">
                Configure platform security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-app-muted">Require 2FA for admin accounts</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">Broker 2FA Requirement</p>
                  <p className="text-sm text-app-muted">Require 2FA for all broker accounts</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-app">
                <div>
                  <p className="font-medium text-app-foreground">Session Timeout</p>
                  <p className="text-sm text-app-muted">Auto-logout after inactivity</p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-40 bg-app-muted border-app text-app-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-app-card border-app text-app-foreground">
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-app-foreground">IP Whitelist</p>
                  <p className="text-sm text-app-muted">Restrict admin access to specific IPs</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-accent hover:bg-accent/90">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
}
