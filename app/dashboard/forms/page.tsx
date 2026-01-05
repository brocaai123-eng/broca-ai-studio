"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  MoreVertical,
  FileText,
  Copy,
  Pencil,
  Trash2,
  Eye,
  ClipboardList,
  Users,
  Building,
  CheckCircle,
  Clock
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: "buyer" | "seller" | "rental" | "general";
  fields: number;
  usageCount: number;
  lastUsed: string;
  status: "active" | "draft";
}

const formTemplates: FormTemplate[] = [
  {
    id: "1",
    name: "Buyer Information Form",
    description: "Comprehensive form for collecting buyer details, preferences, and financial information",
    category: "buyer",
    fields: 24,
    usageCount: 156,
    lastUsed: "2 hours ago",
    status: "active"
  },
  {
    id: "2",
    name: "Property Listing Agreement",
    description: "Standard form for sellers to authorize property listing",
    category: "seller",
    fields: 18,
    usageCount: 89,
    lastUsed: "1 day ago",
    status: "active"
  },
  {
    id: "3",
    name: "Rental Application",
    description: "Application form for prospective tenants with background check consent",
    category: "rental",
    fields: 32,
    usageCount: 234,
    lastUsed: "3 hours ago",
    status: "active"
  },
  {
    id: "4",
    name: "Document Checklist",
    description: "Checklist of required documents for transaction completion",
    category: "general",
    fields: 15,
    usageCount: 67,
    lastUsed: "5 days ago",
    status: "active"
  },
  {
    id: "5",
    name: "Pre-Approval Request",
    description: "Form to collect information for mortgage pre-approval",
    category: "buyer",
    fields: 28,
    usageCount: 45,
    lastUsed: "1 week ago",
    status: "active"
  },
  {
    id: "6",
    name: "Property Feedback Survey",
    description: "Survey form for collecting buyer feedback after property viewings",
    category: "general",
    fields: 12,
    usageCount: 0,
    lastUsed: "Never",
    status: "draft"
  },
];

const categoryConfig: Record<FormTemplate["category"], { label: string; color: string; icon: React.ElementType }> = {
  buyer: { label: "Buyer", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Users },
  seller: { label: "Seller", color: "bg-green-100 text-green-700 border-green-200", icon: Building },
  rental: { label: "Rental", color: "bg-purple-100 text-purple-700 border-purple-200", icon: ClipboardList },
  general: { label: "General", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
};

export default function Forms() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredForms = formTemplates.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    form.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFormsCount = formTemplates.filter(f => f.status === "active").length;
  const totalUsage = formTemplates.reduce((acc, f) => acc + f.usageCount, 0);

  return (
    <DashboardLayout 
      title="Form Templates" 
      subtitle="Create and manage custom forms for client onboarding"
      headerAction={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-app-card border-app">
            <DialogHeader>
              <DialogTitle className="text-app-foreground font-display">Create New Form</DialogTitle>
              <DialogDescription className="text-app-muted">
                Create a custom form template for client onboarding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-app-foreground">Form Name</Label>
                <Input 
                  placeholder="e.g., Buyer Information Form"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Description</Label>
                <Textarea 
                  placeholder="Describe the purpose of this form..."
                  className="bg-app-muted border-app text-app-foreground resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Category</Label>
                <Select>
                  <SelectTrigger className="bg-app-muted border-app text-app-foreground">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-app-card border-app">
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-app-card border-app text-app-foreground hover:bg-app-muted"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                Create Form
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{formTemplates.length}</p>
              <p className="text-sm text-app-muted">Total Forms</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{activeFormsCount}</p>
              <p className="text-sm text-app-muted">Active Forms</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{totalUsage}</p>
              <p className="text-sm text-app-muted">Total Submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="app-card p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <Input 
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
          />
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredForms.map((form) => {
          const CategoryIcon = categoryConfig[form.category].icon;
          return (
            <div key={form.id} className="app-card p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
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
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="font-semibold text-app-foreground mb-2">{form.name}</h3>
              <p className="text-sm text-app-muted mb-4 line-clamp-2">{form.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className={`${categoryConfig[form.category].color} border text-xs`}>
                  <CategoryIcon className="w-3 h-3 mr-1" />
                  {categoryConfig[form.category].label}
                </Badge>
                <Badge variant="outline" className={`${form.status === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"} border text-xs`}>
                  {form.status === "active" ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                  {form.status === "active" ? "Active" : "Draft"}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-app text-sm">
                <span className="text-app-muted">{form.fields} fields</span>
                <span className="text-app-muted">Used {form.usageCount} times</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredForms.length === 0 && (
        <div className="app-card p-12 text-center">
          <FileText className="w-12 h-12 text-app-muted mx-auto mb-4" />
          <h3 className="font-semibold text-app-foreground mb-2">No forms found</h3>
          <p className="text-app-muted">Try adjusting your search or create a new form.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
