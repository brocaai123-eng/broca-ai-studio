"use client";

import { useState } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical,
  Upload,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Grid,
  List,
  Sparkles,
  Loader2
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useDocuments, useDeleteDocument, useUpdateDocument } from "@/lib/hooks/use-database";
import type { DocumentType, DocumentStatus } from "@/lib/types/database";
import { toast } from "sonner";

const typeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  contract: { label: "Contract", color: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
  id: { label: "ID Document", color: "bg-purple-100 text-purple-700 border-purple-200", icon: File },
  financial: { label: "Financial", color: "bg-green-100 text-green-700 border-green-200", icon: FileText },
  property: { label: "Property", color: "bg-orange-100 text-orange-700 border-orange-200", icon: FolderOpen },
  other: { label: "Other", color: "bg-gray-100 text-gray-700 border-gray-200", icon: File },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  verified: { label: "Verified", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
};

const getFileIcon = (fileType: "pdf" | "image" | "doc") => {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-8 h-8 text-red-500" />;
    case "image":
      return <Image className="w-8 h-8 text-blue-500" />;
    case "doc":
      return <File className="w-8 h-8 text-blue-600" />;
    default:
      return <File className="w-8 h-8 text-gray-500" />;
  }
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: documents = [], isLoading } = useDocuments();
  const deleteDocument = useDeleteDocument();
  const updateDocument = useUpdateDocument();

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.client?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "verified") return matchesSearch && doc.status === "verified";
    if (activeTab === "pending") return matchesSearch && doc.status === "pending";
    return matchesSearch;
  });

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument.mutateAsync(id);
      toast.success("Document deleted successfully");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleVerifyDocument = async (id: string) => {
    try {
      await updateDocument.mutateAsync({ id, status: "verified" as DocumentStatus });
      toast.success("Document marked as verified");
    } catch {
      toast.error("Failed to verify document");
    }
  };

  const handleViewDocument = (fileUrl: string | null | undefined) => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      toast.error("Document URL not available");
    }
  };

  const handleDownloadDocument = async (fileUrl: string | null | undefined, fileName: string) => {
    if (!fileUrl) {
      toast.error("Download URL not available");
      return;
    }
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Failed to download document");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Documents" subtitle="Securely manage and organize all your client documents">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Documents" 
      subtitle="Securely manage and organize all your client documents"
      headerAction={
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-app-card border-app">
            <DialogHeader>
              <DialogTitle className="text-app-foreground font-display">Upload Document</DialogTitle>
              <DialogDescription className="text-app-muted">
                Upload documents for your clients. Supported formats: PDF, JPG, PNG, DOCX.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="border-2 border-dashed border-app rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <p className="text-app-foreground font-medium mb-1">Drop files here or click to browse</p>
                <p className="text-sm text-app-muted">Maximum file size: 10MB</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-app-card border-app text-app-foreground hover:bg-app-muted"
                onClick={() => setIsUploadOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{documents.length}</p>
              <p className="text-sm text-app-muted">Total Documents</p>
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
                {documents.filter(d => d.status === "verified").length}
              </p>
              <p className="text-sm text-app-muted">Verified</p>
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
                {documents.filter(d => d.status === "pending").length}
              </p>
              <p className="text-sm text-app-muted">Pending Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs, Search, and View Toggle */}
      <div className="app-card p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200 shadow-sm p-1 h-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-600 px-4 py-1.5 text-sm font-medium">All</TabsTrigger>
              <TabsTrigger value="verified" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-600 px-4 py-1.5 text-sm font-medium">Verified</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-600 px-4 py-1.5 text-sm font-medium">Pending</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon"
                className={viewMode === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className={viewMode === "list" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      {viewMode === "grid" ? (
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-1">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 pb-4">
          {filteredDocuments.map((doc) => {
            const statusInfo = statusConfig[doc.status] || statusConfig.pending;
            const typeInfo = typeConfig[doc.type] || typeConfig.other;
            const StatusIcon = statusInfo.icon;
            const TypeIcon = typeInfo.icon;
            return (
              <div key={doc.id} className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/30">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100/80 to-red-50 flex items-center justify-center shadow-sm">
                    {getFileIcon(doc.file_type)}
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
                        onClick={() => handleViewDocument(doc.file_url)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleDownloadDocument(doc.file_url, doc.name)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {doc.status !== "verified" && (
                        <DropdownMenuItem 
                          className="text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          onClick={() => handleVerifyDocument(doc.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Verified
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteDocument(doc.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* File Name */}
                <h3 className="font-semibold text-gray-900 text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">{doc.name}</h3>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className={`${statusInfo.color} border text-xs font-medium px-3 py-1`}>
                    <StatusIcon className="w-3 h-3 mr-1.5" />
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Client and Deal */}
                <div className="space-y-2.5 mb-5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Client:</span>
                    <span className="text-gray-500">{doc.client?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Deal:</span>
                    <span className="text-gray-500">{doc.deal_name || "N/A"}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">{doc.file_size || "N/A"}</span>
                  <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-1">
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="divide-y divide-gray-50">
            {filteredDocuments.map((doc) => {
              const statusInfo = statusConfig[doc.status] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;
              return (
                <div key={doc.id} className="group flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100/80 to-red-50 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate group-hover:text-primary transition-colors">{doc.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{doc.client?.name || "N/A"}</span>
                      <span className="text-gray-300">•</span>
                      <span>{doc.deal_name || "N/A"}</span>
                      <span className="text-gray-300">•</span>
                      <span>{doc.file_size || "N/A"}</span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Badge variant="outline" className={`${statusInfo.color} border text-xs font-medium px-3 py-1`}>
                      <StatusIcon className="w-3 h-3 mr-1.5" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-400 hidden lg:block">{formatDate(doc.created_at)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-gray-100 shadow-lg">
                      <DropdownMenuItem 
                        className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewDocument(doc.file_url)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-gray-700 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleDownloadDocument(doc.file_url, doc.name)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {doc.status !== "verified" && (
                        <DropdownMenuItem 
                          className="text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          onClick={() => handleVerifyDocument(doc.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Verified
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteDocument(doc.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500">{searchQuery ? "Try adjusting your search or filter criteria." : "Upload your first document to get started."}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
