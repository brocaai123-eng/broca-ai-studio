'use client';

import { useState } from 'react';
import AffiliateLayout from '@/components/layout/AffiliateLayout';
import { useAffiliateReferrals } from '@/lib/hooks/use-affiliate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Search,
  Loader2,
  UserCheck,
} from 'lucide-react';

export default function AffiliateReferralsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: referrals, isLoading } = useAffiliateReferrals();

  const filteredReferrals = (referrals || []).filter((ref) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (ref.referred_name || '').toLowerCase();
    const email = (ref.referred_email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

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

  // Summary counters
  const allRefs = referrals || [];
  const activeCount = allRefs.filter((r) => r.status === 'active').length;

  const summaryCards = [
    { label: 'Active', count: activeCount, icon: UserCheck, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { label: 'Total', count: allRefs.length, icon: Users, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  ];

  return (
    <AffiliateLayout title="Referrals" subtitle="Track everyone you've referred to Broca">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="bg-app-card border-app">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-app-foreground">{card.count}</p>
                <p className="text-xs text-app-muted">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Table */}
      <Card className="bg-app-card border-app">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-app-foreground">All Referrals</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9 w-[240px] bg-app-muted border-app"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-12 text-app-muted">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-1">No referrals found</p>
              <p className="text-sm">Share your referral link to start earning!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-app">
                    <TableHead className="text-app-muted">Customer</TableHead>
                    <TableHead className="text-app-muted">Plan</TableHead>
                    <TableHead className="text-app-muted">MRR</TableHead>
                    <TableHead className="text-app-muted">Your Commission</TableHead>
                    <TableHead className="text-app-muted">Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((ref) => (
                    <TableRow key={ref.id} className="border-app">
                      <TableCell>
                        <div>
                          <p className="text-app-foreground font-medium">
                            {ref.referred_name || maskEmail(ref.referred_email)}
                          </p>
                          {ref.referred_name && (
                            <p className="text-xs text-app-muted">
                              {maskEmail(ref.referred_email)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-app-foreground">
                        {ref.plan_name || '—'}
                      </TableCell>
                      <TableCell className="text-app-foreground">
                        ${Number(ref.mrr || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-emerald-500 font-semibold">
                        ${Number(ref.monthly_commission || 0).toFixed(2)}/mo
                      </TableCell>
                      <TableCell className="text-app-muted">
                        {formatDate(ref.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AffiliateLayout>
  );
}
