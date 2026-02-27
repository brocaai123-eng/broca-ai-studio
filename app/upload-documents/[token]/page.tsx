"use client";

import { useState, useEffect, useRef } from "react";
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
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  documentId: string;
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

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleFileUpload = (documentId: string, file: File) => {
    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.documentId !== documentId);
      return [...filtered, { documentId, file, name: file.name }];
    });
  };

  const handleGeneralFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file, i) => ({
      documentId: `additional_${Date.now()}_${i}`,
      file,
      name: file.name,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (documentId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.documentId !== documentId));
    if (fileInputRefs.current[documentId]) {
      fileInputRefs.current[documentId]!.value = "";
    }
  };

  const getUploadedFile = (documentId: string) => {
    return uploadedFiles.find((f) => f.documentId === documentId);
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) return;
    setSubmitting(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      uploadedFiles.forEach(({ documentId, file }) => {
        formData.append(`document_${documentId}`, file);
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
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 blur-xl opacity-50 mx-auto" />
          </div>
          <p className="text-white/80 text-lg">Loading document request...</p>
          <p className="text-white/50 text-sm mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Error state (no request data)
  if (error && !requestData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-red-500/30">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Invalid Link</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <div className="p-4 bg-slate-700/50 rounded-xl">
              <p className="text-sm text-slate-300">
                Please contact your broker for a new document upload link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardContent className="p-8 text-center relative">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <Sparkles className="w-6 h-6 text-yellow-400 absolute top-0 right-1/4 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Documents Submitted!</h2>
            <p className="text-slate-300 mb-6">
              Thank you, {requestData?.clientName}! Your documents have been uploaded successfully.
            </p>
            <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Your broker</p>
                  <p className="text-white font-medium">{requestData?.brokerName}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-6">
              Your documents will be reviewed and processed shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasRequestedDocs = requestData?.requestedDocuments && requestData.requestedDocuments.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrocaLogo size="sm" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-full border border-slate-700">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-300">Secure & Encrypted</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Requested by</p>
              <p className="text-sm font-medium text-white">{requestData?.brokerName}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {submitting && (
        <div className="sticky top-[65px] z-40 bg-slate-900/60 backdrop-blur-lg border-b border-slate-700/50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Uploading & Processing Documents...</span>
              <span className="text-white font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-500" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Welcome Message */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Document Upload</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Hi, {requestData?.clientName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Please upload the requested documents below.
          </p>
        </div>

        {/* Broker Message */}
        {requestData?.message && (
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl overflow-hidden mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Message from {requestData.brokerName}:</p>
                  <p className="text-white">{requestData.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Upload Section */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-b border-slate-700 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Upload Documents</CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Upload required documents • Supports PDF, JPG, PNG
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Per-document slots if broker specified document types */}
            {hasRequestedDocs && requestData.requestedDocuments.map((docName, index) => {
              const docId = `requested_${index}`;
              const uploaded = getUploadedFile(docId);
              return (
                <div
                  key={docId}
                  className={`group p-5 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    uploaded 
                      ? "border-green-500/50 bg-green-500/10" 
                      : "border-slate-600 bg-slate-800/50 hover:border-primary/50 hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      uploaded 
                        ? 'bg-green-500/20' 
                        : 'bg-slate-700 group-hover:bg-primary/20'
                    }`}>
                      {uploaded ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{docName}</p>
                      <p className="text-sm text-slate-400 mt-1">Upload this document</p>
                      
                      {uploaded ? (
                        <div className="flex items-center gap-3 mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                          <FileText className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 truncate flex-1">{uploaded.name}</span>
                          <button
                            onClick={() => removeFile(docId)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <input
                            ref={(el) => { fileInputRefs.current[docId] = el; }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(docId, file);
                            }}
                            className="hidden"
                            id={`file-${docId}`}
                          />
                          <label
                            htmlFor={`file-${docId}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:shadow-lg"
                          >
                            <Upload className="w-4 h-4" />
                            Choose File
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* General Upload Area */}
            <div className="group p-5 rounded-2xl border-2 border-dashed border-slate-600 bg-slate-800/50 hover:border-primary/50 hover:bg-slate-700/50 transition-all duration-300">
              <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all">
                  <Camera className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-medium mb-1">
                  {hasRequestedDocs ? "Upload Additional Files" : "Click to select files or take a photo"}
                </p>
                <p className="text-sm text-slate-400">PDF, JPG, PNG • Max 10MB per file</p>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,image/*"
                  onChange={handleGeneralFileSelect}
                />
              </label>
            </div>

            {/* Additional uploaded files list */}
            {uploadedFiles.filter(f => f.documentId.startsWith('additional_')).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Additional Files:</p>
                {uploadedFiles.filter(f => f.documentId.startsWith('additional_')).map((uf) => (
                  <div key={uf.documentId} className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                    <FileText className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300 truncate flex-1">{uf.name}</span>
                    <button
                      onClick={() => removeFile(uf.documentId)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* AI Processing Note */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">AI-Powered Processing</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Your documents will be automatically scanned and processed using AI to extract relevant information.
                  </p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && requestData && (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleSubmit}
            disabled={uploadedFiles.length === 0 || submitting}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:shadow-none min-w-[200px]"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Documents ({uploadedFiles.length})
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-700/50 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">Your documents are encrypted and secure</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Powered by</span>
            <BrocaLogo size="sm" />
          </div>
        </div>
      </footer>
    </div>
  );
}
