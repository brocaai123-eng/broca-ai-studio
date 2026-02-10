'use client';

import { useState } from 'react';
import AffiliateLayout from '@/components/layout/AffiliateLayout';
import { useAffiliateProfile, useAffiliateReferrals } from '@/lib/hooks/use-affiliate';
import { useAuth } from '@/lib/supabase/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAffiliateProfile();
  const { data: referrals } = useAffiliateReferrals();
  const [copied, setCopied] = useState(false);

  const affiliate = data?.affiliate;
  const stats = data?.stats;

  const referralLink = affiliate
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?aff=${affiliate.referral_code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return `${name[0]}***@${domain}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; classes: string }> = {
      clicked: { label: 'Clicked', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
      signed_up: { label: 'Signed Up', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
      trial: { label: 'Trial', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      active: { label: 'Active', classes: 'bg-green-100 text-green-700 border-green-200' },
      churned: { label: 'Churned', classes: 'bg-red-100 text-red-700 border-red-200' },
      refunded: { label: 'Refunded', classes: 'bg-orange-100 text-orange-700 border-orange-200' },
    };
    const cfg = config[status] || { label: status, classes: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={cfg.classes}>{cfg.label}</Badge>;
  };

  if (isLoading) {
    return (
      <AffiliateLayout title="Dashboard" subtitle="Your affiliate overview">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AffiliateLayout>
    );
  }

  const statCards = [
    {
      label: 'Active Referrals',
      value: stats?.active_referrals ?? 0,
      subtext: 'paying customers',
      icon: Users,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Monthly Commission',
      value: `$${(stats?.monthly_commission ?? 0).toFixed(2)}`,
      subtext: "this month's expected",
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Lifetime Earned',
      value: `$${(stats?.lifetime_earned ?? 0).toFixed(2)}`,
      subtext: 'total commissions',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Conversion Rate',
      value: `${stats?.conversion_rate ?? 0}%`,
      subtext: `${stats?.total_clicks ?? 0} total clicks`,
      icon: MousePointerClick,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  // Recent referrals (top 5)
  const recentReferrals = (referrals || []).slice(0, 5);

  return (
    <AffiliateLayout title="Dashboard" subtitle="Your affiliate overview at a glance">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-app-card border-app">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-app-foreground">{stat.value}</p>
                <p className="text-sm text-app-muted">{stat.label}</p>
                <p className="text-xs text-app-muted/70">{stat.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Link Section */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-emerald-500" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-app-muted rounded-lg px-4 py-3 font-mono text-sm text-app-foreground truncate border border-app">
              {referralLink || 'Loading...'}
            </div>
            <Button
              onClick={copyLink}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              disabled={!referralLink}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-emerald-500 font-medium">
            You earn {affiliate?.commission_rate || 25}% recurring commission on every active referral.
          </p>
        </CardContent>
      </Card>

      {/* Recent Referral Activity */}
      <Card className="bg-app-card border-app">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-app-foreground">Recent Referral Activity</CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/affiliate/referrals'}>
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentReferrals.length === 0 ? (
            <div className="text-center py-12 text-app-muted">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-1">No referrals yet</p>
              <p className="text-sm">Share your referral link to start earning commissions!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-app">
                  <TableHead className="text-app-muted">Customer</TableHead>
                  <TableHead className="text-app-muted">Plan</TableHead>
                  <TableHead className="text-app-muted">Status</TableHead>
                  <TableHead className="text-app-muted">MRR</TableHead>
                  <TableHead className="text-app-muted">Your Commission</TableHead>
                  <TableHead className="text-app-muted">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReferrals.map((ref) => (
                  <TableRow key={ref.id} className="border-app">
                    <TableCell className="text-app-foreground font-medium">
                      {ref.referred_name || maskEmail(ref.referred_email)}
                    </TableCell>
                    <TableCell className="text-app-foreground">
                      {ref.plan_name || '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(ref.status)}</TableCell>
                    <TableCell className="text-app-foreground">
                      ${Number(ref.mrr || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-emerald-500 font-medium">
                      ${Number(ref.monthly_commission || 0).toFixed(2)}/mo
                    </TableCell>
                    <TableCell className="text-app-muted">
                      {formatDate(ref.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AffiliateLayout>
  );
}
