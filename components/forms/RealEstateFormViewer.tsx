"use client";

import { useState, useRef } from "react";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle,
  Loader2,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// Types for form structure
interface FormField {
  id: string;
  type: "text" | "tel" | "email" | "textarea" | "checkbox" | "checkbox_group";
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

interface FormData {
  formName: string;
  formDescription: string;
  sections: FormSection[];
  customFields: FormField[];
  requiredDocuments: RequiredDocument[];
}

interface UploadedFile {
  documentId: string;
  file: File;
  name: string;
}

interface RealEstateFormViewerProps {
  formData: FormData;
  onSubmit?: (data: {
    fieldValues: Record<string, string | string[]>;
    uploadedFiles: UploadedFile[];
  }) => Promise<void>;
  readOnly?: boolean;
}

export default function RealEstateFormViewer({ formData, onSubmit, readOnly = false }: RealEstateFormViewerProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string | string[]>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFieldValues(prev => {
      const currentValues = (prev[fieldId] as string[]) || [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldId]: currentValues.filter(v => v !== option) };
      }
    });
  };

  const handleSingleCheckboxChange = (fieldId: string, checked: boolean) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: checked ? "yes" : "no" }));
  };

  const handleFileUpload = (documentId: string, file: File) => {
    setUploadedFiles(prev => {
      // Remove existing file for this document if any
      const filtered = prev.filter(f => f.documentId !== documentId);
      return [...filtered, { documentId, file, name: file.name }];
    });
  };

  const removeFile = (documentId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.documentId !== documentId));
  };

  const getUploadedFile = (documentId: string) => {
    return uploadedFiles.find(f => f.documentId === documentId);
  };

  const validateForm = (): boolean => {
    // Check required fields in sections
    for (const section of formData.sections) {
      for (const field of section.fields) {
        if (field.required) {
          const value = fieldValues[field.id];
          if (!value || (Array.isArray(value) && value.length === 0)) {
            toast.error(`Please fill in "${field.label}"`);
            return false;
          }
        }
      }
    }

    // Check required custom fields
    for (const field of formData.customFields) {
      if (field.required) {
        const value = fieldValues[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          toast.error(`Please fill in "${field.label}"`);
          return false;
        }
      }
    }

    // Check required documents
    for (const doc of formData.requiredDocuments) {
      if (doc.required && !getUploadedFile(doc.id)) {
        toast.error(`Please upload "${doc.name}"`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({ fieldValues, uploadedFiles });
      }
      setSubmitted(true);
      toast.success("Form submitted successfully!");
    } catch {
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = fieldValues[field.id];

    switch (field.type) {
      case "checkbox_group":
        return (
          <div className="flex flex-wrap gap-4">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={((value as string[]) || []).includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(field.id, option, !!checked)}
                  disabled={readOnly}
                  className="border-app data-[state=checked]:bg-primary"
                />
                <label
                  htmlFor={`${field.id}-${option}`}
                  className="text-sm text-app-foreground cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={value === "yes"}
              onCheckedChange={(checked) => handleSingleCheckboxChange(field.id, !!checked)}
              disabled={readOnly}
              className="border-app data-[state=checked]:bg-primary"
            />
            <label
              htmlFor={field.id}
              className="text-sm text-app-foreground cursor-pointer"
            >
              {field.label}
            </label>
          </div>
        );

      case "textarea":
        return (
          <Textarea
            id={field.id}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
            className="bg-app-muted border-app text-app-foreground placeholder:text-app-muted resize-none"
            rows={3}
          />
        );

      default:
        return (
          <Input
            id={field.id}
            type={field.type}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={readOnly}
            className="bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
          />
        );
    }
  };

  if (submitted) {
    return (
      <Card className="bg-app-card border-app">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-app-foreground mb-2">Form Submitted!</h2>
          <p className="text-app-muted max-w-md mx-auto">
            Thank you for submitting your information. We'll review your submission and get back to you shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <Card className="bg-app-card border-app">
        <CardHeader className="text-center border-b border-app">
          <CardTitle className="text-2xl text-app-foreground font-display">
            {formData.formName}
          </CardTitle>
          <CardDescription className="text-app-muted">
            {formData.formDescription}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Form Sections */}
      {formData.sections.map((section) => (
        <Card key={section.id} className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-lg text-app-foreground">{section.title}</CardTitle>
            {section.description && (
              <CardDescription className="text-app-muted">{section.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {section.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.type !== "checkbox" && (
                  <Label htmlFor={field.id} className="text-app-foreground">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                )}
                {renderField(field)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Custom Fields */}
      {formData.customFields.length > 0 && (
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-lg text-app-foreground">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {formData.customFields.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.type !== "checkbox" && (
                  <Label htmlFor={field.id} className="text-app-foreground">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                )}
                {renderField(field)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document Upload */}
      {formData.requiredDocuments.length > 0 && (
        <Card className="bg-app-card border-app">
          <CardHeader>
            <CardTitle className="text-lg text-app-foreground">Document Upload</CardTitle>
            <CardDescription className="text-app-muted">
              Please upload the following documents
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {formData.requiredDocuments.map((doc) => {
              const uploadedFile = getUploadedFile(doc.id);
              
              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border border-dashed border-app bg-app-muted/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-app-foreground">
                        {doc.name}
                        {doc.required && <span className="text-destructive ml-1">*</span>}
                      </p>
                      <p className="text-sm text-app-muted">{doc.description}</p>
                    </div>
                    
                    {uploadedFile ? (
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 max-w-32 truncate">{uploadedFile.name}</span>
                        {!readOnly && (
                          <button
                            onClick={() => removeFile(doc.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc.id, file);
                          }}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          disabled={readOnly}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[doc.id]?.click()}
                          disabled={readOnly}
                          className="border-app text-app-foreground hover:bg-app-muted"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {!readOnly && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Form
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
