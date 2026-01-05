"use client";

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
  Eye,
  ArrowRight,
  ArrowLeft,
  Bell,
  MessageSquare,
  ClipboardList,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const formTemplates = [
  { id: "real_estate_buyer", name: "Real Estate Buyer Onboarding", fields: 15 },
  { id: "real_estate_seller", name: "Real Estate Seller Intake", fields: 12 },
  { id: "insurance_policy", name: "Insurance Policy Application", fields: 18 },
  { id: "mortgage_preq", name: "Mortgage Pre-Qualification", fields: 22 },
  { id: "custom", name: "Custom Client Profile", fields: 10 },
];

const wizardSteps = [
  { id: 1, title: "Client Info", icon: User },
  { id: 2, title: "Select Form", icon: ClipboardList },
  { id: 3, title: "Notifications", icon: Bell },
  { id: 4, title: "Review", icon: CheckCircle },
];

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Wizard state
  const [newClient, setNewClient] = useState({ 
    name: "", 
    email: "", 
    phone: "",
    notes: ""
  });
  const [selectedForm, setSelectedForm] = useState("");
  const [notifications, setNotifications] = useState({
    sendEmail: true,
    sendSMS: true,
    emailReminders: true,
    smsReminders: false,
    reminderDays: "3"
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendOnboarding = () => {
    // Mock sending onboarding
    setIsNewClientOpen(false);
    setWizardStep(1);
    setNewClient({ name: "", email: "", phone: "", notes: "" });
    setSelectedForm("");
    setNotifications({
      sendEmail: true,
      sendSMS: true,
      emailReminders: true,
      smsReminders: false,
      reminderDays: "3"
    });
  };

  const handleDialogClose = (open: boolean) => {
    setIsNewClientOpen(open);
    if (!open) {
      setWizardStep(1);
      setNewClient({ name: "", email: "", phone: "", notes: "" });
      setSelectedForm("");
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return newClient.name && newClient.email;
      case 2:
        return selectedForm !== "";
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const selectedFormDetails = formTemplates.find(f => f.id === selectedForm);

  return (
    <DashboardLayout 
      title="Clients" 
      subtitle="Manage your client onboarding and track progress"
      headerAction={
        <Dialog open={isNewClientOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-app-card border-app">
            <DialogHeader>
              <DialogTitle className="text-app-foreground font-display">Start New Onboarding</DialogTitle>
              <DialogDescription className="text-app-muted">
                Complete the steps below to send an onboarding invite to your client.
              </DialogDescription>
            </DialogHeader>

            {/* Wizard Progress */}
            <div className="flex items-center justify-between px-2 py-4 border-b border-app">
              {wizardSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      wizardStep > step.id 
                        ? "bg-primary text-primary-foreground" 
                        : wizardStep === step.id 
                          ? "bg-primary/20 text-primary border-2 border-primary" 
                          : "bg-app-muted text-app-muted"
                    }`}>
                      {wizardStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${
                      wizardStep >= step.id ? "text-app-foreground" : "text-app-muted"
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      wizardStep > step.id ? "bg-primary" : "bg-app-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="py-6 min-h-[300px]">
              {/* Step 1: Client Info */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-app-foreground">Full Name *</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter client's full name"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="bg-app-muted border-app text-app-foreground"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-app-foreground">Email Address *</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-app-foreground">Internal Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Add any notes about this client (not visible to them)"
                      value={newClient.notes}
                      onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                      className="bg-app-muted border-app text-app-foreground resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Select Form */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-app-muted">Select the onboarding form template for this client:</p>
                  <div className="space-y-3">
                    {formTemplates.map((form) => (
                      <div
                        key={form.id}
                        onClick={() => setSelectedForm(form.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedForm === form.id
                            ? "border-primary bg-primary/10"
                            : "border-app bg-app-muted hover:border-app-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedForm === form.id ? "bg-primary/20" : "bg-app-card"
                            }`}>
                              <ClipboardList className={`w-5 h-5 ${
                                selectedForm === form.id ? "text-primary" : "text-app-muted"
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-app-foreground">{form.name}</p>
                              <p className="text-sm text-app-muted">{form.fields} fields</p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedForm === form.id
                              ? "border-primary bg-primary"
                              : "border-app-muted"
                          }`}>
                            {selectedForm === form.id && (
                              <Check className="w-4 h-4 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Notifications */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-app-foreground mb-4">Initial Invitation</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-app-muted rounded-xl">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-app-foreground">Send Email Invitation</p>
                            <p className="text-sm text-app-muted">Client will receive onboarding link via email</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notifications.sendEmail}
                          onCheckedChange={(checked) => setNotifications({...notifications, sendEmail: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-app-muted rounded-xl">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-app-foreground">Send SMS Notification</p>
                            <p className="text-sm text-app-muted">Client will also receive a text message</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notifications.sendSMS}
                          onCheckedChange={(checked) => setNotifications({...notifications, sendSMS: checked})}
                          disabled={!newClient.phone}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-app-foreground mb-4">Automatic Reminders</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-app-muted rounded-xl">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-accent" />
                          <div>
                            <p className="font-medium text-app-foreground">Email Reminders</p>
                            <p className="text-sm text-app-muted">Send reminder if not completed</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notifications.emailReminders}
                          onCheckedChange={(checked) => setNotifications({...notifications, emailReminders: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-app-muted rounded-xl">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-accent" />
                          <div>
                            <p className="font-medium text-app-foreground">SMS Reminders</p>
                            <p className="text-sm text-app-muted">Text reminder if not completed</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notifications.smsReminders}
                          onCheckedChange={(checked) => setNotifications({...notifications, smsReminders: checked})}
                          disabled={!newClient.phone}
                        />
                      </div>
                      {(notifications.emailReminders || notifications.smsReminders) && (
                        <div className="flex items-center gap-4 p-4 bg-app-muted rounded-xl">
                          <Label className="text-app-foreground">Send reminder after</Label>
                          <Select 
                            value={notifications.reminderDays}
                            onValueChange={(value) => setNotifications({...notifications, reminderDays: value})}
                          >
                            <SelectTrigger className="w-32 bg-app-card border-app text-app-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-app-card border-app">
                              <SelectItem value="1">1 day</SelectItem>
                              <SelectItem value="2">2 days</SelectItem>
                              <SelectItem value="3">3 days</SelectItem>
                              <SelectItem value="5">5 days</SelectItem>
                              <SelectItem value="7">7 days</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-app-muted">of inactivity</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="p-4 bg-app-muted rounded-xl">
                    <h3 className="font-medium text-app-foreground mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Client Information
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-app-muted">Name:</span>
                        <span className="ml-2 text-app-foreground">{newClient.name}</span>
                      </div>
                      <div>
                        <span className="text-app-muted">Email:</span>
                        <span className="ml-2 text-app-foreground">{newClient.email}</span>
                      </div>
                      <div>
                        <span className="text-app-muted">Phone:</span>
                        <span className="ml-2 text-app-foreground">{newClient.phone || "Not provided"}</span>
                      </div>
                    </div>
                    {newClient.notes && (
                      <div className="mt-3 pt-3 border-t border-app">
                        <span className="text-app-muted text-sm">Notes:</span>
                        <p className="text-app-foreground text-sm mt-1">{newClient.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-app-muted rounded-xl">
                    <h3 className="font-medium text-app-foreground mb-3 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      Selected Form
                    </h3>
                    <p className="text-app-foreground">{selectedFormDetails?.name}</p>
                    <p className="text-sm text-app-muted">{selectedFormDetails?.fields} fields to complete</p>
                  </div>

                  <div className="p-4 bg-app-muted rounded-xl">
                    <h3 className="font-medium text-app-foreground mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Notification Settings
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className={`w-4 h-4 ${notifications.sendEmail ? "text-primary" : "text-app-muted"}`} />
                        <span className={notifications.sendEmail ? "text-app-foreground" : "text-app-muted line-through"}>
                          Email invitation
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className={`w-4 h-4 ${notifications.sendSMS ? "text-primary" : "text-app-muted"}`} />
                        <span className={notifications.sendSMS ? "text-app-foreground" : "text-app-muted line-through"}>
                          SMS notification
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className={`w-4 h-4 ${notifications.emailReminders ? "text-primary" : "text-app-muted"}`} />
                        <span className={notifications.emailReminders ? "text-app-foreground" : "text-app-muted line-through"}>
                          Email reminders after {notifications.reminderDays} days
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                    <p className="text-sm text-app-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      This will use <strong>10 tokens</strong> from your balance
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation */}
            <div className="flex justify-between pt-4 border-t border-app">
              <Button 
                variant="outline" 
                className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
                onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : handleDialogClose(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {wizardStep === 1 ? "Cancel" : "Back"}
              </Button>
              
              {wizardStep < 4 ? (
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleSendOnboarding}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Onboarding
                </Button>
              )}
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
}
