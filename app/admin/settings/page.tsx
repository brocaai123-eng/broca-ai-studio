"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Globe,
  Save
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
      <div className="space-y-6">
        {/* General Settings */}
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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
