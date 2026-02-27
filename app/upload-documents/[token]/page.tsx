"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  Loader2,
  Send,
  AlertCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BrocaLogo from "@/components/ui/BrocaLogo";

interface DocumentRequestData {
  source: string;
  requestId?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  brokerName: string;
  brokerId: string;
  message?: string | null;
  requestedDocuments: string[];
  createdAt?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
}

export default function UploadDocumentsPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestData, setRequestData] = useState<DocumentRequestData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch document request info
  useEffect(() => {
    async function fetchRequest() {
      try {
        const res = await fetch(`/api/upload-documents/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid or expired link");
          return;
        }

        setRequestData(data);
      } catch {
        setError("Failed to load document request");
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchRequest();
  }, [token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) return;
    setSubmitting(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      uploadedFiles.forEach((uf, index) => {
        formData.append(`document_${index}`, uf.file);
      });

      setUploadProgress(30);

      const res = await fetch(`/api/upload-documents/${token}`, {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress(100);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-muted-foreground">Loading document request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !requestData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Link Not Valid</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Documents Submitted!</h2>
            <p className="text-muted-foreground mb-1">
              Thank you, {requestData?.clientName}!
            </p>
            <p className="text-muted-foreground text-sm">
              Your documents have been securely uploaded. {requestData?.brokerName} will review them shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <BrocaLogo size="lg" />
          <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-muted-foreground">
            <strong>{requestData?.brokerName}</strong> has requested documents from you
          </p>
        </div>

        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Document Request
            </CardTitle>
            <CardDescription>
              Hi {requestData?.clientName} — please upload the requested documents below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Broker message */}
            {requestData?.message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-1">Message from {requestData.brokerName}:</p>
                <p className="text-sm text-blue-700">{requestData.message}</p>
              </div>
            )}

            {/* Requested document types */}
            {requestData?.requestedDocuments && requestData.requestedDocuments.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">📋 Requested Documents:</p>
                <ul className="space-y-1">
                  {requestData.requestedDocuments.map((doc, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Accepted formats: PDF, JPG, PNG, DOC, DOCX. Max 10MB per file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors">
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-blue-600 font-medium">
                  Click to select files or take a photo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG, DOC, DOCX
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,image/*"
                onChange={handleFileSelect}
              />
            </label>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} selected
                </p>
                {uploadedFiles.map((uf) => (
                  <div
                    key={uf.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{uf.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uf.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => removeFile(uf.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress */}
            {submitting && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading documents...
                </p>
              </div>
            )}

            {/* Error message */}
            {error && requestData && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={uploadedFiles.length === 0 || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Documents ({uploadedFiles.length})
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          Your documents are securely uploaded and encrypted. Only your broker can access them.
        </p>
      </div>
    </div>
  );
}
