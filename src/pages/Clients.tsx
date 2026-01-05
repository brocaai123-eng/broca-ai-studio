import { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/DashboardLayout";

type OnboardingStatus = "pending" | "in_progress" | "completed" | "expired";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: OnboardingStatus;
  onboardingProgress: number;
  documentsSubmitted: number;
  documentsRequired: number;
  lastActivity: string;
  createdAt: string;
}

const clients: Client[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 123-4567",
    status: "completed",
    onboardingProgress: 100,
    documentsSubmitted: 5,
    documentsRequired: 5,
    lastActivity: "2 hours ago",
    createdAt: "Jan 3, 2026"
  },
  {
    id: "2",
    name: "Michael Brown",
    email: "m.brown@email.com",
    phone: "+1 (555) 234-5678",
    status: "in_progress",
    onboardingProgress: 60,
    documentsSubmitted: 3,
    documentsRequired: 5,
    lastActivity: "5 hours ago",
    createdAt: "Jan 2, 2026"
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily.d@email.com",
    phone: "+1 (555) 345-6789",
    status: "pending",
    onboardingProgress: 0,
    documentsSubmitted: 0,
    documentsRequired: 5,
    lastActivity: "1 day ago",
    createdAt: "Jan 1, 2026"
  },
  {
    id: "4",
    name: "Robert Wilson",
    email: "r.wilson@email.com",
    phone: "+1 (555) 456-7890",
    status: "in_progress",
    onboardingProgress: 40,
    documentsSubmitted: 2,
    documentsRequired: 5,
    lastActivity: "3 hours ago",
    createdAt: "Dec 30, 2025"
  },
  {
    id: "5",
    name: "Jennifer Martinez",
    email: "j.martinez@email.com",
    phone: "+1 (555) 567-8901",
    status: "expired",
    onboardingProgress: 20,
    documentsSubmitted: 1,
    documentsRequired: 5,
    lastActivity: "7 days ago",
    createdAt: "Dec 25, 2025"
  },
];

const statusConfig: Record<OnboardingStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendOnboarding = () => {
    // Mock sending onboarding
    setIsNewClientOpen(false);
    setNewClient({ name: "", email: "", phone: "" });
  };

  return (
    <DashboardLayout 
      title="Clients" 
      subtitle="Manage your client onboarding and track progress"
      headerAction={
        <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-app-card border-app">
            <DialogHeader>
              <DialogTitle className="text-app-foreground font-display">Start New Onboarding</DialogTitle>
              <DialogDescription className="text-app-muted">
                Enter client details to send them an onboarding invite via email and SMS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-app-foreground">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter client's full name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-app-foreground">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="client@email.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-app-foreground">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-app-card border-app text-app-foreground hover:bg-app-muted"
                onClick={() => setIsNewClientOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSendOnboarding}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Onboarding
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{clients.length}</p>
              <p className="text-sm text-app-muted">Total Clients</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {clients.filter(c => c.status === "in_progress").length}
              </p>
              <p className="text-sm text-app-muted">In Progress</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {clients.filter(c => c.status === "completed").length}
              </p>
              <p className="text-sm text-app-muted">Completed</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {clients.filter(c => c.status === "pending" || c.status === "expired").length}
              </p>
              <p className="text-sm text-app-muted">Needs Attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="app-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
            <Input 
              placeholder="Search clients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
            />
          </div>
          <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="app-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-app hover:bg-transparent">
              <TableHead className="text-app-muted font-semibold">Client</TableHead>
              <TableHead className="text-app-muted font-semibold">Status</TableHead>
              <TableHead className="text-app-muted font-semibold hidden md:table-cell">Progress</TableHead>
              <TableHead className="text-app-muted font-semibold hidden lg:table-cell">Documents</TableHead>
              <TableHead className="text-app-muted font-semibold hidden lg:table-cell">Last Activity</TableHead>
              <TableHead className="text-app-muted font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => {
              const StatusIcon = statusConfig[client.status].icon;
              return (
                <TableRow key={client.id} className="border-app hover:bg-app-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-app-foreground">{client.name}</p>
                        <div className="flex items-center gap-2 text-sm text-app-muted">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${statusConfig[client.status].color} border font-medium`}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[client.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-app-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${client.onboardingProgress}%` }}
                        />
                      </div>
                      <span className="text-sm text-app-muted w-12">{client.onboardingProgress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-app-muted">
                      <FileText className="w-4 h-4" />
                      <span>{client.documentsSubmitted}/{client.documentsRequired}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-app-muted">
                    {client.lastActivity}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-app-muted hover:text-app-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-app-card border-app">
                        <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                          <Send className="w-4 h-4 mr-2" />
                          Resend Invite
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                          <Phone className="w-4 h-4 mr-2" />
                          Call Client
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export default Clients;
