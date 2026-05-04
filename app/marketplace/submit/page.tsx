"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Ship,
  Upload,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCreateListing } from "@/lib/hooks/use-marketplace";
import { useAuth } from "@/lib/supabase/auth-context";
import type {
  AssetType,
  ListingFormData,
  RealEstateSubtype,
  BoatSubtype,
  HullMaterial,
  PropertyCondition,
} from "@/lib/types/marketplace";

const STEPS = ["Asset Type", "Details", "Photos", "Review"] as const;

const ASSET_TYPES: { type: AssetType; label: string; icon: typeof Building2; description: string }[] = [
  { type: "real_estate", label: "Real Estate", icon: Building2, description: "Houses, condos, land & commercial properties" },
  { type: "boat", label: "Boat or Yacht", icon: Ship, description: "Sailboats, yachts, speedboats & more" },
];

const PROPERTY_TYPES: { value: RealEstateSubtype; label: string }[] = [
  { value: "house", label: "House" },
  { value: "condo", label: "Condo" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const VESSEL_TYPES: { value: BoatSubtype; label: string }[] = [
  { value: "sailboat", label: "Sailboat" },
  { value: "yacht", label: "Yacht" },
  { value: "speedboat", label: "Speedboat" },
  { value: "catamaran", label: "Catamaran" },
  { value: "fishing_boat", label: "Fishing Boat" },
  { value: "other", label: "Other" },
];

const HULL_MATERIALS: { value: HullMaterial; label: string }[] = [
  { value: "fiberglass", label: "Fiberglass" },
  { value: "aluminum", label: "Aluminum" },
  { value: "steel", label: "Steel" },
  { value: "wood", label: "Wood" },
  { value: "other", label: "Other" },
];

const CONDITIONS: { value: PropertyCondition; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "needs_work", label: "Needs Work" },
];

const ARIA_ANALYSIS_STEPS = [
  "Fetching property data...",
  "Running ARIA scoring...",
  "Checking neighborhood intelligence...",
  "Generating deal summary...",
];

const initialFormData: ListingFormData = {
  asset_type: null,
  title: "",
  description: "",
  asking_price: "",
  location_city: "",
  location_state: "",
  location_zip: "",
  photos: [],
  photo_previews: [],
  specs: {},
};

export default function SubmitListingPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ListingFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ariaStep, setAriaStep] = useState(-1);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createListing = useCreateListing();
  const { user } = useAuth();

  const isBoat = formData.asset_type === "boat";
  const totalSteps = 4;
  const visibleSteps = STEPS;

  const updateFormData = useCallback(
    <K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const updateSpecs = useCallback(
    (key: string, value: string | number | undefined) => {
      setFormData((prev) => ({
        ...prev,
        specs: { ...prev.specs, [key]: value } as Record<string, string | number | undefined>,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`specs.${key}`];
        return next;
      });
    },
    [],
  );

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0 && !formData.asset_type) {
      newErrors.asset_type = "Please select an asset type";
    }

    if (step === 1) {
      if (isBoat) {
        if (!formData.title.trim()) newErrors.title = "Listing title is required";
        if (!formData.specs.subtype) newErrors["specs.subtype"] = "Vessel type is required";
        if (!formData.asking_price) newErrors.asking_price = "Asking price is required";
      } else {
        if (!formData.title.trim()) newErrors.title = "Listing title is required";
        if (!formData.specs.subtype) newErrors["specs.subtype"] = "Property type is required";
        if (!formData.asking_price) newErrors.asking_price = "Asking price is required";
        if (!formData.location_city.trim()) newErrors.location_city = "City is required";
      }
    }

    const photoStep = 2;
    if (step === photoStep) {
      const minPhotos = isBoat ? 1 : 2;
      if (formData.photos.length < minPhotos) {
        newErrors.photos = `Please upload at least ${minPhotos} photo${minPhotos > 1 ? "s" : ""}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = [...formData.photos, ...files];
    const newPreviews = [...formData.photo_previews, ...files.map((f) => URL.createObjectURL(f))];
    updateFormData("photos", newPhotos);
    updateFormData("photo_previews", newPreviews);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.photos;
      return next;
    });
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(formData.photo_previews[index]);
    updateFormData(
      "photos",
      formData.photos.filter((_, i) => i !== index),
    );
    updateFormData(
      "photo_previews",
      formData.photo_previews.filter((_, i) => i !== index),
    );
  };

  useEffect(() => {
    if (ariaStep < 0) return;
    if (ariaStep >= ARIA_ANALYSIS_STEPS.length) return;

    const timer = setTimeout(() => {
      if (ariaStep < ARIA_ANALYSIS_STEPS.length - 1) {
        setAriaStep(ariaStep + 1);
      } else {
        handleSubmitFinal();
      }
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ariaStep]);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    await handleSubmitFinal();
  };

  const handleSubmitFinal = async () => {
    if (!user) {
      setErrors({ submit: "You must be signed in to submit a listing." });
      return;
    }
    try {
      await createListing.mutateAsync({
        formData,
        userId: user.id,
      });
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrors({ submit: message });
    }
  };

  const handleSubmitAnother = () => {
    setStep(0);
    setFormData(initialFormData);
    setErrors({});
    setAriaStep(-1);
    setSubmitted(false);
  };

  const formatPrice = (value: string) => {
    const num = value.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("en-US");
  };

  const currentStepIndex = step;
  const isReviewStep = step === totalSteps - 1;

  if (!user) {
    return (
      <div className="min-h-screen bg-app">
        <Navbar />
        <main className="pt-20 dashboard-light">
          <div className="container mx-auto px-6 py-24 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Sign in to submit a listing</h1>
            <p className="text-muted-foreground mb-6">You need to be signed in to submit a listing to the marketplace.</p>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Sign In</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app">
      <Navbar />
      <main className="pt-20 dashboard-light">
        <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-6 py-8">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Submit a Listing</h1>
            <p className="text-muted-foreground mt-1">
              List your asset on the ARIA-powered marketplace
            </p>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 max-w-3xl">
          {/* Progress Bar */}
          {!submitted && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                {visibleSteps.map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        i < currentStepIndex
                          ? "bg-primary text-primary-foreground"
                          : i === currentStepIndex
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < currentStepIndex ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`hidden sm:block text-sm ${
                        i <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {i < visibleSteps.length - 1 && (
                      <div
                        className={`hidden sm:block w-12 lg:w-20 h-0.5 ${
                          i < currentStepIndex ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step Content */}
          {submitted ? (
            <SuccessView onSubmitAnother={handleSubmitAnother} />
          ) : (
            <>
              {step === 0 && (
                <StepAssetType
                  selected={formData.asset_type}
                  onSelect={(type) => updateFormData("asset_type", type)}
                  error={errors.asset_type}
                />
              )}

              {step === 1 && formData.asset_type === "real_estate" && (
                <StepRealEstateDetails
                  formData={formData}
                  updateFormData={updateFormData}
                  updateSpecs={updateSpecs}
                  errors={errors}
                />
              )}

              {step === 1 && formData.asset_type === "boat" && (
                <StepBoatDetails
                  formData={formData}
                  updateFormData={updateFormData}
                  updateSpecs={updateSpecs}
                  errors={errors}
                />
              )}

              {step === 2 && (
                <StepPhotos
                  previews={formData.photo_previews}
                  onBrowse={() => fileInputRef.current?.click()}
                  onRemove={removePhoto}
                  error={errors.photos}
                  minPhotos={isBoat ? 1 : 2}
                />
              )}

              {isReviewStep && (
                <StepReview
                  formData={formData}
                />
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              {errors.submit && (
                <div className="mt-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                  <p className="text-sm font-medium text-destructive">{errors.submit}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {isReviewStep ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={createListing.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    {createListing.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Submit Listing
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ============================================================
   STEP 1 — Asset Type Selection
   ============================================================ */

function StepAssetType({
  selected,
  onSelect,
  error,
}: {
  selected: AssetType | null;
  onSelect: (type: AssetType) => void;
  error?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">What are you listing?</h2>
        <p className="text-muted-foreground mt-1">Choose the type of asset you want to submit</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ASSET_TYPES.map(({ type, label, icon: Icon, description }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:shadow-md ${
              selected === type
                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                : "border-border hover:border-primary/40 bg-card"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                selected === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/* ============================================================
   STEP 2A — Real Estate Details
   ============================================================ */

function StepRealEstateDetails({
  formData,
  updateFormData,
  updateSpecs,
  errors,
}: {
  formData: ListingFormData;
  updateFormData: <K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => void;
  updateSpecs: (key: string, value: string | number | undefined) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Property Details</h2>
        <p className="text-muted-foreground mt-1">Tell us about the property</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldWrapper label="Property Type" error={errors["specs.subtype"]} required className="sm:col-span-2">
          <Select
            value={(formData.specs.subtype as string) || ""}
            onValueChange={(v) => updateSpecs("subtype", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Listing Title" error={errors.title} required className="sm:col-span-2">
          <Input
            placeholder="e.g. Modern 2BR Condo in West Palm Beach"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Description" className="sm:col-span-2">
          <Textarea
            placeholder="Describe the property..."
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
            rows={3}
          />
        </FieldWrapper>

        <FieldWrapper label="Asking Price" error={errors.asking_price} required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              className="pl-7"
              placeholder="0"
              value={formData.asking_price}
              onChange={(e) => updateFormData("asking_price", formatPrice(e.target.value))}
            />
          </div>
        </FieldWrapper>

        <FieldWrapper label="Year Built">
          <Input
            type="number"
            placeholder="e.g. 2005"
            value={formData.specs.year_built ?? ""}
            onChange={(e) => updateSpecs("year_built", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="City" error={errors.location_city} required>
          <Input
            placeholder="City"
            value={formData.location_city}
            onChange={(e) => updateFormData("location_city", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="State">
          <Input
            placeholder="State"
            value={formData.location_state}
            onChange={(e) => updateFormData("location_state", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="ZIP Code">
          <Input
            placeholder="ZIP"
            value={formData.location_zip}
            onChange={(e) => updateFormData("location_zip", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Bedrooms">
          <Input
            type="number"
            placeholder="0"
            value={formData.specs.bedrooms ?? ""}
            onChange={(e) => updateSpecs("bedrooms", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Bathrooms">
          <Input
            type="number"
            placeholder="0"
            value={formData.specs.bathrooms ?? ""}
            onChange={(e) => updateSpecs("bathrooms", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Square Feet">
          <Input
            type="number"
            placeholder="0"
            value={formData.specs.sqft ?? ""}
            onChange={(e) => updateSpecs("sqft", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Lot Size">
          <Input
            placeholder="e.g. 0.25 acres"
            value={formData.specs.lot_size ?? ""}
            onChange={(e) => updateSpecs("lot_size", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Condition">
          <Select
            value={(formData.specs.condition as string) || ""}
            onValueChange={(v) => updateSpecs("condition", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Zoning">
          <Input
            placeholder="e.g. R-1, C-2"
            value={formData.specs.zoning ?? ""}
            onChange={(e) => updateSpecs("zoning", e.target.value)}
          />
        </FieldWrapper>
      </div>
    </div>
  );
}

/* ============================================================
   STEP 2B — Boat / Yacht Details
   ============================================================ */

function StepBoatDetails({
  formData,
  updateFormData,
  updateSpecs,
  errors,
}: {
  formData: ListingFormData;
  updateFormData: <K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => void;
  updateSpecs: (key: string, value: string | number | undefined) => void;
  errors: Record<string, string>;
}) {
  const formatPrice = (value: string) => {
    const num = value.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("en-US");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Vessel Details</h2>
        <p className="text-muted-foreground mt-1">Tell us about the boat or yacht</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldWrapper label="Listing Title" error={errors.title} required className="sm:col-span-2">
          <Input
            placeholder="e.g. 2018 Sea Ray Sundancer 42ft Yacht"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Vessel Name">
          <Input
            placeholder="e.g. Sea Breeze"
            value={formData.specs.vessel_name ?? ""}
            onChange={(e) => updateSpecs("vessel_name", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Year">
          <Input
            type="number"
            placeholder="e.g. 2018"
            value={formData.specs.year_built ?? ""}
            onChange={(e) => updateSpecs("year_built", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Vessel Type" error={errors["specs.subtype"]} required>
          <Select
            value={(formData.specs.subtype as string) || ""}
            onValueChange={(v) => updateSpecs("subtype", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {VESSEL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Length (ft)">
          <Input
            type="number"
            placeholder="0"
            value={formData.specs.length_ft ?? ""}
            onChange={(e) => updateSpecs("length_ft", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Cabins">
          <Input
            type="number"
            placeholder="0"
            value={formData.specs.cabin_count ?? ""}
            onChange={(e) => updateSpecs("cabin_count", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Engine Type">
          <Input
            placeholder="e.g. Twin Diesel"
            value={formData.specs.engine_type ?? ""}
            onChange={(e) => updateSpecs("engine_type", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Engine Hours">
          <Input
            type="number"
            placeholder="0"
            value={formData.specs.engine_hours ?? ""}
            onChange={(e) => updateSpecs("engine_hours", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FieldWrapper>

        <FieldWrapper label="Hull Material">
          <Select
            value={(formData.specs.hull_material as string) || ""}
            onValueChange={(v) => updateSpecs("hull_material", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              {HULL_MATERIALS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Condition">
          <Select
            value={(formData.specs.condition as string) || ""}
            onValueChange={(v) => updateSpecs("condition", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>

        <FieldWrapper label="Marina City">
          <Input
            placeholder="City"
            value={formData.specs.marina_city ?? ""}
            onChange={(e) => updateSpecs("marina_city", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Marina State">
          <Input
            placeholder="State"
            value={formData.specs.marina_state ?? ""}
            onChange={(e) => updateSpecs("marina_state", e.target.value)}
          />
        </FieldWrapper>

        <FieldWrapper label="Asking Price" error={errors.asking_price} required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              className="pl-7"
              placeholder="0"
              value={formData.asking_price}
              onChange={(e) => updateFormData("asking_price", formatPrice(e.target.value))}
            />
          </div>
        </FieldWrapper>
      </div>
    </div>
  );
}

/* ============================================================
   STEP 3 — Photo Upload
   ============================================================ */

function StepPhotos({
  previews,
  onBrowse,
  onRemove,
  error,
  minPhotos,
}: {
  previews: string[];
  onBrowse: () => void;
  onRemove: (index: number) => void;
  error?: string;
  minPhotos: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Upload Photos</h2>
        <p className="text-muted-foreground mt-1">
          Add at least {minPhotos} photo{minPhotos > 1 ? "s" : ""} of your listing
        </p>
      </div>

      <button
        onClick={onBrowse}
        className={`w-full border-2 border-dashed rounded-xl p-12 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-medium">
          Drag & drop photos here, or click to browse
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          JPG, PNG or WebP, max 10MB each
        </p>
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STEP 4 — Review & Submit
   ============================================================ */

function StepReview({
  formData,
}: {
  formData: ListingFormData;
}) {
  const assetLabel =
    formData.asset_type === "real_estate"
      ? "Real Estate"
      : "Boat / Yacht";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Review Your Listing</h2>
        <p className="text-muted-foreground mt-1">Double-check everything before submitting</p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <ReviewRow label="Asset Type" value={assetLabel} />

        <>
          {formData.description && (
            <ReviewRow label="Description" value={formData.description} />
          )}
          <ReviewRow
            label="Asking Price"
            value={formData.asking_price ? `$${formData.asking_price}` : "—"}
          />
          {formData.location_city && (
            <ReviewRow
              label="Location"
              value={[formData.location_city, formData.location_state, formData.location_zip]
                .filter(Boolean)
                .join(", ")}
            />
          )}
          {formData.specs.subtype && (
            <ReviewRow
              label={formData.asset_type === "boat" ? "Vessel Type" : "Property Type"}
              value={
                String(formData.specs.subtype)
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
              }
            />
          )}
          {formData.specs.vessel_name && (
            <ReviewRow label="Vessel Name" value={String(formData.specs.vessel_name)} />
          )}
          {formData.specs.bedrooms != null && (
            <ReviewRow label="Bedrooms" value={String(formData.specs.bedrooms)} />
          )}
          {formData.specs.bathrooms != null && (
            <ReviewRow label="Bathrooms" value={String(formData.specs.bathrooms)} />
          )}
          {formData.specs.sqft != null && (
            <ReviewRow label="Sqft" value={Number(formData.specs.sqft).toLocaleString()} />
          )}
          {formData.specs.length_ft != null && (
            <ReviewRow label="Length" value={`${formData.specs.length_ft} ft`} />
          )}
          {formData.specs.condition && (
            <ReviewRow
              label="Condition"
              value={String(formData.specs.condition).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            />
          )}
          <ReviewRow label="Photos" value={`${formData.photos.length} uploaded`} />
        </>
      </div>

      {formData.photo_previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {formData.photo_previews.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Photo ${i + 1}`}
              className="aspect-square rounded-lg object-cover border border-border"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start px-4 py-3 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}

/* ============================================================
   ARIA Analysis Animation
   ============================================================ */

function AriaAnalysis({
  currentStep,
  error,
}: {
  currentStep: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col items-center py-16 space-y-8">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground text-center">ARIA Auto-Analysis</h2>
        <p className="text-muted-foreground text-center mt-1">
          Analyzing your listing with AI-powered intelligence
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {ARIA_ANALYSIS_STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-3 transition-opacity duration-300 ${
              i > currentStep ? "opacity-30" : "opacity-100"
            }`}
          >
            {i < currentStep ? (
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
            ) : i === currentStep ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
            )}
            <span className={`text-sm ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}

/* ============================================================
   Success Confirmation
   ============================================================ */

function SuccessView({ onSubmitAnother }: { onSubmitAnother: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Your listing is now live on ARIA</h2>
        <p className="text-muted-foreground">
          You will be notified when investors view your listing
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Link href="/marketplace">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            View My Listing
          </Button>
        </Link>
        <Button variant="outline" onClick={onSubmitAnother}>
          Submit Another Listing
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Shared Field Wrapper
   ============================================================ */

function FieldWrapper({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className={error ? "text-destructive" : ""}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function formatPrice(value: string) {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("en-US");
}
