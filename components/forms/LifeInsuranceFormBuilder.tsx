"use client";

import { useState } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  CheckSquare,
  TextCursor,
  Upload,
  FileText,
  Save,
  Eye,
  ChevronDown,
  ChevronUp,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Base Life Insurance Form Questions
const baseFormSections = [
  {
    id: "personal_info",
    title: "Personal Information",
    description: "Basic contact and identification details",
    fields: [
      { id: "full_name", type: "text", label: "Full Name", placeholder: "Enter your full legal name", required: true },
      { id: "date_of_birth", type: "text", label: "Date of Birth", placeholder: "MM/DD/YYYY", required: true },
      { id: "phone", type: "tel", label: "Phone Number", placeholder: "(555) 123-4567", required: true },
      { id: "email", type: "email", label: "Email Address", placeholder: "email@example.com", required: true },
      { id: "address", type: "textarea", label: "Mailing Address", placeholder: "Enter your full address", required: true },
    ],
  },
  {
    id: "current_coverage",
    title: "Current Insurance Status",
    description: "Information about existing coverage",
    fields: [
      {
        id: "has_existing_coverage",
        type: "checkbox_group",
        label: "Do you currently have any life insurance coverage?",
        options: ["Yes, through employer", "Yes, personal policy", "No current coverage"],
        required: true,
      },
      { id: "existing_coverage_amount", type: "text", label: "If yes, what is your current coverage amount?", placeholder: "$0", required: false },
    ],
  },
  {
    id: "insurance_needs",
    title: "Insurance Needs & Goals",
    description: "Understanding your coverage requirements",
    fields: [
      { id: "reason_for_insurance", type: "textarea", label: "What made you start looking for life insurance options now, and what needs do you want the policy to meet?", placeholder: "e.g., Family protection, mortgage coverage, retirement planning...", required: true },
      { id: "coverage_amount", type: "text", label: "How much coverage amount are you interested in?", placeholder: "e.g., $500,000", required: true },
      { id: "premium_budget", type: "text", label: "What is your budget for monthly/annual premiums?", placeholder: "e.g., $50-100/month", required: true },
      {
        id: "policy_type_interest",
        type: "checkbox_group",
        label: "What type of policy are you interested in?",
        options: ["Term Life", "Whole Life", "Universal Life", "Not sure - need guidance"],
        required: false,
      },
    ],
  },
  {
    id: "health_info",
    title: "Health Information",
    description: "Current health status and medical history",
    fields: [
      { id: "health_status", type: "textarea", label: "What is your current health status?", placeholder: "Describe your general health condition", required: true },
      { id: "height", type: "text", label: "Height", placeholder: "e.g., 5'10\"", required: true },
      { id: "weight", type: "text", label: "Weight", placeholder: "e.g., 175 lbs", required: true },
      {
        id: "tobacco_use",
        type: "checkbox_group",
        label: "Do you use any tobacco products?",
        options: ["Cigarettes", "Vapes/E-cigarettes", "Chewing tobacco", "Cigars", "None"],
        required: true,
      },
      {
        id: "pre_existing_conditions",
        type: "checkbox_group",
        label: "Do you have any pre-existing medical conditions?",
        options: ["Heart disease", "Cancer", "Diabetes", "High blood pressure", "None of the above"],
        required: true,
      },
      {
        id: "family_history",
        type: "checkbox_group",
        label: "Family history of critical illnesses before age 60?",
        options: ["Heart disease", "Cancer", "Diabetes", "Stroke", "None known"],
        required: false,
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Occupation & Lifestyle",
    description: "Work and activity information",
    fields: [
      { id: "occupation", type: "text", label: "What is your occupation?", placeholder: "Job title and industry", required: true },
      { id: "employer", type: "text", label: "Employer Name (optional)", placeholder: "Company name", required: false },
      {
        id: "dangerous_activities",
        type: "checkbox_group",
        label: "Do you participate in any dangerous hobbies or extreme sports?",
        options: ["Skydiving", "Car/Motorcycle racing", "Rock climbing", "Scuba diving", "Aviation (private pilot)", "None of the above"],
        required: true,
      },
      { id: "travel_frequency", type: "text", label: "Do you travel internationally frequently? If so, where?", placeholder: "Countries or regions", required: false },
    ],
  },
];

// Default required documents for life insurance
const defaultRequiredDocuments = [
  { id: "govt_id", name: "Government-issued ID", description: "Driver's license, passport, etc.", required: true },
  { id: "medical_records", name: "Recent Medical Records", description: "If available, last 2 years", required: false },
  { id: "existing_policy", name: "Existing Policy Documents", description: "If replacing or adding to coverage", required: false },
  { id: "income_verification", name: "Proof of Income", description: "Recent pay stubs or tax returns", required: false },
];

interface CustomField {
  id: string;
  type: "text" | "checkbox" | "checkbox_group";
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

interface LifeInsuranceFormBuilderProps {
  onSave?: (formData: {
    sections: typeof baseFormSections;
    customFields: CustomField[];
    requiredDocuments: RequiredDocument[];
    formName: string;
    formDescription: string;
  }) => void;
  initialData?: {
    customFields?: CustomField[];
    requiredDocuments?: RequiredDocument[];
    formName?: string;
    formDescription?: string;
  };
}

export default function LifeInsuranceFormBuilder({ onSave, initialData }: LifeInsuranceFormBuilderProps) {
  const [formName, setFormName] = useState(initialData?.formName || "Life Insurance Application");
  const [formDescription, setFormDescription] = useState(
    initialData?.formDescription || "Complete this form to receive a personalized life insurance quote."
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(initialData?.customFields || []);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>(
    initialData?.requiredDocuments || defaultRequiredDocuments
  );
  const [newFieldType, setNewFieldType] = useState<"text" | "checkbox" | "checkbox_group">("text");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["personal_info", "insurance_needs"]);
  const [showPreview, setShowPreview] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;

    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      type: newFieldType,
      label: newFieldLabel,
      placeholder: newFieldType === "text" ? `Enter ${newFieldLabel.toLowerCase()}` : undefined,
      options: newFieldType === "checkbox_group" ? newFieldOptions.split(",").map(o => o.trim()).filter(Boolean) : undefined,
      required: false,
    };

    setCustomFields([...customFields, newField]);
    setNewFieldLabel("");
    setNewFieldOptions("");
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const toggleFieldRequired = (id: string) => {
    setCustomFields(customFields.map(f =>
      f.id === id ? { ...f, required: !f.required } : f
    ));
  };

  const addRequiredDocument = () => {
    if (!newDocName.trim()) return;

    const newDoc: RequiredDocument = {
      id: `doc_${Date.now()}`,
      name: newDocName,
      description: newDocDescription,
      required: false,
    };

    setRequiredDocuments([...requiredDocuments, newDoc]);
    setNewDocName("");
    setNewDocDescription("");
  };

  const removeDocument = (id: string) => {
    setRequiredDocuments(requiredDocuments.filter(d => d.id !== id));
  };

  const toggleDocumentRequired = (id: string) => {
    setRequiredDocuments(requiredDocuments.map(d =>
      d.id === id ? { ...d, required: !d.required } : d
    ));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        sections: baseFormSections,
        customFields,
        requiredDocuments,
        formName,
        formDescription,
      });
    }
  };

  const totalFields = baseFormSections.reduce((acc, s) => acc + s.fields.length, 0) + customFields.length;

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Form Details
          </CardTitle>
          <CardDescription className="text-app-muted">
            Customize your life insurance form name and description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-app-foreground">Form Name</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-app-muted border-app text-app-foreground"
              placeholder="Enter form name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-app-foreground">Form Description</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="bg-app-muted border-app text-app-foreground resize-none"
              placeholder="Enter form description"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Badge className="bg-red-100 text-red-700">
              {totalFields} Fields
            </Badge>
            <Badge className="bg-accent/20 text-accent">
              {requiredDocuments.length} Documents
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Base Form Sections */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground">Life Insurance Questions</CardTitle>
          <CardDescription className="text-app-muted">
            Standard life insurance intake questions (cannot be removed)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {baseFormSections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 rounded-lg bg-app-muted/50 cursor-pointer hover:bg-app-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-app-muted" />
                    <div>
                      <h4 className="font-medium text-app-foreground">{section.title}</h4>
                      <p className="text-sm text-app-muted">{section.fields.length} fields</p>
                    </div>
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronUp className="w-5 h-5 text-app-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-app-muted" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pl-11 space-y-2">
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-app bg-app-card"
                  >
                    <div className="flex items-center gap-3">
                      {field.type === "checkbox_group" ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <TextCursor className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-app-foreground">{field.label}</p>
                        {field.type === "checkbox_group" && field.options && (
                          <p className="text-xs text-app-muted">
                            Options: {field.options.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {field.required && (
                      <Badge variant="outline" className="text-destructive border-destructive/50">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent" />
            Custom Questions
          </CardTitle>
          <CardDescription className="text-app-muted">
            Add your own questions to the form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-2 mb-4">
              {customFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-app bg-app-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {field.type === "checkbox_group" || field.type === "checkbox" ? (
                      <CheckSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <TextCursor className="w-4 h-4 text-accent" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-app-foreground">{field.label}</p>
                      {field.type === "checkbox_group" && field.options && (
                        <p className="text-xs text-app-muted">
                          Options: {field.options.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFieldRequired(field.id)}
                      className={field.required ? "text-destructive" : "text-app-muted"}
                    >
                      {field.required ? "Required" : "Optional"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Custom Field */}
          <div className="p-4 rounded-lg border border-dashed border-app bg-app-muted/20">
            <h4 className="font-medium text-app-foreground mb-3">Add New Question</h4>
            <div className="grid gap-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-app-foreground text-sm">Question Type</Label>
                  <Select value={newFieldType} onValueChange={(v: "text" | "checkbox" | "checkbox_group") => setNewFieldType(v)}>
                    <SelectTrigger className="bg-app-muted border-app text-app-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-app-card border-app">
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="checkbox">Single Checkbox</SelectItem>
                      <SelectItem value="checkbox_group">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-app-foreground text-sm">Question Label</Label>
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="e.g., Beneficiary Information"
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
              </div>
              {newFieldType === "checkbox_group" && (
                <div className="space-y-2">
                  <Label className="text-app-foreground text-sm">Options (comma-separated)</Label>
                  <Input
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="e.g., Spouse, Children, Parents, Other"
                    className="bg-app-muted border-app text-app-foreground"
                  />
                </div>
              )}
              <Button
                onClick={addCustomField}
                disabled={!newFieldLabel.trim()}
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Documents */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Required Documents
          </CardTitle>
          <CardDescription className="text-app-muted">
            Specify which documents clients need to upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document List */}
          <div className="space-y-2">
            {requiredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-app bg-app-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-app-foreground">{doc.name}</p>
                    <p className="text-xs text-app-muted">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDocumentRequired(doc.id)}
                    className={doc.required ? "text-destructive" : "text-app-muted"}
                  >
                    {doc.required ? "Required" : "Optional"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(doc.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Document */}
          <div className="p-4 rounded-lg border border-dashed border-app bg-app-muted/20">
            <h4 className="font-medium text-app-foreground mb-3">Add Document Requirement</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-app-foreground text-sm">Document Name</Label>
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g., Beneficiary Form"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground text-sm">Description</Label>
                <Input
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  placeholder="e.g., Completed beneficiary designation"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
            </div>
            <Button
              onClick={addRequiredDocument}
              disabled={!newDocName.trim()}
              className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
          className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? "Hide Preview" : "Preview Form"}
        </Button>
        <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white">
          <Save className="w-4 h-4 mr-2" />
          Save Form Template
        </Button>
      </div>

      {/* Form Preview */}
      {showPreview && (
        <Card className="bg-app-card border-app">
          <CardHeader className="border-b border-app">
            <CardTitle className="text-app-foreground">{formName}</CardTitle>
            <CardDescription className="text-app-muted">{formDescription}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Base Sections Preview */}
            {baseFormSections.map((section) => (
              <div key={section.id} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-app-foreground text-lg">{section.title}</h3>
                  <p className="text-sm text-app-muted">{section.description}</p>
                </div>
                <div className="grid gap-4">
                  {section.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-app-foreground">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === "checkbox_group" ? (
                        <div className="flex flex-wrap gap-4">
                          {field.options?.map((option) => (
                            <div key={option} className="flex items-center gap-2">
                              <Checkbox disabled className="border-app" />
                              <span className="text-sm text-app-foreground">{option}</span>
                            </div>
                          ))}
                        </div>
                      ) : field.type === "textarea" ? (
                        <Textarea
                          disabled
                          placeholder={field.placeholder}
                          className="bg-app-muted border-app text-app-foreground"
                        />
                      ) : (
                        <Input
                          disabled
                          type={field.type}
                          placeholder={field.placeholder}
                          className="bg-app-muted border-app text-app-foreground"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Fields Preview */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-app-foreground text-lg">Additional Questions</h3>
                </div>
                <div className="grid gap-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-app-foreground">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === "checkbox_group" ? (
                        <div className="flex flex-wrap gap-4">
                          {field.options?.map((option) => (
                            <div key={option} className="flex items-center gap-2">
                              <Checkbox disabled className="border-app" />
                              <span className="text-sm text-app-foreground">{option}</span>
                            </div>
                          ))}
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <Checkbox disabled className="border-app" />
                          <span className="text-sm text-app-foreground">{field.label}</span>
                        </div>
                      ) : (
                        <Input
                          disabled
                          placeholder={field.placeholder}
                          className="bg-app-muted border-app text-app-foreground"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Preview */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-app-foreground text-lg">Document Upload</h3>
                <p className="text-sm text-app-muted">Please upload the following documents</p>
              </div>
              <div className="grid gap-3">
                {requiredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg border border-dashed border-app bg-app-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-app-foreground">
                          {doc.name}
                          {doc.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <p className="text-sm text-app-muted">{doc.description}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled className="border-app text-app-muted">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
