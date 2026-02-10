'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AffiliateLayout from '@/components/layout/AffiliateLayout';
import { useAffiliateProfile, useUpdateAffiliateProfile } from '@/lib/hooks/use-affiliate';
import { useAuth } from '@/lib/supabase/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Save,
  User,
  CreditCard,
  Shield,
  Mail,
  Phone,
  Building,
  Globe,
  Banknote,
  CheckCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

export default function AffiliateSettingsPage() {
  return (
    <Suspense fallback={
      <AffiliateLayout title="Settings" subtitle="Manage your affiliate account">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AffiliateLayout>
    }>
      <AffiliateSettingsContent />
    </Suspense>
  );
}

function AffiliateSettingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { data, isLoading } = useAffiliateProfile();
  const { mutate: updateProfile, isPending: saving } = useUpdateAffiliateProfile();

  const affiliate = data?.affiliate;

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');

  // Payout form state
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutEmail, setPayoutEmail] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  // Check Stripe Connect status
  const { data: stripeStatus, refetch: refetchStripe } = useQuery({
    queryKey: ['stripe-connect-status', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/affiliate/stripe-connect?userId=${user!.id}`);
      if (!res.ok) throw new Error('Failed to check status');
      return res.json() as Promise<{
        connected: boolean;
        details_submitted: boolean;
        payouts_enabled: boolean;
      }>;
    },
    enabled: !!user,
  });

  // Handle Stripe Connect return
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success') {
      toast.success('Stripe account connected successfully!');
      refetchStripe();
    } else if (stripeParam === 'refresh') {
      toast.info('Please complete your Stripe setup.');
    }
  }, [searchParams, refetchStripe]);

  useEffect(() => {
    if (affiliate) {
      setFullName(affiliate.full_name || '');
      setPhone(affiliate.phone || '');
      setCompany(affiliate.company || '');
      setWebsite(affiliate.website || '');
      setBio(affiliate.bio || '');
      setPayoutMethod(affiliate.payout_method || '');
      setPayoutEmail(affiliate.payout_email || '');
    }
  }, [affiliate]);

  const handleSaveProfile = () => {
    updateProfile(
      {
        full_name: fullName,
        phone,
        company: company,
        website,
        bio,
      },
      {
        onSuccess: () => toast.success('Profile updated!'),
        onError: (err: Error) => toast.error(err.message || 'Failed to update profile'),
      }
    );
  };

  const handleSavePayout = () => {
    if (payoutMethod && !payoutEmail) {
      toast.error('Please enter a payout email address');
      return;
    }
    updateProfile(
      {
        payout_method: payoutMethod as any,
        payout_email: payoutEmail,
      },
      {
        onSuccess: () => toast.success('Payout settings updated!'),
        onError: (err: Error) => toast.error(err.message || 'Failed to update payout settings'),
      }
    );
  };

  if (isLoading) {
    return (
      <AffiliateLayout title="Settings" subtitle="Manage your affiliate account">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout title="Settings" subtitle="Manage your profile and payout preferences">
      <div className="max-w-2xl space-y-6">
        {/* Account Info (read-only) */}
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-app-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Account
            </CardTitle>
            <CardDescription>Your account details (cannot be changed here)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-app-muted text-xs">Email</Label>
                <p className="text-app-foreground font-medium">{user?.email || '—'}</p>
              </div>
              <div>
                <Label className="text-app-muted text-xs">Referral Code</Label>
                <p className="text-emerald-500 font-mono font-medium">{affiliate?.referral_code || '—'}</p>
              </div>
              <div>
                <Label className="text-app-muted text-xs">Commission Rate</Label>
                <p className="text-app-foreground font-medium">{affiliate?.commission_rate || 25}%</p>
              </div>
              <div>
                <Label className="text-app-muted text-xs">Status</Label>
                <p className="text-app-foreground font-medium capitalize">{affiliate?.status || 'active'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-app-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Profile Information
            </CardTitle>
            <CardDescription>Your public information and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-app-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="bg-app-muted border-app"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-app-foreground flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="bg-app-muted border-app"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-app-foreground flex items-center gap-2">
                  <Building className="w-3.5 h-3.5" />
                  Company
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company name"
                  className="bg-app-muted border-app"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-app-foreground flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Website
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://your-website.com"
                className="bg-app-muted border-app"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-app-foreground">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio about yourself or your business..."
                rows={3}
                className="bg-app-muted border-app resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveProfile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payout Settings */}
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-app-foreground flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Payout Settings
            </CardTitle>
            <CardDescription>Configure how you receive your commission payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stripe Connect Section */}
            <div className="rounded-lg border border-app p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span className="text-app-foreground font-medium">Stripe Connect</span>
                </div>
                {stripeStatus?.payouts_enabled ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : stripeStatus?.connected ? (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Setup Incomplete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-app-muted">Not Connected</Badge>
                )}
              </div>
              <p className="text-xs text-app-muted">
                Connect your Stripe account for automatic direct bank transfers. Stripe handles everything — bank details, identity verification, and payouts.
              </p>
              {stripeStatus?.payouts_enabled ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Your account is set up for automatic payouts.
                </p>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
                  disabled={connectLoading}
                  onClick={async () => {
                    setConnectLoading(true);
                    try {
                      const res = await fetch('/api/affiliate/stripe-connect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user?.id }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      window.location.href = data.url;
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to start Stripe setup');
                      setConnectLoading(false);
                    }
                  }}
                >
                  {connectLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {stripeStatus?.connected ? 'Complete Stripe Setup' : 'Connect Stripe Account'}
                </Button>
              )}
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-app" />
              <span className="mx-4 text-xs text-app-muted">or use manual payout method</span>
              <div className="flex-grow border-t border-app" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payoutMethod" className="text-app-foreground">Payout Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger className="bg-app-muted border-app">
                  <SelectValue placeholder="Select a payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe Connect (auto)</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="ach">Bank Transfer (ACH)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payoutMethod !== 'stripe' && (
              <div className="space-y-2">
                <Label htmlFor="payoutEmail" className="text-app-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  {payoutMethod === 'paypal' ? 'PayPal Email' : 'Payout Email'}
                </Label>
                <Input
                  id="payoutEmail"
                  type="email"
                  value={payoutEmail}
                  onChange={(e) => setPayoutEmail(e.target.value)}
                  placeholder={payoutMethod === 'paypal' ? 'your-paypal@email.com' : 'your-payout@email.com'}
                  className="bg-app-muted border-app"
                />
                <p className="text-xs text-app-muted">
                  {payoutMethod === 'paypal'
                    ? 'Admin will send your commissions to this PayPal address.'
                    : 'Admin will contact you at this email to arrange bank transfers.'}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSavePayout}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Payout Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
