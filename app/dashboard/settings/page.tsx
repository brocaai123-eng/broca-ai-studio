"use client";

import { useState } from "react";
import { 
  User,
  Bell,
  Palette,
  Plug,
  Shield,
  Upload,
  Save,
  Check,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";

const integrations = [
  { 
    id: "docusign", 
    name: "DocuSign", 
    description: "E-signature integration for contracts", 
    connected: true,
    icon: "📝"
  },
  { 
    id: "gmail", 
    name: "Gmail", 
    description: "Send emails through your Gmail account", 
    connected: true,
    icon: "✉️"
  },
  { 
    id: "dropbox", 
    name: "Dropbox", 
    description: "Cloud storage for documents", 
    connected: false,
    icon: "📦"
  },
  { 
    id: "google_drive", 
    name: "Google Drive", 
    description: "Store and sync documents", 
    connected: false,
    icon: "☁️"
  },
  { 
    id: "slack", 
    name: "Slack", 
    description: "Get notifications in Slack", 
    connected: false,
    icon: "💬"
  },
  { 
    id: "zapier", 
    name: "Zapier", 
    description: "Connect with 5000+ apps", 
    connected: false,
    icon: "⚡"
  },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifications, setNotifications] = useState({
    emailNewClient: true,
    emailDocumentUploaded: true,
    emailOnboardingComplete: true,
    emailWeeklyReport: false,
    pushDesktop: true,
    pushMobile: false,
  });

  return (
    <DashboardLayout 
      title="Settings" 
      subtitle="Manage your account settings and preferences"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-app-muted flex-wrap h-auto justify-start">
          <TabsTrigger value="profile" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Plug className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Personal Information</h3>
            
            <div className="flex items-start gap-6 mb-6">
              <div className="w-24 h-24 rounded-xl bg-app-muted flex items-center justify-center relative group cursor-pointer">
                <User className="w-10 h-10 text-app-muted" />
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
              <div className="space-y-2">
                <Label className="text-app-foreground">First Name</Label>
                <Input 
                  defaultValue="Sarah" 
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Last Name</Label>
                <Input 
                  defaultValue="Johnson" 
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Email</Label>
                <Input 
                  type="email"
                  defaultValue="sarah@acmerealty.com" 
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Phone</Label>
                <Input 
                  type="tel"
                  defaultValue="(555) 123-4567" 
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-app-foreground">Company</Label>
                <Input 
                  defaultValue="Acme Real Estate LLC" 
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">License Number</Label>
                <Input 
                  defaultValue="DRE-12345678" 
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Timezone</Label>
                <Select defaultValue="pst">
                  <SelectTrigger className="bg-app-muted border-app text-app-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-app-card border-app">
                    <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                    <SelectItem value="cst">Central Time (CST)</SelectItem>
                    <SelectItem value="est">Eastern Time (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-app flex justify-end">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Email Notifications</h3>
            <div className="space-y-4">
              {[
                { key: "emailNewClient", label: "New client added", description: "Get notified when a new client is added to your account" },
                { key: "emailDocumentUploaded", label: "Document uploaded", description: "Get notified when clients upload documents" },
                { key: "emailOnboardingComplete", label: "Onboarding complete", description: "Get notified when clients complete onboarding" },
                { key: "emailWeeklyReport", label: "Weekly summary report", description: "Receive a weekly summary of your activity" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-app-muted/50 border border-app">
                  <div>
                    <p className="font-medium text-app-foreground">{item.label}</p>
                    <p className="text-sm text-app-muted">{item.description}</p>
                  </div>
                  <Switch 
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [item.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Push Notifications</h3>
            <div className="space-y-4">
              {[
                { key: "pushDesktop", label: "Desktop notifications", description: "Show notifications on your desktop" },
                { key: "pushMobile", label: "Mobile notifications", description: "Show notifications on your mobile device" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-app-muted/50 border border-app">
                  <div>
                    <p className="font-medium text-app-foreground">{item.label}</p>
                    <p className="text-sm text-app-muted">{item.description}</p>
                  </div>
                  <Switch 
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [item.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Company Branding</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-xl bg-app-muted flex items-center justify-center relative group cursor-pointer">
                  <Palette className="w-10 h-10 text-app-muted" />
                  <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-app-foreground mb-1">Company Logo</h4>
                  <p className="text-sm text-app-muted mb-3">This will appear on client-facing pages and emails. Recommended size: 200x60px.</p>
                  <Button variant="outline" size="sm" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-app-foreground">Primary Color</Label>
                  <div className="flex gap-3">
                    <Input 
                      type="color" 
                      defaultValue="#6366F1"
                      className="w-12 h-10 p-1 bg-app-muted border-app"
                    />
                    <Input 
                      defaultValue="#6366F1"
                      className="bg-app-muted border-app text-app-foreground font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-app-foreground">Secondary Color</Label>
                  <div className="flex gap-3">
                    <Input 
                      type="color" 
                      defaultValue="#10B981"
                      className="w-12 h-10 p-1 bg-app-muted border-app"
                    />
                    <Input 
                      defaultValue="#10B981"
                      className="bg-app-muted border-app text-app-foreground font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-app-foreground">Custom Domain (Pro Feature)</Label>
                <div className="flex gap-3">
                  <Input 
                    placeholder="onboarding.yourcompany.com"
                    className="bg-app-muted border-app text-app-foreground"
                  />
                  <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                    Verify
                  </Button>
                </div>
                <p className="text-sm text-app-muted">Use your own domain for client-facing onboarding pages</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-app flex justify-end">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Connected Apps</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <div 
                  key={integration.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-app-muted/50 border border-app"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-app-card flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <p className="font-medium text-app-foreground">{integration.name}</p>
                      <p className="text-sm text-app-muted">{integration.description}</p>
                    </div>
                  </div>
                  {integration.connected ? (
                    <Button variant="outline" size="sm" className="bg-green-100 border-green-200 text-green-700 hover:bg-green-200">
                      <Check className="w-4 h-4 mr-1" />
                      Connected
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                      Connect
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Password</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-app-foreground">Current Password</Label>
                <Input 
                  type="password"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">New Password</Label>
                <Input 
                  type="password"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Confirm New Password</Label>
                <Input 
                  type="password"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
            </div>
            <div className="mt-6">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Update Password
              </Button>
            </div>
          </div>

          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-app-muted/50 border border-app">
              <div>
                <p className="font-medium text-app-foreground">Authenticator App</p>
                <p className="text-sm text-app-muted">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                Enable 2FA
              </Button>
            </div>
          </div>

          <div className="app-card p-6">
            <h3 className="font-display text-lg font-semibold text-app-foreground mb-6">Active Sessions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-app-muted/50 border border-app">
                <div>
                  <p className="font-medium text-app-foreground">Chrome on Windows</p>
                  <p className="text-sm text-app-muted">San Francisco, CA • Active now</p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-0">Current</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-app-muted/50 border border-app">
                <div>
                  <p className="font-medium text-app-foreground">Safari on iPhone</p>
                  <p className="text-sm text-app-muted">San Francisco, CA • Last active 2 hours ago</p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  Revoke
                </Button>
              </div>
            </div>
          </div>

          <div className="app-card p-6 border-red-200 bg-red-50/50">
            <h3 className="font-display text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-600 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
              Delete Account
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
