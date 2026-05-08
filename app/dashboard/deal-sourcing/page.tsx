"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Home,
  Search,
  TrendingUp,
  Eye,
  MapPin,
  Loader2,
  Shield,
  Zap,
  Calendar,
  Satellite,
  TreePine,
  Waves,
  Wrench,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useDealSignals, useScanProperty } from "@/lib/hooks/use-deal-sourcing";
import type { DealSignal, SignalType } from "@/lib/types/marketplace";

type PropertyRow = {
  id: string;
  formatted_address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  property_type: string | null;
  owner_occupied: boolean | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  estimated_value: number | null;
  motivated_seller_score: number | null;
  motivated_seller_label: "LOW" | "MODERATE" | "HIGH" | string | null;
  motivated_seller_breakdown:
    | Array<{ key?: string; label: string; pts: number; active: boolean; detail?: string }>
    | null;
};

function formatMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

function BlueprintDealSourcingPage() {
  // Section A (Finder)
  const [zip, setZip] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderError, setFinderError] = useState<string | null>(null);
  const [finderRows, setFinderRows] = useState<PropertyRow[]>([]);
  const [autoSeedDoneForZip, setAutoSeedDoneForZip] = useState<Record<string, boolean>>({});

  // Section B (Property intel)
  const [address, setAddress] = useState("");
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intel, setIntel] = useState<PropertyRow | null>(null);

  // Pipeline modal
  const [pipelineProperty, setPipelineProperty] = useState<string | null>(null);
  const [pipelineForm, setPipelineForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [pipelineSaving, setPipelineSaving] = useState(false);
  const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);

  function openPipeline(address: string) {
    setPipelineProperty(address);
    setPipelineForm({ name: "", email: "", phone: "", notes: `Interested in: ${address}` });
    setPipelineMsg(null);
  }

  async function savePipeline() {
    if (!pipelineForm.name.trim() || !pipelineForm.email.trim()) return;
    setPipelineSaving(true);
    setPipelineMsg(null);
    try {
      const res = await fetch("/api/clients/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: pipelineForm.name.trim(),
          clientEmail: pipelineForm.email.trim(),
          clientPhone: pipelineForm.phone.trim() || undefined,
          clientNotes: pipelineForm.notes.trim() || undefined,
          formType: "real-estate",
          sendEmail: false,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add lead");
      }
      setPipelineMsg("Lead added to pipeline!");
    } catch (e) {
      setPipelineMsg(e instanceof Error ? e.message : "Failed to add lead");
    } finally {
      setPipelineSaving(false);
    }
  }

  // Section C (Alerts)
  const [alertZips, setAlertZips] = useState("");
  const [alertMinMotivated, setAlertMinMotivated] = useState("");
  const [alertMaxPrice, setAlertMaxPrice] = useState("");
  const [alertChannels, setAlertChannels] = useState({ email: true, dashboard: true });
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const finderStats = useMemo(() => {
    const scores = finderRows.map((r) => r.motivated_seller_score ?? 0);
    const hot = scores.filter((s) => s >= 55).length;
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { total: finderRows.length, hot, avg };
  }, [finderRows]);

  async function loadFinder() {
    const z = zip.trim();
    if (!/^\d{5}$/.test(z)) {
      setFinderError("Enter a valid 5-digit ZIP to load the finder.");
      setFinderRows([]);
      return;
    }
    setFinderLoading(true);
    setFinderError(null);
    try {
      const params = new URLSearchParams();
      params.set("zip", z);
      params.set("limit", "500");
      params.set("minScore", String(Number(minScore) || 0));
      if (type.trim()) params.set("type", type.trim());
      if (maxPrice.trim()) params.set("maxPrice", String(Number(maxPrice)));
      const res = await fetch(`/api/deal-sourcing/finder?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load motivated sellers");
      setFinderRows(data.properties ?? []);
    } catch (e) {
      setFinderError(e instanceof Error ? e.message : "Failed to load");
      setFinderRows([]);
    } finally {
      setFinderLoading(false);
    }
  }

  const [showBootstrapConfirm, setShowBootstrapConfirm] = useState(false);

  async function bootstrapZip() {
    const z = zip.trim();
    if (!/^\d{5}$/.test(z)) return;
    setShowBootstrapConfirm(false);
    setFinderLoading(true);
    setFinderError(null);
    try {
      setMinScore("0");
      const res = await fetch("/api/deal-sourcing/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: z, limit: 50 }),
      });
      let data: any = {};
      const text = await res.text();
      try { data = JSON.parse(text); } catch { /* non-JSON error */ }
      if (!res.ok) throw new Error(data.error || text.slice(0, 120) || "Failed to populate zip");
      await loadFinder();
    } catch (e) {
      setFinderError(e instanceof Error ? e.message : "Failed to populate");
    } finally {
      setFinderLoading(false);
    }
  }

  // Load cached properties from DB only -- never auto-bootstrap (which calls RentCast).
  useEffect(() => {
    const z = zip.trim();
    if (!/^\d{5}$/.test(z)) return;
    if (finderLoading) return;
    if (finderRows.length > 0) return;
    if (autoSeedDoneForZip[z]) return;

    setAutoSeedDoneForZip((s) => ({ ...s, [z]: true }));

    async function autoLoad() {
      setFinderLoading(true);
      setFinderError(null);
      try {
        const params = new URLSearchParams({ zip: z, limit: "200", minScore: "0" });
        const res = await fetch(`/api/deal-sourcing/finder?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load motivated sellers");
        setFinderRows(data.properties ?? []);
      } catch (e) {
        setFinderError(e instanceof Error ? e.message : "Failed to load");
        setFinderRows([]);
      } finally {
        setFinderLoading(false);
      }
    }

    void autoLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip]);

  async function loadIntel(nextAddress?: string) {
    const addr = (nextAddress ?? address).trim();
    if (!addr) return;
    setIntelLoading(true);
    setIntelError(null);
    setIntel(null);
    try {
      const res = await fetch(`/api/deal-sourcing/property?address=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load property");
      setIntel(data.property ?? null);
    } catch (e) {
      setIntelError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIntelLoading(false);
    }
  }

  async function saveAlert() {
    setAlertSaving(true);
    setAlertMsg(null);
    try {
      const zipList = alertZips
        .split(/[,]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{5}$/.test(s));
      if (zipList.length === 0) {
        throw new Error("Enter at least one valid 5-digit ZIP (comma-separated).");
      }
      const channels = Object.entries(alertChannels)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const minM = alertMinMotivated.trim();
      const maxP = alertMaxPrice.trim();
      const res = await fetch("/api/deal-sourcing/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip_codes: zipList,
          min_motivated_score: minM && Number.isFinite(Number(minM)) ? Number(minM) : null,
          max_asking_price: maxP && Number.isFinite(Number(maxP)) ? Number(maxP) : null,
          channels,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save alert");
      setAlertMsg("Alert saved. Nightly pipeline will populate matches into your dashboard feed.");
    } catch (e) {
      setAlertMsg(e instanceof Error ? e.message : "Failed to save alert");
    } finally {
      setAlertSaving(false);
    }
  }

  return (
    <DashboardLayout
      title="Deal Sourcing"
      subtitle="Motivated seller finder, property intelligence, and deal alerts"
    >
      {/* Section A */}
      <Card className="bg-app-card border-app">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-app-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Section A: Motivated Seller Finder
            <Badge variant="secondary" className="ml-auto">
              {zip.trim() ? `ZIP ${zip.trim()}` : "ZIP —"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP (e.g. 33401)" className="lg:w-40 bg-app-muted border-app" />
            <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="Min score (e.g. 50)" className="lg:w-40 bg-app-muted border-app" />
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (all / Single Family / Condo)" className="lg:w-72 bg-app-muted border-app" />
            <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price (optional)" className="lg:w-56 bg-app-muted border-app" />
            <Button
              onClick={loadFinder}
              disabled={finderLoading || !/^\d{5}$/.test(zip.trim())}
              className="gap-2"
            >
              {finderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBootstrapConfirm(true)}
              disabled={finderLoading || !/^\d{5}$/.test(zip.trim())}
              className="gap-2 lg:ml-auto"
            >
              <Zap className="w-4 h-4" />
              Load New Properties
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-app bg-app-muted/20 p-4">
              <p className="text-xs text-app-muted">Properties found</p>
              <p className="text-2xl font-bold text-app-foreground">{finderStats.total}</p>
            </div>
            <div className="rounded-xl border border-app bg-app-muted/20 p-4">
              <p className="text-xs text-app-muted">High motivation</p>
              <p className="text-2xl font-bold text-app-foreground">{finderStats.hot}</p>
            </div>
            <div className="rounded-xl border border-app bg-app-muted/20 p-4">
              <p className="text-xs text-app-muted">Avg score</p>
              <p className="text-2xl font-bold text-app-foreground">{finderStats.avg}/100</p>
            </div>
          </div>

          {finderError && <p className="text-sm text-red-400">{finderError}</p>}
          {!finderLoading && !finderError && finderRows.length === 0 && Number(minScore) > 0 && (
            <div className="rounded-xl border border-app bg-app-muted/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <p className="text-sm text-app-muted">
                No matches at min score <span className="font-semibold text-app-foreground">{minScore}</span>. Try lowering it to see all imported properties.
              </p>
              <Button
                variant="secondary"
                onClick={async () => {
                  setMinScore("0");
                  await loadFinder();
                }}
                className="sm:ml-auto"
              >
                Show all (min score 0)
              </Button>
            </div>
          )}
          {finderLoading && finderRows.length === 0 && (
            <div className="rounded-xl border border-app bg-app-muted/20 p-4 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-sm text-app-muted">Loading properties for this ZIP…</p>
            </div>
          )}
          {!finderLoading &&
            !finderError &&
            finderRows.length === 0 &&
            Number(minScore) === 0 &&
            autoSeedDoneForZip[zip.trim()] && (
              <p className="text-sm text-app-muted">
                No properties in cache for this ZIP yet. Try another ZIP or tap Refresh—if your connection is slow, wait a moment and try again.
              </p>
            )}

          <div className="rounded-xl border border-app bg-[#0f172a] text-slate-200 p-4 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
              <span className="font-medium text-slate-200">ZIP {zip}</span>
              <span className="text-slate-600">·</span>
              <span>Min score {minScore || "0"}</span>
              <span className="text-slate-600">·</span>
              <span>Type {type.trim() || "any"}</span>
              <span className="text-slate-600">·</span>
              <span>Price {maxPrice ? formatMoney(Number(maxPrice)) : "Any"}</span>
              <span className="text-slate-600">·</span>
              <span>{finderRows.length} shown</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {finderRows.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.formatted_address}</p>
                      <p className="text-slate-400 text-xs">
                        {(p.bedrooms ?? "—")} bd / {(p.bathrooms ?? "—")} ba / {p.square_footage ? `${p.square_footage.toLocaleString()} sqft` : "—"}
                      </p>
                      <p className="text-slate-400 text-xs">Est. Value: {formatMoney(p.estimated_value)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Motivated Seller Score</p>
                      <p className="font-bold">
                        {p.motivated_seller_score ?? 0} / 100{" "}
                        <span
                          className={
                            p.motivated_seller_label === "HIGH"
                              ? "text-red-300"
                              : p.motivated_seller_label === "MODERATE"
                                ? "text-yellow-300"
                                : "text-emerald-300"
                          }
                        >
                          {p.motivated_seller_label ?? "LOW"} MOTIVATION
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {(p.motivated_seller_breakdown ?? []).filter((b) => b.active).map((b) => (
                      <div key={b.label} className="flex justify-between text-xs text-slate-200">
                        <span className="text-slate-300">{b.label}{b.detail ? ` (${b.detail})` : ""}</span>
                        <span className="text-slate-200">+{b.pts} pts</span>
                      </div>
                    ))}
                    <div className="pt-1 text-xs text-slate-400">
                      Total: {p.motivated_seller_score ?? 0} pts (capped at 100)
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setAddress(p.formatted_address);
                        void loadIntel(p.formatted_address);
                      }}
                    >
                      View Full Property Intel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openPipeline(p.formatted_address)}>
                      Add to Pipeline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B */}
      <Card className="bg-app-card border-app">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-app-foreground flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            Section B: Property Intelligence Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 456 Okeechobee Blvd, West Palm Beach, FL 33401"
              className="flex-1 bg-app-muted border-app"
            />
            <Button onClick={() => void loadIntel()} disabled={intelLoading || !address.trim()} className="gap-2">
              {intelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>
          {intelError && <p className="text-sm text-red-400">{intelError}</p>}

          {intel && (
            <div className="rounded-xl border border-app bg-[#0f172a] text-slate-200 p-4 space-y-4">
              <p className="font-semibold text-slate-100">{intel.formatted_address}</p>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500 text-xs">Owner occupied</dt>
                  <dd className="text-slate-100">
                    {intel.owner_occupied === false ? "No (absentee)" : intel.owner_occupied === true ? "Yes" : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Last sale</dt>
                  <dd className="text-slate-100">
                    {intel.last_sale_date ? new Date(intel.last_sale_date).toLocaleDateString() : "Unknown"}{" "}
                    <span className="text-slate-400">({formatMoney(intel.last_sale_price)})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Estimated value (AVM)</dt>
                  <dd className="text-slate-100">{formatMoney(intel.estimated_value)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Motivated seller</dt>
                  <dd>
                    <span className="font-semibold text-slate-100">{intel.motivated_seller_score ?? 0} / 100</span>
                    <span
                      className={` ml-2 ${
                        intel.motivated_seller_label === "HIGH"
                          ? "text-red-300"
                          : intel.motivated_seller_label === "MODERATE"
                            ? "text-yellow-300"
                            : "text-emerald-300"
                      }`}
                    >
                      {intel.motivated_seller_label ?? "LOW"}
                    </span>
                  </dd>
                </div>
              </dl>

              {(intel.motivated_seller_breakdown ?? []).filter((b) => b.active).length > 0 && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-1">
                  <p className="text-xs text-slate-500 mb-2">Active score factors</p>
                  {(intel.motivated_seller_breakdown ?? [])
                    .filter((b) => b.active)
                    .map((b) => (
                      <div key={b.label} className="flex justify-between text-xs text-slate-200">
                        <span className="text-slate-300">
                          {b.label}
                          {b.detail ? ` (${b.detail})` : ""}
                        </span>
                        <span>+{b.pts}</span>
                      </div>
                    ))}
                </div>
              )}

            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C */}
      <Card className="bg-app-card border-app">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-app-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Section C: Deal Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={alertZips} onChange={(e) => setAlertZips(e.target.value)} placeholder="Zip codes (comma-separated)" className="bg-app-muted border-app" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={alertMinMotivated} onChange={(e) => setAlertMinMotivated(e.target.value)} placeholder="Min motivated seller score" className="bg-app-muted border-app" />
            <Input value={alertMaxPrice} onChange={(e) => setAlertMaxPrice(e.target.value)} placeholder="Max asking price" className="bg-app-muted border-app" />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-app-foreground">
              <input type="checkbox" checked={alertChannels.email} onChange={(e) => setAlertChannels((s) => ({ ...s, email: e.target.checked }))} />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm text-app-foreground">
              <input type="checkbox" checked={alertChannels.dashboard} onChange={(e) => setAlertChannels((s) => ({ ...s, dashboard: e.target.checked }))} />
              Dashboard
            </label>

            <Button onClick={saveAlert} disabled={alertSaving} className="ml-auto gap-2">
              {alertSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Save Alert
            </Button>
          </div>

          {alertMsg && <p className="text-sm text-app-muted">{alertMsg}</p>}
        </CardContent>
      </Card>

      {/* Bootstrap confirmation dialog */}
      <Dialog open={showBootstrapConfirm} onOpenChange={setShowBootstrapConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Load Properties from API</DialogTitle>
            <DialogDescription>
              This will fetch up to 50 properties for ZIP {zip.trim()} and save them to the database. Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={bootstrapZip} disabled={finderLoading}>
              {finderLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Yes, Load Properties
            </Button>
            <Button variant="outline" onClick={() => setShowBootstrapConfirm(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Pipeline modal */}
      <Dialog open={!!pipelineProperty} onOpenChange={(open) => { if (!open) setPipelineProperty(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Pipeline</DialogTitle>
            <DialogDescription className="text-xs text-app-muted truncate">{pipelineProperty}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs mb-1 block">Client name *</Label>
              <Input
                placeholder="Full name"
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Email *</Label>
              <Input
                type="email"
                placeholder="client@email.com"
                value={pipelineForm.email}
                onChange={(e) => setPipelineForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Phone (optional)</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={pipelineForm.phone}
                onChange={(e) => setPipelineForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Input
                value={pipelineForm.notes}
                onChange={(e) => setPipelineForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {pipelineMsg && (
              <p className={`text-xs ${pipelineMsg.startsWith("Lead") ? "text-green-500" : "text-red-400"}`}>{pipelineMsg}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                disabled={pipelineSaving || !pipelineForm.name.trim() || !pipelineForm.email.trim()}
                onClick={savePipeline}
              >
                {pipelineSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {pipelineMsg?.startsWith("Lead") ? "Added!" : "Add Lead"}
              </Button>
              <Button variant="outline" onClick={() => setPipelineProperty(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ─── Signal styling map ───────────────────────────────────────────────
const SIGNAL_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  foreclosure:       { label: "Foreclosure",       color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30" },
  tax_delinquent:    { label: "Tax Delinquent",    color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30" },
  probate:           { label: "Probate",           color: "text-red-300",    bg: "bg-red-500/10 border-red-500/20" },
  divorce:           { label: "Divorce",           color: "text-red-300",    bg: "bg-red-500/10 border-red-500/20" },
  distressed_roof:   { label: "Distressed Roof",   color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/30" },
  overgrown:         { label: "Overgrown",         color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/30" },
  vacant:            { label: "Vacant",            color: "text-amber-300",  bg: "bg-amber-500/10 border-amber-500/20" },
  pool_neglect:      { label: "Pool Neglect",      color: "text-amber-300",  bg: "bg-amber-500/10 border-amber-500/20" },
  code_violation:    { label: "Code Violation",    color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  price_below_value: { label: "Below Value",       color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30" },
  extended_dom:      { label: "Extended DOM",      color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30" },
  absentee_owner:    { label: "Absentee Owner",    color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-500/20" },
  long_hold:         { label: "Long Hold",         color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-500/20" },
};

function signalStyle(type: string) {
  return SIGNAL_STYLES[type] ?? { label: type, color: "text-zinc-400", bg: "bg-zinc-500/15 border-zinc-500/30" };
}

// ─── Motivated Seller Score breakdown ────────────────────────────────
const SCORE_FACTORS: { key: string; label: string; pts: number; signalMatch?: SignalType[] }[] = [
  { key: "foreclosure",  label: "Foreclosure filing",   pts: 35, signalMatch: ["foreclosure"] },
  { key: "tax",          label: "Tax delinquent",        pts: 30, signalMatch: ["tax_delinquent"] },
  { key: "probate",      label: "Probate / estate",      pts: 25, signalMatch: ["probate"] },
  { key: "divorce",      label: "Divorce filing",        pts: 20, signalMatch: ["divorce"] },
  { key: "absentee",     label: "Absentee owner",        pts: 20, signalMatch: ["absentee_owner"] },
  { key: "satellite",    label: "Satellite condition",   pts: 20, signalMatch: ["distressed_roof", "overgrown", "pool_neglect", "vacant"] },
  { key: "code_viol",    label: "Code violation",        pts: 18, signalMatch: ["code_violation"] },
  { key: "below_value",  label: "Below market value",    pts: 15, signalMatch: ["price_below_value"] },
  { key: "extended_dom", label: "Extended DOM",          pts: 15, signalMatch: ["extended_dom"] },
  { key: "long_hold",    label: "Long hold (>10 yr)",    pts: 10, signalMatch: ["long_hold"] },
];

const MAX_SELLER_SCORE = SCORE_FACTORS.reduce((sum, f) => sum + f.pts, 0);

function propertyKey(signal: Pick<DealSignal, "property_address" | "zip">): string {
  const a = (signal.property_address ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const z = (signal.zip ?? "").trim();
  return `${a}|${z}`;
}

/** Aggregate motivated-seller factors across every signal type seen for a property (not just one row). */
function computeAggregateScore(signalTypes: Iterable<string>): {
  total: number;
  breakdown: { label: string; pts: number; active: boolean }[];
} {
  const types = new Set(signalTypes);
  const breakdown = SCORE_FACTORS.map((f) => ({
    label: f.label,
    pts: f.pts,
    active: f.signalMatch ? f.signalMatch.some((t) => types.has(t)) : false,
  }));
  const total = breakdown.reduce((sum, b) => sum + (b.active ? b.pts : 0), 0);
  return { total, breakdown };
}

// ─── Condition flags ─────────────────────────────────────────────────
const CONDITION_FLAGS = [
  { key: "distressed_roof", label: "Roof Damage",      icon: Home,        match: ["distressed_roof"] },
  { key: "overgrown",       label: "Overgrown Grass",  icon: TreePine,    match: ["overgrown"] },
  { key: "pool_neglect",    label: "Pool Neglect",     icon: Waves,       match: ["pool_neglect"] },
  { key: "vacant",          label: "Vacant Lot",       icon: Eye,         match: ["vacant"] },
  { key: "poor_maint",      label: "Poor Maintenance", icon: Wrench,      match: ["code_violation", "distressed_roof", "overgrown", "pool_neglect"] },
] as const;

// ─── Signal type options for filter ──────────────────────────────────
const SIGNAL_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all",              label: "All Signals" },
  { value: "distressed_roof",  label: "Distressed Roof" },
  { value: "overgrown",        label: "Overgrown" },
  { value: "vacant",           label: "Vacant" },
  { value: "tax_delinquent",   label: "Tax Delinquent" },
  { value: "foreclosure",      label: "Foreclosure" },
  { value: "probate",          label: "Probate" },
  { value: "divorce",          label: "Divorce" },
  { value: "code_violation",   label: "Code Violation" },
  { value: "price_below_value",label: "Below Value" },
  { value: "extended_dom",     label: "Extended DOM" },
  { value: "absentee_owner",   label: "Absentee Owner" },
  { value: "long_hold",        label: "Long Hold" },
  { value: "pool_neglect",     label: "Pool Neglect" },
];

// ─── Main page ───────────────────────────────────────────────────────
function LegacyDealSourcingPage() {
  const [zipFilter, setZipFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scanZip, setScanZip] = useState("");
  const [scanAddress, setScanAddress] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<DealSignal | null>(null);

  const filters = useMemo(() => ({
    zip: zipFilter || undefined,
    signal_type: typeFilter === "all" ? undefined : typeFilter,
  }), [zipFilter, typeFilter]);

  const { data, isLoading, isError } = useDealSignals(filters);
  const scanMutation = useScanProperty();

  const signals = data?.signals ?? [];

  const hotLeads = signals.filter((s) => (s.confidence ?? 0) > 80).length;

  const scoresByProperty = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const s of signals) {
      const key = propertyKey(s);
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key)!.add(s.signal_type);
    }
    return groups;
  }, [signals]);

  const avgScore = scoresByProperty.size
    ? Math.round(
        [...scoresByProperty.values()].reduce(
          (sum, types) => sum + computeAggregateScore(types).total,
          0,
        ) / scoresByProperty.size,
      )
    : 0;

  const handleScan = () => {
    if (!scanAddress.trim() || !scanZip.trim()) return;
    scanMutation.mutate({ address: scanAddress.trim(), zip: scanZip.trim() });
  };

  const selectedPropertySignals = useMemo(() => {
    if (!selectedSignal) return [];
    const key = propertyKey(selectedSignal);
    return signals.filter((s) => propertyKey(s) === key);
  }, [signals, selectedSignal]);

  const selectedBreakdown = useMemo(() => {
    if (!selectedSignal) return null;
    return computeAggregateScore(selectedPropertySignals.map((s) => s.signal_type));
  }, [selectedSignal, selectedPropertySignals]);

  const activeConditionTypes = useMemo(
    () =>
      selectedSignal
        ? new Set(selectedPropertySignals.map((s) => s.signal_type))
        : new Set(signals.map((s) => s.signal_type)),
    [signals, selectedSignal, selectedPropertySignals],
  );

  return (
    <DashboardLayout
      title="Deal Sourcing"
      subtitle="AI-powered distressed property detection and motivated seller scoring"
    >
      <p className="text-sm text-app-muted max-w-3xl mb-4 leading-relaxed">
        Flow: run <strong className="text-app-foreground">Scan Property</strong> → rows insert into Supabase{" "}
        <code className="text-xs bg-app-muted px-1 rounded">deal_sourcing_signals</code> → Flagged Signals refetches.
        Signals shown today combine heuristic/demo tagging plus geo thumbnails when configured.
      </p>

      {/* ─── Stats Bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-app-card border-app">
          <CardContent className="pt-6 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Search className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-app-muted">Total Signals</p>
              <p className="text-2xl font-bold text-app-foreground">
                {isLoading ? "—" : signals.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app">
          <CardContent className="pt-6 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-app-muted">Hot Leads</p>
              <p className="text-2xl font-bold text-app-foreground">
                {isLoading ? "—" : hotLeads}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app">
          <CardContent className="pt-6 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-app-muted">Avg Seller Score</p>
              <p className="text-2xl font-bold text-app-foreground">
                {isLoading ? "—" : `${avgScore}/${MAX_SELLER_SCORE}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app">
          <CardContent className="pt-6 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-app-muted">Zip Codes Monitored</p>
              <p className="text-2xl font-bold text-app-foreground">10</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Scan ────────────────────────────────────────── */}
      <Card className="bg-app-card border-app">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-app-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Search &amp; Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Filter by zip code…"
              value={zipFilter}
              onChange={(e) => setZipFilter(e.target.value)}
              className="md:w-48 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="md:w-56 bg-app-muted border-app text-app-foreground">
                <SelectValue placeholder="Signal type" />
              </SelectTrigger>
              <SelectContent>
                {SIGNAL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-app pt-4">
            <p className="text-sm text-app-muted mb-2">Scan a specific property</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Property address"
                value={scanAddress}
                onChange={(e) => setScanAddress(e.target.value)}
                className="flex-1 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
              />
              <Input
                placeholder="Zip code"
                value={scanZip}
                onChange={(e) => setScanZip(e.target.value)}
                className="sm:w-36 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
              />
              <Button
                onClick={handleScan}
                disabled={scanMutation.isPending || !scanAddress.trim() || !scanZip.trim()}
                className="gap-2"
              >
                {scanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Satellite className="w-4 h-4" />
                )}
                Scan Property
              </Button>
            </div>
            {scanMutation.isError && (
              <p className="text-sm text-red-400 mt-2">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {(scanMutation.error as Error).message}
              </p>
            )}
            {scanMutation.isSuccess && (
              <p className="text-sm text-emerald-400 mt-2">
                Scan complete — {scanMutation.data.signals.length} signal(s) detected.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Signals Grid ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-app-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Flagged Signals
          {!isLoading && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {signals.length}
            </Badge>
          )}
        </h2>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="py-8 text-center text-red-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              Failed to load signals. Please try again.
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && signals.length === 0 && (
          <Card className="bg-app-card border-app">
            <CardContent className="py-12 text-center text-app-muted">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No signals found. Adjust filters or scan a property.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signals.map((signal) => {
            const style = signalStyle(signal.signal_type);
            const confidencePct = Math.min(100, Math.round(Number(signal.confidence ?? 0)));
            const isSelected = selectedSignal?.id === signal.id;

            return (
              <Card
                key={signal.id}
                className={`bg-app-card border cursor-pointer transition-all duration-200 hover:border-primary/40 ${
                  isSelected ? "border-primary ring-1 ring-primary/30" : "border-app"
                }`}
                onClick={() => setSelectedSignal(isSelected ? null : signal)}
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-app-foreground truncate">
                        {signal.property_address ?? "Address unavailable"}
                      </p>
                      <p className="text-sm text-app-muted flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {signal.zip}
                      </p>
                    </div>
                    <Badge className={`shrink-0 border ${style.bg} ${style.color} text-xs`}>
                      {style.label}
                    </Badge>
                  </div>

                  {/* Confidence */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-app-muted">Confidence</span>
                      <span className={confidencePct > 80 ? "text-red-400 font-semibold" : "text-app-foreground"}>
                        {confidencePct}%
                      </span>
                    </div>
                    <Progress
                      value={confidencePct}
                      className="h-2 bg-app-muted"
                    />
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-muted">
                    {signal.source_api && (
                      <span className="flex items-center gap-1">
                        <Satellite className="w-3.5 h-3.5" />
                        {signal.source_api}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(signal.detected_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  {signal.satellite_image_url ? (
                    <div className="rounded-lg overflow-hidden border border-app h-32">
                      <img
                        src={signal.satellite_image_url}
                        alt="Satellite view"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-app h-32 flex items-center justify-center bg-app-muted/30">
                      <Home className="w-8 h-8 text-app-muted opacity-40" />
                    </div>
                  )}

                  {/* Notes */}
                  {signal.notes && (
                    <p className="text-xs text-app-muted italic line-clamp-2">{signal.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Motivated Seller Score Breakdown ──────────────────────── */}
      {selectedSignal && selectedBreakdown && (
        <Card className="bg-app-card border-app">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-app-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Motivated Seller Score
              <Badge variant="secondary" className="ml-auto text-base font-bold">
                {selectedBreakdown.total} / {MAX_SELLER_SCORE}
              </Badge>
            </CardTitle>
            <p className="text-sm text-app-muted">
              {selectedSignal.property_address ?? selectedSignal.zip}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedBreakdown.breakdown.map((factor) => (
                <div key={factor.label} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      factor.active ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      factor.active ? "text-app-foreground" : "text-app-muted"
                    }`}
                  >
                    {factor.label}
                  </span>
                  <span
                    className={`text-sm font-mono ${
                      factor.active ? "text-emerald-400 font-semibold" : "text-app-muted"
                    }`}
                  >
                    {factor.active ? "+" : " "}{factor.pts} pts
                  </span>
                  <Progress
                    value={factor.active ? 100 : 0}
                    className="w-24 h-1.5 bg-app-muted hidden sm:block"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Condition Flags ───────────────────────────────────────── */}
      <Card className="bg-app-card border-app">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-app-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            Condition Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CONDITION_FLAGS.map((flag) => {
              const flagged = flag.match.some((m) => activeConditionTypes.has(m as SignalType));
              const Icon = flag.icon;
              return (
                <div
                  key={flag.key}
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 border transition-colors ${
                    flagged
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-app-muted/20 border-app"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${flagged ? "text-red-400" : "text-app-muted"}`}
                  />
                  <span
                    className={`text-xs font-medium text-center ${
                      flagged ? "text-red-400" : "text-app-muted"
                    }`}
                  >
                    {flag.label}
                  </span>
                  <Badge
                    className={`text-[10px] px-2 py-0.5 border ${
                      flagged
                        ? "bg-red-500/15 border-red-500/30 text-red-400"
                        : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                    }`}
                  >
                    {flagged ? "Flagged" : "Not Detected"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default function DealSourcingPage() {
  return <BlueprintDealSourcingPage />;
}
