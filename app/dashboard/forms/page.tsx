"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: formTemplates = [], isLoading } = useFormTemplates();
  const createForm = useCreateFormTemplate();
  const deleteForm = useDeleteFormTemplate();

  const filteredForms = formTemplates.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (form.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const activeFormsCount = formTemplates.filter(f => f.status === "active").length;
  const totalUsage = formTemplates.reduce((acc, f) => acc + (f.usage_count || 0), 0);

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
        <Link href="/dashboard/forms/create?template=blank">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Create Form
          </Button>
        </Link>
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
          
          <Link href="/dashboard/forms/create?template=blank" className="block">
            <div className="app-card p-5 border-2 border-dashed border-app hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group h-full">
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
          </Link>
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
      <div className="max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-1">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
        {filteredForms.map((form) => {
          const CategoryIcon = categoryConfig[form.category].icon;
          return (
            <div key={form.id} className="group bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary/30">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent flex items-center justify-center shadow-sm">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-gray-100 shadow-lg">
                    <DropdownMenuItem 
                      className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/forms/${form.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/forms/${form.id}?tab=edit`)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                      onClick={async () => {
                        try {
                          await createForm.mutateAsync({
                            name: `${form.name} (Copy)`,
                            description: form.description,
                            category: form.category,
                            fields: form.fields || [],
                            fields_count: form.fields_count || 0,
                            status: "draft" as FormStatus,
                          });
                          toast.success("Form duplicated successfully");
                        } catch {
                          toast.error("Failed to duplicate form");
                        }
                      }}
                    >
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

              <h3 className="font-semibold text-gray-900 text-base mb-2 group-hover:text-primary transition-colors">{form.name}</h3>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{form.description || "No description"}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className={`${categoryConfig[form.category].color} border text-xs font-medium px-3 py-1`}>
                  <CategoryIcon className="w-3 h-3 mr-1.5" />
                  {categoryConfig[form.category].label}
                </Badge>
                <Badge variant="outline" className={`${form.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"} border text-xs font-medium px-3 py-1`}>
                  {form.status === "active" ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <Clock className="w-3 h-3 mr-1.5" />}
                  {form.status === "active" ? "Active" : "Draft"}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {form.fields_count} fields
                </span>
                <span className="text-gray-500">Used {form.usage_count}×</span>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {filteredForms.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No forms found</h3>
          <p className="text-gray-500">{searchQuery ? "Try adjusting your search or create a new form." : "Create your first form template to get started."}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
