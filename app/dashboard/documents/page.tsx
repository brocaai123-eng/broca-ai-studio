"use client";

import { useState } from "react";
import { 
  Plus, 
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

type DocumentType = "contract" | "id" | "financial" | "property" | "other";
type DocumentStatus = "verified" | "pending" | "rejected";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  clientName: string;
  dealName: string;
  size: string;
  uploadedAt: string;
  fileType: "pdf" | "image" | "doc";
}

const documents: Document[] = [
  {
    id: "1",
    name: "Purchase Agreement - Sunset Villa.pdf",
    type: "contract",
    status: "verified",
    clientName: "Sarah Johnson",
    dealName: "Sunset Villa",
    size: "2.4 MB",
    uploadedAt: "Jan 3, 2026",
    fileType: "pdf"
  },
  {
    id: "2",
    name: "Driver License - Michael Brown.jpg",
    type: "id",
    status: "pending",
    clientName: "Michael Brown",
    dealName: "Downtown Loft",
    size: "1.2 MB",
    uploadedAt: "Jan 2, 2026",
    fileType: "image"
  },
  {
    id: "3",
    name: "Bank Statement - Q4 2025.pdf",
    type: "financial",
    status: "verified",
    clientName: "Emily Davis",
    dealName: "Garden House",
    size: "890 KB",
    uploadedAt: "Jan 1, 2026",
    fileType: "pdf"
  },
  {
    id: "4",
    name: "Property Inspection Report.pdf",
    type: "property",
    status: "verified",
    clientName: "Robert Wilson",
    dealName: "Lakefront Cabin",
    size: "5.1 MB",
    uploadedAt: "Dec 30, 2025",
    fileType: "pdf"
  },
  {
    id: "5",
    name: "Offer Letter - City Apartment.docx",
    type: "contract",
    status: "rejected",
    clientName: "Jennifer Martinez",
    dealName: "City Apartment",
    size: "340 KB",
    uploadedAt: "Dec 28, 2025",
    fileType: "doc"
  },
  {
    id: "6",
    name: "Title Deed - Downtown Loft.pdf",
    type: "property",
    status: "pending",
    clientName: "Michael Brown",
    dealName: "Downtown Loft",
    size: "1.8 MB",
    uploadedAt: "Dec 27, 2025",
    fileType: "pdf"
  },
];

const typeConfig: Record<DocumentType, { label: string; color: string; icon: React.ElementType }> = {
  contract: { label: "Contract", color: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
  id: { label: "ID Document", color: "bg-purple-100 text-purple-700 border-purple-200", icon: File },
  financial: { label: "Financial", color: "bg-green-100 text-green-700 border-green-200", icon: FileText },
  property: { label: "Property", color: "bg-orange-100 text-orange-700 border-orange-200", icon: FolderOpen },
  other: { label: "Other", color: "bg-gray-100 text-gray-700 border-gray-200", icon: File },
};

const statusConfig: Record<DocumentStatus, { label: string; color: string; icon: React.ElementType }> = {
  verified: { label: "Verified", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

const getFileIcon = (fileType: Document["fileType"]) => {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-8 h-8 text-red-500" />;
    case "image":
      return <Image className="w-8 h-8 text-blue-500" />;
    case "doc":
      return <File className="w-8 h-8 text-blue-600" />;
  }
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.dealName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && doc.type === activeTab;
  });

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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {documents.filter(d => d.type === "contract").length}
              </p>
              <p className="text-sm text-app-muted">Contracts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs, Search, and View Toggle */}
      <div className="app-card p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-app-muted flex-wrap h-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">All</TabsTrigger>
              <TabsTrigger value="contract" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">Contracts</TabsTrigger>
              <TabsTrigger value="id" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">ID Documents</TabsTrigger>
              <TabsTrigger value="financial" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">Financial</TabsTrigger>
              <TabsTrigger value="property" className="data-[state=active]:bg-app-card data-[state=active]:text-app-foreground text-app-muted-foreground">Property</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <Input 
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
              />
            </div>
            <div className="flex bg-app-muted rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon"
                className={viewMode === "grid" ? "bg-app-card" : ""}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className={viewMode === "list" ? "bg-app-card" : ""}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const StatusIcon = statusConfig[doc.status].icon;
            const TypeIcon = typeConfig[doc.type].icon;
            return (
              <div key={doc.id} className="app-card p-5 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-app-muted flex items-center justify-center">
                    {getFileIcon(doc.fileType)}
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
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Summary
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* File Name */}
                <h3 className="font-semibold text-app-foreground mb-2 line-clamp-2">{doc.name}</h3>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className={`${typeConfig[doc.type].color} border text-xs`}>
                    <TypeIcon className="w-3 h-3 mr-1" />
                    {typeConfig[doc.type].label}
                  </Badge>
                  <Badge variant="outline" className={`${statusConfig[doc.status].color} border text-xs`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[doc.status].label}
                  </Badge>
                </div>

                {/* Client and Deal */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-app-muted">
                    <span className="font-medium text-app-foreground">Client:</span>
                    {doc.clientName}
                  </div>
                  <div className="flex items-center gap-2 text-app-muted">
                    <span className="font-medium text-app-foreground">Deal:</span>
                    {doc.dealName}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-app">
                  <span className="text-sm text-app-muted">{doc.size}</span>
                  <span className="text-xs text-app-muted">{doc.uploadedAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="divide-y divide-app">
            {filteredDocuments.map((doc) => {
              const StatusIcon = statusConfig[doc.status].icon;
              return (
                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-app-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-app-muted flex items-center justify-center flex-shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-app-foreground truncate">{doc.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-app-muted">
                      <span>{doc.clientName}</span>
                      <span>•</span>
                      <span>{doc.dealName}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Badge variant="outline" className={`${typeConfig[doc.type].color} border text-xs`}>
                      {typeConfig[doc.type].label}
                    </Badge>
                    <Badge variant="outline" className={`${statusConfig[doc.status].color} border text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[doc.status].label}
                    </Badge>
                  </div>
                  <span className="text-sm text-app-muted hidden lg:block">{doc.uploadedAt}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-app-muted hover:text-app-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-app-card border-app">
                      <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-app-foreground hover:bg-app-muted cursor-pointer">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Summary
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer">
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
      )}

      {filteredDocuments.length === 0 && (
        <div className="app-card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-app-muted mx-auto mb-4" />
          <h3 className="font-semibold text-app-foreground mb-2">No documents found</h3>
          <p className="text-app-muted">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
