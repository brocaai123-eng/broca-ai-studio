"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  CreditCard,
  Banknote,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PayoutAffiliate {
  id: string;
  full_name: string;
  email: string;
  payout_method: string | null;
  payout_email: string | null;
  stripe_connect_id: string | null;
}

interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  payout_method: string;
  payout_reference: string | null;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  affiliate: PayoutAffiliate;
}

interface PayoutStats {
  pending_count: number;
  pending_amount: number;
  processing_count: number;
  processing_amount: number;
  completed_count: number;
  completed_amount: number;
  total_count: number;
}

export default function AdminPayoutsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // Fetch payouts
  const { data, isLoading } = useQuery({
    queryKey: ["admin-payouts", user?.id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: user!.id });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/payouts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json() as Promise<{ payouts: Payout[]; stats: PayoutStats }>;
    },
    enabled: !!user,
  });

  // Process payout mutation
  const processPayout = useMutation({
    mutationFn: async ({
      payoutId,
      action,
      notes,
    }: {
      payoutId: string;
      action: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user!.id,
          payoutId,
          action,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Payout updated");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      setSelectedPayout(null);
      setActionDialog(null);
      setActionNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const payouts = data?.payouts || [];
  const stats = data?.stats;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; classes: string; icon: typeof Clock }> = {
      pending: { label: "Pending", classes: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
      processing: { label: "Processing", classes: "bg-blue-100 text-blue-700 border-blue-200", icon: ArrowUpRight },
      completed: { label: "Completed", classes: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
      failed: { label: "Failed", classes: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    };
    const cfg = config[status] || { label: status, classes: "bg-gray-100 text-gray-700", icon: Clock };
    return (
      <Badge variant="outline" className={cfg.classes}>
        <cfg.icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      stripe: "Stripe Connect",
      ach: "Bank Transfer (ACH)",
      paypal: "PayPal",
      bank_transfer: "Bank Transfer",
    };
    return labels[method] || method;
  };

  const handleAction = (payout: Payout, action: string) => {
    setSelectedPayout(payout);
    setActionDialog(action);
    setActionNotes("");
  };

  const confirmAction = () => {
    if (!selectedPayout || !actionDialog) return;
    processPayout.mutate({
      payoutId: selectedPayout.id,
      action: actionDialog,
      notes: actionNotes || undefined,
    });
  };

  const actionDialogContent: Record<string, { title: string; description: string; confirmLabel: string; confirmClass: string }> = {
    approve: {
      title: "Approve Payout",
      description: "Move this payout to processing. You can then send it via Stripe or mark it as manually paid.",
      confirmLabel: "Approve",
      confirmClass: "bg-blue-600 hover:bg-blue-700",
    },
    process_stripe: {
      title: "Send via Stripe",
      description: "This will instantly transfer funds from your Stripe balance to the affiliate's connected Stripe account.",
      confirmLabel: "Send Payment",
      confirmClass: "bg-green-600 hover:bg-green-700",
    },
    mark_paid: {
      title: "Mark as Paid",
      description: "Mark this payout as manually completed (you've already sent the money via PayPal, bank transfer, etc.).",
      confirmLabel: "Mark Paid",
      confirmClass: "bg-green-600 hover:bg-green-700",
    },
    reject: {
      title: "Reject Payout",
      description: "Reject this payout request. The affiliate's balance will be restored.",
      confirmLabel: "Reject",
      confirmClass: "bg-red-600 hover:bg-red-700",
    },
  };

  const summaryCards = [
    {
      label: "Pending",
      count: stats?.pending_count || 0,
      amount: stats?.pending_amount || 0,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Processing",
      count: stats?.processing_count || 0,
      amount: stats?.processing_amount || 0,
      icon: ArrowUpRight,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Completed",
      count: stats?.completed_count || 0,
      amount: stats?.completed_amount || 0,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Paid",
      count: stats?.total_count || 0,
      amount: stats?.completed_amount || 0,
      icon: DollarSign,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <AdminLayout title="Affiliate Payouts" subtitle="Manage and process affiliate commission payouts">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="bg-app-card border-app">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-app-foreground">
                        ${card.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-app-muted">
                        {card.count} {card.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payouts Table */}
          <Card className="bg-app-card border-app">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-app-foreground">All Payouts</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-app-muted border-app">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12 text-app-muted">
                  <Banknote className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium mb-1">No payouts found</p>
                  <p className="text-sm">Payouts will appear here when affiliates request them.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-app">
                        <TableHead className="text-app-muted">Affiliate</TableHead>
                        <TableHead className="text-app-muted">Amount</TableHead>
                        <TableHead className="text-app-muted">Method</TableHead>
                        <TableHead className="text-app-muted">Status</TableHead>
                        <TableHead className="text-app-muted">Requested</TableHead>
                        <TableHead className="text-app-muted">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id} className="border-app">
                          <TableCell>
                            <div>
                              <p className="text-app-foreground font-medium">
                                {payout.affiliate?.full_name || "Unknown"}
                              </p>
                              <p className="text-xs text-app-muted">
                                {payout.affiliate?.email || ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-app-foreground font-semibold">
                            ${Number(payout.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-app-muted text-sm">
                            {getMethodLabel(payout.payout_method)}
                          </TableCell>
                          <TableCell>{getStatusBadge(payout.status)}</TableCell>
                          <TableCell className="text-app-muted text-sm">
                            {formatDate(payout.created_at)}
                            {payout.paid_at && (
                              <p className="text-xs text-green-500">
                                Paid {formatDate(payout.paid_at)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {payout.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => handleAction(payout, "approve")}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleAction(payout, "reject")}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {payout.status === "processing" && (
                                <>
                                  {payout.affiliate?.stripe_connect_id && (
                                    <Button
                                      size="sm"
                                      className="bg-purple-600 hover:bg-purple-700 text-white"
                                      onClick={() => handleAction(payout, "process_stripe")}
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      Stripe
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleAction(payout, "mark_paid")}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Mark Paid
                                  </Button>
                                </>
                              )}
                              {payout.status === "completed" && (
                                <span className="text-xs text-green-500">
                                  {payout.payout_reference
                                    ? `Ref: ${payout.payout_reference.substring(0, 20)}...`
                                    : "Completed"}
                                </span>
                              )}
                              {payout.status === "failed" && (
                                <span className="text-xs text-red-500">
                                  {payout.notes || "Failed"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Confirmation Dialog */}
          <Dialog
            open={!!actionDialog}
            onOpenChange={(open) => {
              if (!open) {
                setActionDialog(null);
                setSelectedPayout(null);
                setActionNotes("");
              }
            }}
          >
            <DialogContent className="bg-app-card border-app">
              {actionDialog && actionDialogContent[actionDialog] && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-app-foreground">
                      {actionDialogContent[actionDialog].title}
                    </DialogTitle>
                    <DialogDescription>
                      {actionDialogContent[actionDialog].description}
                    </DialogDescription>
                  </DialogHeader>

                  {selectedPayout && (
                    <div className="bg-app-muted rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-app-muted text-sm">Affiliate:</span>
                        <span className="text-app-foreground font-medium">
                          {selectedPayout.affiliate?.full_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-muted text-sm">Amount:</span>
                        <span className="text-app-foreground font-bold">
                          ${Number(selectedPayout.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-muted text-sm">Method:</span>
                        <span className="text-app-foreground">
                          {getMethodLabel(selectedPayout.payout_method)}
                        </span>
                      </div>
                      {selectedPayout.affiliate?.payout_email && (
                        <div className="flex justify-between">
                          <span className="text-app-muted text-sm">Payout Email:</span>
                          <span className="text-app-foreground">
                            {selectedPayout.affiliate.payout_email}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm text-app-muted">
                      Notes {actionDialog === "mark_paid" ? "(e.g., PayPal transaction ID)" : "(optional)"}
                    </label>
                    <Textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder={
                        actionDialog === "mark_paid"
                          ? "PayPal transaction ID or reference..."
                          : actionDialog === "reject"
                          ? "Reason for rejection..."
                          : "Add a note..."
                      }
                      rows={2}
                      className="bg-app-muted border-app resize-none"
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionDialog(null);
                        setSelectedPayout(null);
                      }}
                      className="border-app"
                    >
                      Cancel
                    </Button>
                    <Button
                      className={`text-white ${actionDialogContent[actionDialog].confirmClass}`}
                      onClick={confirmAction}
                      disabled={processPayout.isPending}
                    >
                      {processPayout.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {actionDialogContent[actionDialog].confirmLabel}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </AdminLayout>
  );
}
