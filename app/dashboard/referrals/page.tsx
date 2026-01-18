'use client';

import { useState } from 'react';
import { useReferrals, useCreateReferral, useCancelReferral } from '@/lib/hooks/use-database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Gift,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Send,
  UserPlus,
  Coins,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const { data, isLoading, refetch } = useReferrals();
  const createReferral = useCreateReferral();
  const cancelReferral = useCancelReferral();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSending, setIsSending] = useState(false);

  const referrals = data?.referrals || [];
  const statsData = data?.stats;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSending(true);
    try {
      await createReferral.mutateAsync({ email, name: name || undefined });
      toast.success('Invitation sent successfully!', {
        description: `An invitation has been sent to ${email}`,
      });
      setEmail('');
      setName('');
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error('Failed to send invitation', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelReferral = async (referralId: string) => {
    try {
      await cancelReferral.mutateAsync(referralId);
      toast.success('Invitation cancelled');
      refetch();
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/signup?ref=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Stats for display
  const stats = [
    { label: "Total Invites", value: (statsData?.total_invites || 0).toString(), subtext: "invitations sent", icon: Mail, color: "text-primary" },
    { label: "Pending", value: (statsData?.pending_invites || 0).toString(), subtext: "awaiting signup", icon: Clock, color: "text-yellow-500" },
    { label: "Accepted", value: (statsData?.accepted_invites || 0).toString(), subtext: "successful referrals", icon: TrendingUp, color: "text-green-500" },
    { label: "Tokens Earned", value: (statsData?.tokens_earned || 0).toString(), subtext: "from referrals", icon: Coins, color: "text-primary" },
  ];

  // Calculate conversion rate
  const conversionRate = statsData?.total_invites 
    ? ((statsData.accepted_invites / statsData.total_invites) * 100).toFixed(0) 
    : "0";

  if (isLoading) {
    return (
      <DashboardLayout title="Invite Brokers" subtitle="Earn 30 free tokens for each broker that signs up with your referral">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Invite Brokers" 
      subtitle="Earn 30 free tokens for each broker that signs up with your referral"
      headerAction={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-app-card border-app">
            <DialogHeader>
              <DialogTitle className="text-app-foreground">Invite a Broker</DialogTitle>
              <DialogDescription className="text-app-muted">
                Send an invitation to another broker. When they sign up, you'll receive 30 free tokens!
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendInvite}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-app-foreground">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="broker@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-app border-app"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-app-foreground">Name (Optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-app border-app"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSending} className="gap-2">
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="app-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-sm text-app-muted mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-app-foreground">{stat.value}</p>
            <p className="text-xs text-app-muted mt-1">{stat.subtext}</p>
          </div>
        ))}
      </div>

      {/* Conversion Rate */}
      <div className="app-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-app-foreground">Conversion Rate</h2>
          <span className="text-sm text-app-muted">{statsData?.accepted_invites || 0} / {statsData?.total_invites || 0} converted</span>
        </div>
        <div className="h-4 bg-app-muted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-broca-mint"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-app-muted">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* How It Works */}
      <div className="app-card p-6 mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-app-foreground">How It Works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">1</span>
            </div>
            <div>
              <h4 className="font-medium text-app-foreground">Send Invitation</h4>
              <p className="text-sm text-app-muted">Enter the email of a broker you'd like to invite to join BrocaAI.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">2</span>
            </div>
            <div>
              <h4 className="font-medium text-app-foreground">They Sign Up</h4>
              <p className="text-sm text-app-muted">Your referral receives an email with a personalized signup link.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">3</span>
            </div>
            <div>
              <h4 className="font-medium text-app-foreground">Get Rewarded</h4>
              <p className="text-sm text-app-muted">When they complete signup, you automatically receive <strong className="text-primary">30 free tokens!</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="app-card">
        <div className="p-6 border-b border-app">
          <h2 className="font-display text-lg font-semibold text-app-foreground">Your Referrals</h2>
          <p className="text-sm text-app-muted mt-1">Track all your sent invitations and their status</p>
        </div>
        <div className="p-6">
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-app-foreground mb-2">No referrals yet</h3>
              <p className="text-app-muted mb-4">
                Start inviting brokers and earn free tokens!
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Send Your First Invitation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-app hover:bg-transparent">
                    <TableHead className="text-app-muted">Email</TableHead>
                    <TableHead className="text-app-muted">Name</TableHead>
                    <TableHead className="text-app-muted">Status</TableHead>
                    <TableHead className="text-app-muted">Sent</TableHead>
                    <TableHead className="text-app-muted">Expires</TableHead>
                    <TableHead className="text-app-muted">Reward</TableHead>
                    <TableHead className="text-app-muted text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id} className="border-app">
                      <TableCell className="font-medium text-app-foreground">{referral.referred_email}</TableCell>
                      <TableCell className="text-app-foreground">{referral.referred_name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell className="text-app-muted">{formatDate(referral.created_at)}</TableCell>
                      <TableCell className="text-app-muted">{formatDate(referral.expires_at)}</TableCell>
                      <TableCell>
                        {referral.tokens_rewarded ? (
                          <span className="text-green-500 font-medium">+{referral.reward_amount} tokens</span>
                        ) : (
                          <span className="text-app-muted">{referral.reward_amount} tokens</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {referral.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyInviteLink(referral.referral_token)}
                                title="Copy invite link"
                                className="text-app-muted hover:text-app-foreground"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleCancelReferral(referral.id)}
                                title="Cancel invitation"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {referral.status === 'accepted' && referral.referred_user && (
                            <span className="text-sm text-app-muted">
                              {referral.referred_user.full_name || referral.referred_user.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
