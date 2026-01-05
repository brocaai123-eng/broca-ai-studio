"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Coins, 
  TrendingUp,
  Users,
  ArrowUpRight,
  Search,
  Filter,
  Plus,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock token stats
const tokenStats = [
  { title: "Total Tokens Issued", value: "156,000", change: "+12,000 this month", icon: Coins },
  { title: "Tokens Consumed", value: "98,456", change: "63% utilization", icon: TrendingUp },
  { title: "Available Tokens", value: "57,544", change: "Across all brokers", icon: Coins },
  { title: "Active Brokers", value: "24", change: "Using tokens", icon: Users },
];

// Mock broker token data
const brokerTokens = [
  { id: 1, name: "Sarah Johnson", plan: "Enterprise", allocated: "Unlimited", used: 3400, remaining: "∞", lastActivity: "2 hours ago" },
  { id: 2, name: "Mike Chen", plan: "Professional", allocated: 500, used: 420, remaining: 80, lastActivity: "5 hours ago" },
  { id: 3, name: "Lisa Williams", plan: "Professional", allocated: 500, used: 350, remaining: 150, lastActivity: "1 day ago" },
  { id: 4, name: "John Davis", plan: "Starter", allocated: 100, used: 88, remaining: 12, lastActivity: "3 days ago" },
  { id: 5, name: "Emily Brown", plan: "Starter", allocated: 100, used: 0, remaining: 100, lastActivity: "Never" },
];

// Mock token transactions
const tokenTransactions = [
  { id: 1, broker: "Mike Chen", action: "AI Extraction", tokens: -5, date: "2025-01-05 14:30", balance: 80 },
  { id: 2, broker: "Lisa Williams", action: "Form Submission", tokens: -2, date: "2025-01-05 12:15", balance: 150 },
  { id: 3, broker: "John Davis", action: "Document Processing", tokens: -10, date: "2025-01-05 10:00", balance: 12 },
  { id: 4, broker: "Mike Chen", action: "Token Purchase", tokens: 200, date: "2025-01-04 16:45", balance: 85 },
  { id: 5, broker: "Sarah Johnson", action: "AI Extraction", tokens: -5, date: "2025-01-04 09:30", balance: "∞" },
];

export default function AdminTokens() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [addTokensDialogOpen, setAddTokensDialogOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");

  const filteredBrokers = brokerTokens.filter(broker => {
    const matchesSearch = broker.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "all" || broker.plan.toLowerCase() === filterPlan.toLowerCase();
    return matchesSearch && matchesPlan;
  });

  const handleAddTokens = () => {
    toast({
      title: "Tokens Added",
      description: `${tokenAmount} tokens have been added to ${selectedBroker}`,
    });
    setAddTokensDialogOpen(false);
    setSelectedBroker("");
    setTokenAmount("");
  };

  return (
    <AdminLayout 
      title="Token Management" 
      subtitle="Monitor and manage token allocation across brokers"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tokenStats.map((stat) => (
          <Card key={stat.title} className="bg-app-card border-app">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-app-foreground">{stat.value}</p>
                <p className="text-sm text-app-muted">{stat.title}</p>
                <p className="text-xs text-primary mt-1">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broker Token Balances */}
        <Card className="bg-app-card border-app lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground">Broker Token Balances</CardTitle>
              <CardDescription className="text-app-muted">Current token allocation by broker</CardDescription>
            </div>
            <Dialog open={addTokensDialogOpen} onOpenChange={setAddTokensDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tokens
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-app-card border-app text-app-foreground">
                <DialogHeader>
                  <DialogTitle>Add Tokens to Broker</DialogTitle>
                  <DialogDescription className="text-app-muted">
                    Manually add tokens to a broker's account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Broker</Label>
                    <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                      <SelectTrigger className="bg-app-muted border-app text-app-foreground">
                        <SelectValue placeholder="Choose a broker" />
                      </SelectTrigger>
                      <SelectContent className="bg-app-card border-app text-app-foreground">
                        {brokerTokens.filter(b => b.plan !== "Enterprise").map((broker) => (
                          <SelectItem key={broker.id} value={broker.name}>{broker.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Token Amount</Label>
                    <Input 
                      type="number"
                      placeholder="100"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      className="bg-app-muted border-app text-app-foreground placeholder:text-app-muted-foreground"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddTokensDialogOpen(false)} className="border-app text-app-foreground bg-app-card hover:bg-app-muted">
                    Cancel
                  </Button>
                  <Button onClick={handleAddTokens} className="bg-accent hover:bg-accent/90">
                    Add Tokens
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted-foreground" />
                <Input 
                  placeholder="Search broker..."
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
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="border-app hover:bg-transparent">
                  <TableHead className="text-app-muted">Broker</TableHead>
                  <TableHead className="text-app-muted">Plan</TableHead>
                  <TableHead className="text-app-muted">Allocated</TableHead>
                  <TableHead className="text-app-muted">Used</TableHead>
                  <TableHead className="text-app-muted">Remaining</TableHead>
                  <TableHead className="text-app-muted">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrokers.map((broker) => (
                  <TableRow key={broker.id} className="border-app hover:bg-app-muted/30">
                    <TableCell className="font-medium text-app-foreground">{broker.name}</TableCell>
                    <TableCell>
                      <Badge className={`${
                        broker.plan === "Enterprise" ? "bg-accent/20 text-accent" :
                        broker.plan === "Professional" ? "bg-primary/20 text-primary" :
                        "bg-app-muted text-app-muted-foreground"
                      }`}>
                        {broker.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-app-foreground">{broker.allocated}</TableCell>
                    <TableCell className="text-app-foreground">{broker.used.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        typeof broker.remaining === "number" && broker.remaining < 20 
                          ? "text-destructive" 
                          : "text-primary"
                      }`}>
                        {broker.remaining}
                      </span>
                    </TableCell>
                    <TableCell className="text-app-muted">{broker.lastActivity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Token Activity */}
        <Card className="bg-app-card border-app">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground">Recent Activity</CardTitle>
              <CardDescription className="text-app-muted">Token transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="border-app text-app-foreground bg-app-card hover:bg-app-muted">
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-app-muted/30">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.tokens > 0 ? "bg-primary/20" : "bg-accent/20"
                }`}>
                  <Coins className={`w-5 h-5 ${tx.tokens > 0 ? "text-primary" : "text-accent"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-app-foreground truncate">{tx.broker}</p>
                  <p className="text-xs text-app-muted truncate">{tx.action}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${tx.tokens > 0 ? "text-primary" : "text-app-foreground"}`}>
                    {tx.tokens > 0 ? `+${tx.tokens}` : tx.tokens}
                  </p>
                  <p className="text-xs text-app-muted">Bal: {tx.balance}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
