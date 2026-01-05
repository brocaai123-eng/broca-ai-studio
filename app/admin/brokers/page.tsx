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
  Building,
  Calendar,
  Coins,
  Edit,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock brokers data
const mockBrokers = [
  { 
    id: 1, 
    name: "Sarah Johnson", 
    email: "sarah@realestate.com", 
    phone: "+1 555-0101",
    company: "Johnson Realty",
    plan: "Enterprise",
    status: "active",
    clients: 45,
    tokens: 1200,
    tokensUsed: 3400,
    joinedAt: "2024-06-15",
    lastActive: "2 hours ago"
  },
  { 
    id: 2, 
    name: "Mike Chen", 
    email: "mike@insurance.com", 
    phone: "+1 555-0102",
    company: "Chen Insurance",
    plan: "Professional",
    status: "active",
    clients: 38,
    tokens: 980,
    tokensUsed: 2100,
    joinedAt: "2024-07-20",
    lastActive: "5 hours ago"
  },
  { 
    id: 3, 
    name: "Lisa Williams", 
    email: "lisa@mortgage.com", 
    phone: "+1 555-0103",
    company: "Williams Mortgage",
    plan: "Professional",
    status: "active",
    clients: 32,
    tokens: 750,
    tokensUsed: 1800,
    joinedAt: "2024-08-10",
    lastActive: "1 day ago"
  },
  { 
    id: 4, 
    name: "John Davis", 
    email: "john@realestate.com", 
    phone: "+1 555-0104",
    company: "Davis Properties",
    plan: "Starter",
    status: "active",
    clients: 28,
    tokens: 620,
    tokensUsed: 880,
    joinedAt: "2024-09-01",
    lastActive: "3 days ago"
  },
  { 
    id: 5, 
    name: "Emily Brown", 
    email: "emily@insurance.com", 
    phone: "+1 555-0105",
    company: "Brown Insurance Group",
    plan: "Starter",
    status: "pending",
    clients: 0,
    tokens: 100,
    tokensUsed: 0,
    joinedAt: "2025-01-03",
    lastActive: "Never"
  },
];

// Mock pending invitations
const mockInvitations = [
  { id: 1, email: "alex@realestate.com", name: "Alex Thompson", plan: "Professional", sentAt: "2025-01-02", status: "pending" },
  { id: 2, email: "maria@mortgage.com", name: "Maria Garcia", plan: "Starter", sentAt: "2025-01-01", status: "pending" },
  { id: 3, email: "david@insurance.com", name: "David Lee", plan: "Enterprise", sentAt: "2024-12-28", status: "expired" },
];

export default function AdminBrokers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    company: "",
    plan: "starter"
  });

  const filteredBrokers = mockBrokers.filter(broker => {
    const matchesSearch = broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         broker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         broker.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "all" || broker.plan.toLowerCase() === filterPlan.toLowerCase();
    const matchesStatus = filterStatus === "all" || broker.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleInvite = () => {
    toast({
      title: "Invitation Sent!",
      description: `An invitation has been sent to ${inviteForm.email}`,
    });
    setInviteDialogOpen(false);
    setInviteForm({ name: "", email: "", company: "", plan: "starter" });
  };

  const handleResendInvite = (email: string) => {
    toast({
      title: "Invitation Resent",
      description: `A new invitation has been sent to ${email}`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary/20 text-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "expired":
        return <Badge className="bg-destructive/20 text-destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "Enterprise":
        return <Badge className="bg-accent/20 text-accent">{plan}</Badge>;
      case "Professional":
        return <Badge className="bg-primary/20 text-primary">{plan}</Badge>;
      default:
        return <Badge className="bg-app-muted text-app-muted-foreground">{plan}</Badge>;
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
              <DialogDescription className="text-app-muted">
                Send an invitation email to a new broker to join the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  placeholder="John Smith"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground placeholder:text-app-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email"
                  placeholder="john@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground placeholder:text-app-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  placeholder="Smith Realty"
                  value={inviteForm.company}
                  onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground placeholder:text-app-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Plan</Label>
                <Select value={inviteForm.plan} onValueChange={(value) => setInviteForm({ ...inviteForm, plan: value })}>
                  <SelectTrigger className="bg-app-muted border-app text-app-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-app-card border-app text-app-foreground">
                    <SelectItem value="starter">Starter - 100 tokens/month</SelectItem>
                    <SelectItem value="professional">Professional - 500 tokens/month</SelectItem>
                    <SelectItem value="enterprise">Enterprise - Unlimited tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="border-app text-app-foreground bg-app-card hover:bg-app-muted">
                Cancel
              </Button>
              <Button onClick={handleInvite} className="bg-accent hover:bg-accent/90">
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Tabs defaultValue="brokers" className="space-y-6">
        <TabsList className="bg-app-muted border border-app">
          <TabsTrigger value="brokers" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Users className="w-4 h-4 mr-2" />
            All Brokers ({mockBrokers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">
            <Mail className="w-4 h-4 mr-2" />
            Pending Invitations ({mockInvitations.filter(i => i.status === "pending").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brokers" className="space-y-6">
          {/* Filters */}
          <Card className="bg-app-card border-app">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted-foreground" />
                  <Input 
                    placeholder="Search by name, email, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-app-muted border-app text-app-foreground placeholder:text-app-muted-foreground"
                  />
                </div>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-full md:w-40 bg-app-muted border-app text-app-foreground">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-app-card border-app text-app-foreground">
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-40 bg-app-muted border-app text-app-foreground">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-app-card border-app text-app-foreground">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Brokers Table */}
          <Card className="bg-app-card border-app">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-app hover:bg-transparent">
                    <TableHead className="text-app-muted">Broker</TableHead>
                    <TableHead className="text-app-muted">Company</TableHead>
                    <TableHead className="text-app-muted">Plan</TableHead>
                    <TableHead className="text-app-muted">Status</TableHead>
                    <TableHead className="text-app-muted">Clients</TableHead>
                    <TableHead className="text-app-muted">Tokens</TableHead>
                    <TableHead className="text-app-muted">Last Active</TableHead>
                    <TableHead className="text-app-muted"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrokers.map((broker) => (
                    <TableRow key={broker.id} className="border-app hover:bg-app-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {broker.name.split(" ").map(n => n[0]).join("")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-app-foreground">{broker.name}</p>
                            <p className="text-sm text-app-muted">{broker.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-app-foreground">
                          <Building className="w-4 h-4 text-app-muted" />
                          {broker.company}
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(broker.plan)}</TableCell>
                      <TableCell>{getStatusBadge(broker.status)}</TableCell>
                      <TableCell className="text-app-foreground">{broker.clients}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-app-foreground">
                          <Coins className="w-4 h-4 text-accent" />
                          {broker.tokens}
                        </div>
                      </TableCell>
                      <TableCell className="text-app-muted">{broker.lastActive}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-app-muted hover:text-app-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-app-card border-app text-app-foreground">
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Broker
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Coins className="w-4 h-4 mr-2" />
                              Add Tokens
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-app" />
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <Card className="bg-app-card border-app">
            <CardHeader>
              <CardTitle className="text-app-foreground">Pending Invitations</CardTitle>
              <CardDescription className="text-app-muted">
                Manage broker invitations that haven't been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-app hover:bg-transparent">
                    <TableHead className="text-app-muted">Invitee</TableHead>
                    <TableHead className="text-app-muted">Assigned Plan</TableHead>
                    <TableHead className="text-app-muted">Sent Date</TableHead>
                    <TableHead className="text-app-muted">Status</TableHead>
                    <TableHead className="text-app-muted">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInvitations.map((invitation) => (
                    <TableRow key={invitation.id} className="border-app hover:bg-app-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-app-foreground">{invitation.name}</p>
                          <p className="text-sm text-app-muted">{invitation.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(invitation.plan)}</TableCell>
                      <TableCell className="text-app-muted">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {invitation.sentAt}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleResendInvite(invitation.email)}
                            className="border-app text-app-foreground bg-app-card hover:bg-app-muted"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Resend
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
