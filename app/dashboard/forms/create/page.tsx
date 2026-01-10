"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RealEstateFormBuilder from "@/components/forms/RealEstateFormBuilder";
import LifeInsuranceFormBuilder from "@/components/forms/LifeInsuranceFormBuilder";
import MortgageFormBuilder from "@/components/forms/MortgageFormBuilder";
import { useCreateFormTemplate } from "@/lib/hooks/use-database";
import { toast } from "sonner";
import type { FormStatus, FormCategory } from "@/lib/types/database";
import { Suspense } from "react";

function CreateFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateType = searchParams.get("template");
  
  const createForm = useCreateFormTemplate();

  const handleSave = async (formData: {
    sections: unknown[];
    customFields: unknown[];
    requiredDocuments: unknown[];
    formName: string;
    formDescription: string;
  }, category: FormCategory = "general") => {
    try {
      // Count total fields
      const baseFieldsCount = (formData.sections as Array<{ fields: unknown[] }>).reduce(
        (acc, section) => acc + section.fields.length, 0
      );
      const totalFields = baseFieldsCount + formData.customFields.length;

      // Store form structure as array with single config object
      const formStructure = [{
        baseSections: formData.sections,
        customFields: formData.customFields,
        requiredDocuments: formData.requiredDocuments,
        templateType: templateType || "custom",
      }];

      await createForm.mutateAsync({
        name: formData.formName,
        description: formData.formDescription,
        category: category,
        fields: formStructure,
        fields_count: totalFields,
        status: "active" as FormStatus,
      });
      
      toast.success("Form template saved successfully!");
      router.push("/dashboard/forms");
    } catch {
      toast.error("Failed to save form template");
    }
  };

  // Determine which form builder to show based on template type
  const getFormBuilder = () => {
    switch (templateType) {
      case "life-insurance":
        return (
          <LifeInsuranceFormBuilder 
            onSave={(data) => handleSave(data, "general")} 
          />
        );
      case "mortgage":
        return (
          <MortgageFormBuilder 
            onSave={(data) => handleSave(data, "buyer")} 
          />
        );
      case "real-estate-intake":
      default:
        return (
          <RealEstateFormBuilder 
            onSave={(data) => handleSave(data, "general")} 
          />
        );
    }
  };

  // Get title and subtitle based on template type
  const getPageInfo = () => {
    switch (templateType) {
      case "life-insurance":
        return {
          title: "Life Insurance Application Form",
          subtitle: "Customize the life insurance intake form with health, lifestyle, and coverage questions"
        };
      case "mortgage":
        return {
          title: "Mortgage Application Form",
          subtitle: "Customize the mortgage pre-qualification form with financial and property questions"
        };
      case "real-estate-intake":
        return {
          title: "Real Estate Lead Intake Form",
          subtitle: "Customize the standard lead intake form with your own questions and document requirements"
        };
      default:
        return {
          title: "Create Form Template",
          subtitle: "Build a custom form template for client onboarding"
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <DashboardLayout
      title={pageInfo.title}
      subtitle={pageInfo.subtitle}
      headerAction={
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/forms")}
          className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forms
        </Button>
      }
    >
      {getFormBuilder()}
    </DashboardLayout>
  );
}

export default function CreateFormPage() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    }>
      <CreateFormContent />
    </Suspense>
  );
}
