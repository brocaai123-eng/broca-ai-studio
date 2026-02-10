'use client';

import { useState } from 'react';
import AffiliateLayout from '@/components/layout/AffiliateLayout';
import { useAffiliateCommissions, useAffiliatePayouts, useRequestPayout } from '@/lib/hooks/use-affiliate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Wallet,
  ArrowDownToLine,
  Clock,
  Loader2,
  Banknote,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliateCommissionsPage() {
  const { data: commData, isLoading: loadingComm } = useAffiliateCommissions();
  const { data: payoutData, isLoading: loadingPayouts } = useAffiliatePayouts();
  const { mutate: requestPayout, isPending: requestingPayout } = useRequestPayout();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const commissions = commData?.commissions || [];
  const summary = commData?.summary || {
    current_balance: 0,
    pending_balance: 0,
    total_paid: 0,
    total_earned: 0,
  };
  const payouts = payoutData?.payouts || [];
  const availableBalance = payoutData?.available_balance ?? summary.current_balance;

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    requestPayout(
      amount,
      {
        onSuccess: () => {
          toast.success('Payout request submitted!');
          setPayoutAmount('');
          setDialogOpen(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to request payout');
        },
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCommissionStatusBadge = (status: string) => {
    const config: Record<string, { label: string; classes: string }> = {
      pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      approved: { label: 'Approved', classes: 'bg-green-100 text-green-700 border-green-200' },
      paid: { label: 'Paid', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
      reversed: { label: 'Reversed', classes: 'bg-red-100 text-red-700 border-red-200' },
    };
    const cfg = config[status] || { label: status, classes: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={cfg.classes}>{cfg.label}</Badge>;
  };

  const getPayoutStatusBadge = (status: string) => {
    const config: Record<string, { label: string; classes: string }> = {
      requested: { label: 'Requested', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      processing: { label: 'Processing', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
      completed: { label: 'Completed', classes: 'bg-green-100 text-green-700 border-green-200' },
      failed: { label: 'Failed', classes: 'bg-red-100 text-red-700 border-red-200' },
    };
    const cfg = config[status] || { label: status, classes: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={cfg.classes}>{cfg.label}</Badge>;
  };

  const balanceCards = [
    {
      label: 'Available Balance',
      value: `$${Number(availableBalance).toFixed(2)}`,
      subtext: 'Ready to withdraw',
      icon: Wallet,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Pending',
      value: `$${Number(summary.pending_balance).toFixed(2)}`,
      subtext: 'Awaiting approval',
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Paid Out',
      value: `$${Number(summary.total_paid).toFixed(2)}`,
      subtext: 'All time withdrawals',
      icon: ArrowDownToLine,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Earned',
      value: `$${Number(summary.total_earned).toFixed(2)}`,
      subtext: 'Lifetime commissions',
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const isLoading = loadingComm || loadingPayouts;

  if (isLoading) {
    return (
      <AffiliateLayout title="Commissions" subtitle="Your earnings and payouts">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout title="Commissions" subtitle="Track your earnings and request payouts">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {balanceCards.map((card) => (
          <Card key={card.label} className="bg-app-card border-app">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-app-foreground">{card.value}</p>
                <p className="text-sm text-app-muted">{card.label}</p>
                <p className="text-xs text-app-muted/70">{card.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Payout Button */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Banknote className="w-4 h-4 mr-2" />
              Request Payout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
              <DialogDescription>
                Available balance: <span className="text-emerald-500 font-semibold">${Number(availableBalance).toFixed(2)}</span>
                <br />
                Minimum payout: $50.00
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium text-app-foreground mb-2 block">
                Amount to withdraw
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-7"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  min="50"
                  step="0.01"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleRequestPayout}
                disabled={requestingPayout}
              >
                {requestingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Request Payout
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Commission History */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground">Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12 text-app-muted">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-1">No commissions yet</p>
              <p className="text-sm">Commissions will appear here when your referrals subscribe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-app">
                    <TableHead className="text-app-muted">Date</TableHead>
                    <TableHead className="text-app-muted">Plan</TableHead>
                    <TableHead className="text-app-muted">Amount</TableHead>
                    <TableHead className="text-app-muted">Status</TableHead>
                    <TableHead className="text-app-muted">Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((comm) => (
                    <TableRow key={comm.id} className="border-app">
                      <TableCell className="text-app-muted">
                        {formatDate(comm.created_at)}
                      </TableCell>
                      <TableCell className="text-app-foreground">
                        {comm.plan_name || '—'}
                      </TableCell>
                      <TableCell className="text-emerald-500 font-semibold">
                        ${Number(comm.commission_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getCommissionStatusBadge(comm.status)}</TableCell>
                      <TableCell className="text-app-muted">
                        {comm.period_start
                          ? `${formatDate(comm.period_start)} – ${formatDate(comm.period_end || comm.period_start)}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      {payouts.length > 0 && (
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-app-foreground">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-app">
                    <TableHead className="text-app-muted">Date</TableHead>
                    <TableHead className="text-app-muted">Amount</TableHead>
                    <TableHead className="text-app-muted">Method</TableHead>
                    <TableHead className="text-app-muted">Status</TableHead>
                    <TableHead className="text-app-muted">Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id} className="border-app">
                      <TableCell className="text-app-muted">
                         {formatDate(payout.created_at)}
                      </TableCell>
                      <TableCell className="text-emerald-500 font-semibold">
                        ${Number(payout.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-app-foreground capitalize">
                        {(payout.payout_method || '—').replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                      <TableCell className="text-app-muted">
                        {payout.paid_at ? formatDate(payout.paid_at) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </AffiliateLayout>
  );
}
