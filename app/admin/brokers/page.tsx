"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  UserPlus, 
  Search,
  MoreHorizontal,
  Mail,
  Coins,
  Edit,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  useAllBrokers, 
  useBrokerInvitations, 
  useCreateInvitation, 
  useResendInvitation,
  useDeleteInvitation,
  useAllSubscriptionPlans
} from "@/lib/hooks/use-admin";
import { formatDistanceToNow } from "date-fns";

export default function AdminBrokers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    plan: ""
  });

  const { data: brokers, isLoading: brokersLoading } = useAllBrokers();
  const { data: invitations, isLoading: invitationsLoading } = useBrokerInvitations();
  const { data: plans } = useAllSubscriptionPlans();
  const createInvitation = useCreateInvitation();
  const resendInvitation = useResendInvitation();
  const deleteInvitation = useDeleteInvitation();

  const isLoading = brokersLoading || invitationsLoading;

  const filteredBrokers = (brokers || []).filter(broker => {
    const matchesSearch = 
      (broker.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (broker.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "all" || 
      (broker.subscription?.plan?.name?.toLowerCase() || '') === filterPlan.toLowerCase();
    return matchesSearch && matchesPlan;
  });

  const pendingInvitations = (invitations || []).filter(i => i.status === 'pending');

  const handleInvite = async () => {
    try {
      await createInvitation.mutateAsync({
        email: inviteForm.email,
        name: inviteForm.name,
        planId: inviteForm.plan || undefined
      });
      toast({ title: "Invitation Sent!", description: `An invitation has been sent to ${inviteForm.email}` });
      setInviteDialogOpen(false);
      setInviteForm({ name: "", email: "", plan: "" });
    } catch {
      toast({ title: "Error", description: "Failed to send invitation", variant: "destructive" });
    }
  };

  const handleResendInvite = async (invitationId: string, email: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
      toast({ title: "Invitation Resent", description: `A new invitation has been sent to ${email}` });
    } catch {
      toast({ title: "Error", description: "Failed to resend invitation", variant: "destructive" });
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      await deleteInvitation.mutateAsync(invitationId);
      toast({ title: "Invitation Deleted", description: "The invitation has been removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete invitation", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-primary/20 text-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case "pending": return <Badge className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "expired": return <Badge className="bg-destructive/20 text-destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (planName?: string) => {
    if (!planName) return <Badge className="bg-app-muted text-app-muted-foreground">No Plan</Badge>;
    switch (planName) {
      case "Enterprise": return <Badge className="bg-accent/20 text-accent">{planName}</Badge>;
      case "Professional": return <Badge className="bg-primary/20 text-primary">{planName}</Badge>;
      default: return <Badge className="bg-app-muted text-app-muted-foreground">{planName}</Badge>;
    }
  };

  return (
    <AdminLayout 
      title="Broker Management" 
      subtitle="Invite and manage broker accounts"
      headerAction={
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Broker
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-app-card border-app text-app-foreground">
            <DialogHeader>
              <DialogTitle>Invite New Broker</DialogTitle>
              <DialogDescription className="text-app-muted">Send an invitation email to a new broker.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Smith" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className="bg-app-muted border-app text-app-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" placeholder="john@company.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="bg-app-muted border-app text-app-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Initial Plan</Label>
                <Select value={inviteForm.plan} onValueChange={(value) => setInviteForm({ ...inviteForm, plan: value })}>
                  <SelectTrigger className="bg-app-muted border-app text-app-foreground"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                  <SelectContent className="bg-app-card border-app text-app-foreground">
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name} - {plan.tokens_per_month === -1 ? 'Unlimited' : plan.tokens_per_month} tokens/month</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="border-app text-app-foreground bg-app-card hover:bg-app-muted">Cancel</Button>
              <Button onClick={handleInvite} className="bg-accent hover:bg-accent/90" disabled={createInvitation.isPending || !inviteForm.email}>
                {createInvitation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="brokers" className="space-y-6">
          <TabsList className="bg-app-muted border border-app">
            <TabsTrigger value="brokers" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
              <Users className="w-4 h-4 mr-2" />All Brokers ({brokers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
              <Mail className="w-4 h-4 mr-2" />Pending Invitations ({pendingInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brokers" className="space-y-6">
            <Card className="bg-app-card border-app">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted-foreground" />
                    <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-app-muted border-app text-app-foreground" />
                  </div>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger className="w-full md:w-40 bg-app-muted border-app text-app-foreground"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Plan" /></SelectTrigger>
                    <SelectContent className="bg-app-card border-app text-app-foreground">
                      <SelectItem value="all">All Plans</SelectItem>
                      {plans?.map((plan) => (<SelectItem key={plan.id} value={plan.name.toLowerCase()}>{plan.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-app-card border-app">
              <CardHeader>
                <CardTitle className="text-app-foreground">Registered Brokers</CardTitle>
                <CardDescription className="text-app-muted">{filteredBrokers.length} broker{filteredBrokers.length !== 1 ? 's' : ''} found</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredBrokers.length === 0 ? (
                  <div className="text-center py-12 text-app-muted">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No brokers found</p>
                    <p className="text-sm">Invite brokers to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-app">
                        <TableHead className="text-app-muted">Broker</TableHead>
                        <TableHead className="text-app-muted">Plan</TableHead>
                        <TableHead className="text-app-muted">Clients</TableHead>
                        <TableHead className="text-app-muted">Tokens</TableHead>
                        <TableHead className="text-app-muted">Joined</TableHead>
                        <TableHead className="text-app-muted w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBrokers.map((broker) => (
                        <TableRow key={broker.id} className="border-app">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                                <span className="text-accent font-semibold">{(broker.full_name || broker.email)?.[0]?.toUpperCase() || '?'}</span>
                              </div>
                              <div>
                                <p className="font-medium text-app-foreground">{broker.full_name || 'No Name'}</p>
                                <p className="text-sm text-app-muted">{broker.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getPlanBadge(broker.subscription?.plan?.name)}</TableCell>
                          <TableCell className="text-app-foreground">{broker.clients_count || 0}</TableCell>
                          <TableCell className="text-app-foreground">
                            {broker.subscription?.plan?.tokens_per_month === -1 ? <span className="text-accent">∞</span> : <>{broker.subscription?.tokens_remaining || 0} / {broker.subscription?.plan?.tokens_per_month || 0}</>}
                          </TableCell>
                          <TableCell className="text-app-muted">{broker.created_at ? formatDistanceToNow(new Date(broker.created_at), { addSuffix: true }) : 'Unknown'}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-app-muted hover:text-app-foreground"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-app-card border-app text-app-foreground">
                                <DropdownMenuItem className="hover:bg-app-muted cursor-pointer"><Edit className="w-4 h-4 mr-2" />Edit Broker</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-app-muted cursor-pointer"><Coins className="w-4 h-4 mr-2" />Add Tokens</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-app-muted" />
                                <DropdownMenuItem className="text-destructive hover:bg-destructive/10 cursor-pointer"><Trash2 className="w-4 h-4 mr-2" />Delete Broker</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            <Card className="bg-app-card border-app">
              <CardHeader>
                <CardTitle className="text-app-foreground">Pending Invitations</CardTitle>
                <CardDescription className="text-app-muted">Invitations waiting for broker registration</CardDescription>
              </CardHeader>
              <CardContent>
                {invitations?.length === 0 ? (
                  <div className="text-center py-12 text-app-muted">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No pending invitations</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-app">
                        <TableHead className="text-app-muted">Email</TableHead>
                        <TableHead className="text-app-muted">Name</TableHead>
                        <TableHead className="text-app-muted">Plan</TableHead>
                        <TableHead className="text-app-muted">Sent</TableHead>
                        <TableHead className="text-app-muted">Status</TableHead>
                        <TableHead className="text-app-muted w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations?.map((invitation) => (
                        <TableRow key={invitation.id} className="border-app">
                          <TableCell className="text-app-foreground">{invitation.email}</TableCell>
                          <TableCell className="text-app-foreground">{invitation.name || '-'}</TableCell>
                          <TableCell>{getPlanBadge(invitation.plan?.name)}</TableCell>
                          <TableCell className="text-app-muted">{invitation.created_at ? formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true }) : 'Unknown'}</TableCell>
                          <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleResendInvite(invitation.id, invitation.email)} disabled={resendInvitation.isPending} className="text-app-muted hover:text-app-foreground"><Send className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteInvitation(invitation.id)} disabled={deleteInvitation.isPending} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}
