"use client";

import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Eye,
  Sparkles,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
  Home,
  Heart,
  Shield,
  Building2,
  ExternalLink,
  Copy,
  Check,
  XCircle,
  Info,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useClientDetails } from "@/lib/hooks/use-database";
import type { OnboardingStatus } from "@/lib/types/database";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<OnboardingStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

// Type for form field
interface FormField {
  id: string;
  label: string;
  type?: string;
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

// Build a lookup map from field ID to label using form template
const buildFieldLabelMap = (formTemplate: { fields?: unknown[] } | null): Record<string, string> => {
  const labelMap: Record<string, string> = {};
  
  if (!formTemplate?.fields || !Array.isArray(formTemplate.fields)) {
    return labelMap;
  }
  
  // The fields array contains a single object with baseSections and customFields
  const templateConfig = formTemplate.fields[0] as {
    baseSections?: FormSection[];
    customFields?: FormField[];
  } | undefined;
  
  if (!templateConfig) return labelMap;
  
  // Extract labels from base sections
  if (templateConfig.baseSections) {
    for (const section of templateConfig.baseSections) {
      if (section.fields) {
        for (const field of section.fields) {
          if (field.id && field.label) {
            labelMap[field.id] = field.label;
          }
        }
      }
    }
  }
  
  // Extract labels from custom fields
  if (templateConfig.customFields) {
    for (const field of templateConfig.customFields) {
      if (field.id && field.label) {
        labelMap[field.id] = field.label;
      }
    }
  }
  
  return labelMap;
};

// Helper to format field labels
const formatLabel = (key: string, labelMap?: Record<string, string>): string => {
  // First check if we have a label in the lookup map
  if (labelMap && labelMap[key]) {
    return labelMap[key];
  }
  
  // Fallback: format the key itself
  return key
    .replace(/^custom_\d+$/, 'Custom Field') // Handle generic custom field IDs
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Helper to format field values
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'N/A';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Get icon for field type
const getFieldIcon = (key: string) => {
  const keyLower = key.toLowerCase();
  if (keyLower.includes('email')) return Mail;
  if (keyLower.includes('phone') || keyLower.includes('tel')) return Phone;
  if (keyLower.includes('address') || keyLower.includes('location')) return MapPin;
  if (keyLower.includes('date') || keyLower.includes('birth')) return Calendar;
  if (keyLower.includes('employer') || keyLower.includes('job') || keyLower.includes('work')) return Briefcase;
  if (keyLower.includes('income') || keyLower.includes('salary') || keyLower.includes('budget') || keyLower.includes('price')) return DollarSign;
  if (keyLower.includes('property') || keyLower.includes('home') || keyLower.includes('house')) return Home;
  if (keyLower.includes('health') || keyLower.includes('medical')) return Heart;
  if (keyLower.includes('insurance') || keyLower.includes('coverage')) return Shield;
  if (keyLower.includes('loan') || keyLower.includes('mortgage')) return Building2;
  return FileText;
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: client, isLoading, error } = useClientDetails(clientId);

  const copyToClipboard = async (text: string, fieldLabel: string, fieldKey: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast({
      title: "Copied!",
      description: `${fieldLabel} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Client Details" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout title="Client Not Found" subtitle="The requested client could not be found">
        <Card className="app-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-app-foreground mb-2">Client Not Found</h2>
            <p className="text-app-muted mb-6">The client you're looking for doesn't exist or you don't have access.</p>
            <Button onClick={() => router.push('/dashboard/clients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const StatusIcon = statusConfig[client.status].icon;
  const formData = client.form_data || {};
  const aiExtractedData = client.ai_extracted_data || {};
  const documents = client.documents || [];
  
  // Build field label map from form template
  const fieldLabelMap = buildFieldLabelMap(client.form_template as { fields?: unknown[] } | null);
  
  // Helper to get field label with map
  const getFieldLabel = (key: string) => formatLabel(key, fieldLabelMap);

  // Combine all extracted data from documents
  const allDocumentExtractions = documents
    .filter(doc => doc.ai_extracted_data)
    .map(doc => ({
      documentName: doc.name,
      documentType: doc.document_type || doc.type,
      extraction: doc.ai_extracted_data,
    }));

  return (
    <DashboardLayout 
      title={client.name}
      subtitle={`Client onboarding details`}
      headerAction={
        <Button 
          variant="outline" 
          className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
          onClick={() => router.push('/dashboard/clients')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>
      }
    >
      {/* Client Overview Card */}
      <Card className="app-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-app-foreground">{client.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-app-muted mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </span>
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`${statusConfig[client.status].color} border font-medium px-3 py-1`}
              >
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusConfig[client.status].label}
              </Badge>
              <div className="text-right">
                <p className="text-sm text-app-muted">Progress</p>
                <p className="text-lg font-semibold text-app-foreground">{client.onboarding_progress}%</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-app-muted">Onboarding Progress</span>
              <span className="text-app-foreground font-medium">{client.documents_submitted}/{client.documents_required} documents</span>
            </div>
            <div className="h-3 bg-app-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                style={{ width: `${client.onboarding_progress}%` }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-app">
            <div>
              <p className="text-sm text-app-muted">Created</p>
              <p className="font-medium text-app-foreground">{format(new Date(client.created_at), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-app-muted">Last Activity</p>
              <p className="font-medium text-app-foreground">{formatDistanceToNow(new Date(client.last_activity), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-sm text-app-muted">Form Type</p>
              <p className="font-medium text-app-foreground">{client.form_template?.name || 'Standard Form'}</p>
            </div>
            <div>
              <p className="text-sm text-app-muted">Documents</p>
              <p className="font-medium text-app-foreground">{documents.length} uploaded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="form-data" className="space-y-6">
        <TabsList className="bg-app-card border border-app p-1">
          <TabsTrigger value="form-data" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Form Data
          </TabsTrigger>
          <TabsTrigger value="ai-extracted" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Extracted
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Documents ({documents.length})
          </TabsTrigger>
        </TabsList>

        {/* Form Data Tab */}
        <TabsContent value="form-data" className="space-y-6">
          {Object.keys(formData).length > 0 ? (
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-app-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Submitted Form Information
                </CardTitle>
                <CardDescription>All data submitted by the client through the onboarding form</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(formData).map(([key, value]) => {
                    const FieldIcon = getFieldIcon(key);
                    const displayValue = formatValue(value);
                    const fieldLabel = formatLabel(key, fieldLabelMap);
                    return (
                      <div 
                        key={key} 
                        className="p-4 bg-app-muted rounded-xl border border-app hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FieldIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-app-muted uppercase tracking-wide">{fieldLabel}</p>
                              <p className="text-app-foreground font-medium mt-1 break-words">{displayValue}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => copyToClipboard(displayValue, fieldLabel, key)}
                          >
                            {copiedField === key ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-app-muted" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">Waiting for Form Submission</h3>
                <p className="text-app-muted">The client hasn't submitted their onboarding form yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Extracted Data Tab */}
        <TabsContent value="ai-extracted" className="space-y-6">
          {/* Combined AI Extraction Summary */}
          {Object.keys(aiExtractedData).length > 0 && (
            <Card className="app-card border-primary/30">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-xl">
                <CardTitle className="text-app-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Extracted Summary
                </CardTitle>
                <CardDescription>Combined data extracted from all documents using AI</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(aiExtractedData).map(([key, value]) => {
                    // Skip metadata and internal fields
                    if (['error', 'raw_text', 'document_description', 'fields_found', 'fields_not_found', 'extraction_confidence'].includes(key)) return null;
                    const FieldIcon = getFieldIcon(key);
                    const displayValue = formatValue(value);
                    return (
                      <div 
                        key={key} 
                        className="p-4 bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/20 hover:border-primary/40 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <FieldIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-app-muted uppercase tracking-wide flex items-center gap-1">
                                {formatLabel(key)}
                                <Sparkles className="w-3 h-3 text-primary" />
                              </p>
                              <p className="text-app-foreground font-medium mt-1 break-words">{displayValue}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => copyToClipboard(displayValue, formatLabel(key), key)}
                          >
                            {copiedField === key ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-app-muted" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-Document Extractions */}
          {allDocumentExtractions.length > 0 ? (
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-app-foreground">Document-by-Document Extraction</CardTitle>
                <CardDescription>AI-extracted data from each uploaded document</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-3">
                  {allDocumentExtractions.map((doc, index) => {
                    const extraction = doc.extraction || {};
                    const description = extraction.document_description as string | undefined;
                    const confidence = extraction.extraction_confidence as string | undefined;
                    const fieldsNotFound = extraction.fields_not_found as string[] | undefined;
                    const fieldsFound = extraction.fields_found as string[] | undefined;
                    
                    // Get confidence badge styling
                    const getConfidenceBadge = (conf: string | undefined) => {
                      switch (conf) {
                        case 'high':
                          return { color: 'bg-green-100 text-green-800 border-green-200', label: 'High Confidence' };
                        case 'medium':
                          return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium Confidence' };
                        case 'low':
                          return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Low Confidence' };
                        default:
                          return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Unknown' };
                      }
                    };
                    
                    const confidenceBadge = getConfidenceBadge(confidence);
                    
                    return (
                      <AccordionItem 
                        key={index} 
                        value={`doc-${index}`}
                        className="border border-app rounded-xl px-4 bg-app-muted overflow-hidden"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="font-medium text-app-foreground">{doc.documentName}</p>
                              <p className="text-sm text-app-muted capitalize">{doc.documentType?.replace(/_/g, ' ') || 'Document'}</p>
                            </div>
                            {confidence && (
                              <Badge variant="outline" className={`${confidenceBadge.color} text-xs mr-2`}>
                                {confidenceBadge.label}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-4 pt-2">
                            {/* Document Description */}
                            {description && (
                              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                <div className="flex items-start gap-3">
                                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Document Summary</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-400">{description}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Extracted Fields */}
                            {fieldsFound && fieldsFound.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-app-foreground mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  Fields Found ({fieldsFound.length})
                                </p>
                                <div className="grid md:grid-cols-2 gap-3">
                                  {Object.entries(extraction).map(([key, value]) => {
                                    // Skip metadata fields
                                    if (['error', 'raw_text', 'document_description', 'fields_found', 'fields_not_found', 'extraction_confidence'].includes(key)) return null;
                                    const FieldIcon = getFieldIcon(key);
                                    return (
                                      <div 
                                        key={key} 
                                        className="p-3 bg-app-card rounded-lg border border-green-200/50 dark:border-green-800/50"
                                      >
                                        <div className="flex items-start gap-2">
                                          <FieldIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs text-app-muted">{formatLabel(key)}</p>
                                            <p className="text-sm text-app-foreground font-medium break-words">{formatValue(value)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Fields Not Found */}
                            {fieldsNotFound && fieldsNotFound.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-app-foreground mb-2 flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-orange-500" />
                                  Fields Not Found in This Document ({fieldsNotFound.length})
                                </p>
                                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                                  <div className="flex flex-wrap gap-2">
                                    {fieldsNotFound.map((field) => (
                                      <Badge 
                                        key={field} 
                                        variant="outline" 
                                        className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700"
                                      >
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        {formatLabel(field)}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                    These fields could not be found in this document. They may be available in other uploaded documents.
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Fallback: Show all extracted data if no fields_found metadata */}
                            {!fieldsFound && (
                              <div className="grid md:grid-cols-2 gap-3">
                                {Object.entries(extraction).map(([key, value]) => {
                                  if (['error', 'raw_text', 'document_description', 'fields_found', 'fields_not_found', 'extraction_confidence'].includes(key)) return null;
                                  const FieldIcon = getFieldIcon(key);
                                  return (
                                    <div 
                                      key={key} 
                                      className="p-3 bg-app-card rounded-lg border border-app"
                                    >
                                      <div className="flex items-start gap-2">
                                        <FieldIcon className="w-4 h-4 text-primary mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs text-app-muted">{formatLabel(key)}</p>
                                          <p className="text-sm text-app-foreground font-medium break-words">{formatValue(value)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          ) : Object.keys(aiExtractedData).length === 0 ? (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No AI Extractions Yet</h3>
                <p className="text-app-muted">AI-extracted data will appear here once the client uploads documents.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {documents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="app-card hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        doc.status === 'verified' ? 'bg-green-100' :
                        doc.status === 'rejected' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <FileText className={`w-6 h-6 ${
                          doc.status === 'verified' ? 'text-green-600' :
                          doc.status === 'rejected' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-app-foreground truncate">{doc.name}</p>
                        <p className="text-sm text-app-muted capitalize">{doc.document_type?.replace(/_/g, ' ') || doc.type}</p>
                        <Badge 
                          variant="outline" 
                          className={`mt-2 text-xs ${
                            doc.status === 'verified' ? 'bg-green-100 text-green-800 border-green-200' :
                            doc.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {doc.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* AI Extraction Badge */}
                    {doc.ai_extracted_data && Object.keys(doc.ai_extracted_data).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-app">
                        <p className="text-xs text-app-muted flex items-center gap-1 mb-2">
                          <Sparkles className="w-3 h-3 text-primary" />
                          AI Extracted Fields
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(doc.ai_extracted_data).slice(0, 4).map(key => (
                            <Badge key={key} variant="secondary" className="text-xs bg-primary/10 text-primary">
                              {formatLabel(key)}
                            </Badge>
                          ))}
                          {Object.keys(doc.ai_extracted_data).length > 4 && (
                            <Badge variant="secondary" className="text-xs bg-app-muted text-app-muted">
                              +{Object.keys(doc.ai_extracted_data).length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {doc.file_url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => window.open(doc.file_url!, '_blank')}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            asChild
                          >
                            <a href={doc.file_url} download={doc.name}>
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="app-card">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-app-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-foreground mb-2">No Documents Uploaded</h3>
                <p className="text-app-muted">Documents will appear here once the client uploads them.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Notes Section */}
      {client.notes && (
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="text-app-foreground text-lg">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-app-muted whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
