"use client";

import { useState } from "react";
import Link from "next/link";
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
  Clock,
  Loader2,
  Home,
  Sparkles,
  Heart,
  Building2
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
import { useFormTemplates, useCreateFormTemplate, useDeleteFormTemplate } from "@/lib/hooks/use-database";
import type { FormCategory, FormStatus } from "@/lib/types/database";
import { toast } from "sonner";

const categoryConfig: Record<FormCategory, { label: string; color: string; icon: React.ElementType }> = {
  buyer: { label: "Buyer", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Users },
  seller: { label: "Seller", color: "bg-green-100 text-green-700 border-green-200", icon: Building },
  rental: { label: "Rental", color: "bg-purple-100 text-purple-700 border-purple-200", icon: ClipboardList },
  general: { label: "General", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
};

export default function Forms() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", description: "", category: "" as FormCategory });
  
  const { data: formTemplates = [], isLoading } = useFormTemplates();
  const createForm = useCreateFormTemplate();
  const deleteForm = useDeleteFormTemplate();

  const filteredForms = formTemplates.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (form.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const activeFormsCount = formTemplates.filter(f => f.status === "active").length;
  const totalUsage = formTemplates.reduce((acc, f) => acc + (f.usage_count || 0), 0);

  const handleCreateForm = async () => {
    if (!newForm.name || !newForm.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      await createForm.mutateAsync({
        name: newForm.name,
        description: newForm.description || null,
        category: newForm.category,
        fields: [],
        fields_count: 0,
        status: "draft" as FormStatus,
      });
      toast.success("Form created successfully");
      setIsCreateOpen(false);
      setNewForm({ name: "", description: "", category: "" as FormCategory });
    } catch {
      toast.error("Failed to create form");
    }
  };

  const handleDeleteForm = async (id: string) => {
    try {
      await deleteForm.mutateAsync(id);
      toast.success("Form deleted successfully");
    } catch {
      toast.error("Failed to delete form");
    }
  };

  const formatLastUsed = (lastUsed: string | null) => {
    if (!lastUsed) return "Never";
    const date = new Date(lastUsed);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Form Templates" subtitle="Create and manage custom forms for client onboarding">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Description</Label>
                <Textarea 
                  placeholder="Describe the purpose of this form..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="bg-app-muted border-app text-app-foreground resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground">Category</Label>
                <Select value={newForm.category} onValueChange={(value) => setNewForm({ ...newForm, category: value as FormCategory })}>
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
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleCreateForm}
                disabled={createForm.isPending}
              >
                {createForm.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Form
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Quick Templates */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-app-foreground mb-4">Quick Start Templates</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/forms/create?template=real-estate-intake" className="block">
            <div className="app-card p-5 border-2 border-dashed border-primary/30 hover:border-primary hover:shadow-lg transition-all cursor-pointer group h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <Badge className="bg-accent/20 text-accent text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-app-foreground mb-1">Real Estate Intake</h3>
                  <p className="text-xs text-app-muted">
                    Buyer/seller/lease intake with contact info and documents.
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/forms/create?template=life-insurance" className="block">
            <div className="app-card p-5 border-2 border-dashed border-red-200 hover:border-red-400 hover:shadow-lg transition-all cursor-pointer group h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                    <Heart className="w-5 h-5 text-red-600" />
                  </div>
                  <Badge className="bg-red-100 text-red-700 text-xs">
                    Insurance
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-app-foreground mb-1">Life Insurance</h3>
                  <p className="text-xs text-app-muted">
                    Health, lifestyle, coverage needs and beneficiary info.
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/forms/create?template=mortgage" className="block">
            <div className="app-card p-5 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    Mortgage
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-app-foreground mb-1">Mortgage Application</h3>
                  <p className="text-xs text-app-muted">
                    Pre-qualification with income, credit, and property details.
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          <div 
            onClick={() => setIsCreateOpen(true)}
            className="app-card p-5 border-2 border-dashed border-app hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group h-full"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-app-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-app-muted group-hover:text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-app-foreground mb-1">Blank Form</h3>
                <p className="text-xs text-app-muted">
                  Start from scratch with a custom form template.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteForm(form.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="font-semibold text-app-foreground mb-2">{form.name}</h3>
              <p className="text-sm text-app-muted mb-4 line-clamp-2">{form.description || "No description"}</p>

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
                <span className="text-app-muted">{form.fields_count} fields</span>
                <span className="text-app-muted">Used {form.usage_count} times</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredForms.length === 0 && (
        <div className="app-card p-12 text-center">
          <FileText className="w-12 h-12 text-app-muted mx-auto mb-4" />
          <h3 className="font-semibold text-app-foreground mb-2">No forms found</h3>
          <p className="text-app-muted">{searchQuery ? "Try adjusting your search or create a new form." : "Create your first form template to get started."}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
