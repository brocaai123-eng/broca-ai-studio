import { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  DollarSign,
  MapPin,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Home,
  Eye,
  FileText,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";

type DealStatus = "active" | "pending" | "closed" | "cancelled";
type DealStage = "lead" | "showing" | "offer" | "negotiation" | "contract" | "closing";

interface Deal {
  id: string;
  propertyName: string;
  propertyAddress: string;
  clientName: string;
  price: number;
  status: DealStatus;
  stage: DealStage;
  closingDate: string;
  lastUpdate: string;
  commission: number;
  type: "buy" | "sell";
}

const deals: Deal[] = [
  {
    id: "1",
    propertyName: "Sunset Villa",
    propertyAddress: "123 Ocean View Dr, Miami, FL",
    clientName: "Sarah Johnson",
    price: 850000,
    status: "active",
    stage: "contract",
    closingDate: "Jan 15, 2026",
    lastUpdate: "2 hours ago",
    commission: 25500,
    type: "buy"
  },
  {
    id: "2",
    propertyName: "Downtown Loft",
    propertyAddress: "456 Main St, Unit 12B, NYC",
    clientName: "Michael Brown",
    price: 1250000,
    status: "active",
    stage: "negotiation",
    closingDate: "Jan 25, 2026",
    lastUpdate: "5 hours ago",
    commission: 37500,
    type: "sell"
  },
  {
    id: "3",
    propertyName: "Garden House",
    propertyAddress: "789 Park Lane, Boston, MA",
    clientName: "Emily Davis",
    price: 520000,
    status: "pending",
    stage: "offer",
    closingDate: "Feb 1, 2026",
    lastUpdate: "1 day ago",
    commission: 15600,
    type: "buy"
  },
  {
    id: "4",
    propertyName: "Lakefront Cabin",
    propertyAddress: "321 Lake Shore Rd, Denver, CO",
    clientName: "Robert Wilson",
    price: 680000,
    status: "closed",
    stage: "closing",
    closingDate: "Dec 28, 2025",
    lastUpdate: "3 days ago",
    commission: 20400,
    type: "sell"
  },
  {
    id: "5",
    propertyName: "City Apartment",
    propertyAddress: "555 Urban Ave, Chicago, IL",
    clientName: "Jennifer Martinez",
    price: 420000,
    status: "cancelled",
    stage: "showing",
    closingDate: "-",
    lastUpdate: "1 week ago",
    commission: 0,
    type: "buy"
  },
];

const statusConfig: Record<DealStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "bg-blue-100 text-blue-800 border-blue-200", icon: TrendingUp },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  closed: { label: "Closed", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const stageColors: Record<DealStage, string> = {
  lead: "bg-gray-100 text-gray-700",
  showing: "bg-purple-100 text-purple-700",
  offer: "bg-orange-100 text-orange-700",
  negotiation: "bg-blue-100 text-blue-700",
  contract: "bg-cyan-100 text-cyan-700",
  closing: "bg-green-100 text-green-700",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

const Deals = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && deal.status === activeTab;
  });

  const totalValue = deals.filter(d => d.status === "active" || d.status === "pending")
    .reduce((sum, d) => sum + d.price, 0);
  
  const totalCommission = deals.filter(d => d.status === "closed")
    .reduce((sum, d) => sum + d.commission, 0);

  return (
    <DashboardLayout 
      title="Deals" 
      subtitle="Track and manage your property deals"
      headerAction={
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {deals.filter(d => d.status === "active").length}
              </p>
              <p className="text-sm text-app-muted">Active Deals</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {deals.filter(d => d.status === "pending").length}
              </p>
              <p className="text-sm text-app-muted">Pending</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{formatCurrency(totalValue)}</p>
              <p className="text-sm text-app-muted">Pipeline Value</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{formatCurrency(totalCommission)}</p>
              <p className="text-sm text-app-muted">Earned Commission</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="app-card p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <TabsList className="bg-app-muted">
              <TabsTrigger value="all" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">All</TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">Active</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">Pending</TabsTrigger>
              <TabsTrigger value="closed" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">Closed</TabsTrigger>
            </TabsList>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
                <Input 
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
                />
              </div>
              <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Deals Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDeals.map((deal) => {
          const StatusIcon = statusConfig[deal.status].icon;
          return (
            <div key={deal.id} className="app-card p-5 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-app-foreground">{deal.propertyName}</h3>
                    <div className="flex items-center gap-1 text-sm text-app-muted">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{deal.propertyAddress}</span>
                    </div>
                  </div>
                </div>
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
                      <FileText className="w-4 h-4 mr-2" />
                      View Documents
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Analysis
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Price and Type */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-app-foreground">{formatCurrency(deal.price)}</p>
                  <p className="text-sm text-app-muted">
                    Commission: {formatCurrency(deal.commission)}
                  </p>
                </div>
                <Badge variant="outline" className={deal.type === "buy" ? "bg-green-100 text-green-700 border-green-200" : "bg-purple-100 text-purple-700 border-purple-200"}>
                  {deal.type === "buy" ? "Buying" : "Selling"}
                </Badge>
              </div>

              {/* Client */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-app-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-semibold text-xs">
                    {deal.clientName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className="text-sm text-app-foreground font-medium">{deal.clientName}</span>
              </div>

              {/* Status and Stage */}
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className={`${statusConfig[deal.status].color} border`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[deal.status].label}
                </Badge>
                <Badge variant="outline" className={`${stageColors[deal.stage]} border-transparent`}>
                  {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
                </Badge>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-app">
                <div className="flex items-center gap-1 text-sm text-app-muted">
                  <Calendar className="w-4 h-4" />
                  <span>Close: {deal.closingDate}</span>
                </div>
                <span className="text-xs text-app-muted">{deal.lastUpdate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDeals.length === 0 && (
        <div className="app-card p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-app-muted mx-auto mb-4" />
          <h3 className="font-semibold text-app-foreground mb-2">No deals found</h3>
          <p className="text-app-muted">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Deals;
