'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  Building2,
  CheckSquare,
  Download,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';

interface Provider {
  npi: string;
  entity_type: '1' | '2';
  provider_last_name: string | null;
  provider_first_name: string | null;
  provider_middle_name: string | null;
  provider_org_name: string | null;
  credentials: string | null;
  specialty: string | null;
  primary_taxonomy_code: string | null;
  primary_taxonomy_desc: string | null;
  practice_address_1: string | null;
  practice_address_2: string | null;
  practice_city: string | null;
  practice_state: string | null;
  practice_zip: string | null;
  practice_phone: string | null;
  mailing_address_1: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip: string | null;
  mailing_phone: string | null;
  status: string;
  gender: string | null;
  enumeration_date: string | null;
  last_updated: string | null;
}

interface Stats {
  total: number;
  individuals: number;
  organizations: number;
  with_phone: number;
  last_import: {
    status: string;
    total_upserted: number;
    filter_state: string | null;
    finished_at: string | null;
    started_at: string;
  } | null;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR',
];

function displayName(p: Provider): string {
  if (p.entity_type === '2') return p.provider_org_name || `Org ${p.npi}`;
  const parts = [p.provider_first_name, p.provider_middle_name, p.provider_last_name].filter(Boolean);
  const name = parts.join(' ') || `Provider ${p.npi}`;
  return p.credentials ? `${name}, ${p.credentials}` : name;
}

function formatAddress(p: Provider): string {
  return [p.practice_address_1, p.practice_city, p.practice_state, p.practice_zip]
    .filter(Boolean)
    .join(', ');
}

export default function AdminProvidersPage() {
  const { session } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Provider | null>(null);

  const [q, setQ] = useState('');
  const [npi, setNpi] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [entityType, setEntityType] = useState('all');

  const [seedOpen, setSeedOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedForm, setSeedForm] = useState({
    state: 'FL',
    city: 'Miami',
    zip: '',
    specialty: '',
    limit: '200',
  });
  const [seedCities, setSeedCities] = useState<string[]>([]);
  const [seedZips, setSeedZips] = useState<string[]>([]);
  const [loadingSeedLocations, setLoadingSeedLocations] = useState(false);

  const [mailOpen, setMailOpen] = useState(false);
  const [mailType, setMailType] = useState<'letter' | 'postcard'>('letter');
  const [mailAddress, setMailAddress] = useState<'practice' | 'mailing'>('practice');
  const [mailHtml, setMailHtml] = useState(
    `<p>Hello {{name}},</p>
<p>We wanted to reach out regarding opportunities that may benefit your practice.</p>
<p>Best regards,<br/>BrocaAI</p>`,
  );
  const [sendingMail, setSendingMail] = useState(false);
  const [exporting, setExporting] = useState(false);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [session?.access_token]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (npi.trim()) sp.set('npi', npi.trim());
    if (specialty.trim()) sp.set('specialty', specialty.trim());
    if (state) sp.set('state', state);
    if (city.trim()) sp.set('city', city.trim());
    if (zip.trim()) sp.set('zip', zip.trim());
    if (entityType !== 'all') sp.set('entity_type', entityType);
    sp.set('page', String(page));
    sp.set('limit', '25');
    return sp.toString();
  }, [q, npi, specialty, state, city, zip, entityType, page]);

  const loadStats = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/providers?stats=1', { headers });
      if (!res.ok) return;
      setStats(await res.json());
    } catch {
      /* ignore */
    }
  }, [authHeaders]);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/providers?${queryString}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: 'Could not load providers', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, queryString, toast]);

  useEffect(() => {
    if (!session?.access_token) return;
    loadStats();
  }, [session?.access_token, loadStats]);

  useEffect(() => {
    if (!session?.access_token) return;
    loadProviders();
  }, [session?.access_token, loadProviders]);

  // Load city/ZIP dropdown options when import dialog state/city changes
  useEffect(() => {
    if (!seedOpen || !seedForm.state || !session?.access_token) {
      if (!seedForm.state) {
        setSeedCities([]);
        setSeedZips([]);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSeedLocations(true);
      try {
        const headers = await authHeaders();
        const sp = new URLSearchParams({ locations: '1', state: seedForm.state });
        if (seedForm.city.trim()) sp.set('city', seedForm.city.trim());
        const res = await fetch(`/api/admin/providers?${sp.toString()}`, { headers });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setSeedCities(data.cities || []);
          setSeedZips(data.zips || []);
        }
      } catch {
        if (!cancelled) {
          setSeedCities([]);
          setSeedZips([]);
        }
      } finally {
        if (!cancelled) setLoadingSeedLocations(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seedOpen, seedForm.state, seedForm.city, session?.access_token, authHeaders]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.npi)));
  };

  const clearFilters = () => {
    setQ('');
    setNpi('');
    setSpecialty('');
    setState('');
    setCity('');
    setZip('');
    setEntityType('all');
    setPage(1);
  };

  const handleSeed = async () => {
    const hasExtra = !!(seedForm.city.trim() || seedForm.zip.trim() || seedForm.specialty.trim());
    if (!seedForm.state && !hasExtra) {
      toast({
        title: 'Add filters',
        description: 'CMS needs State plus City, ZIP, or Specialty (state alone is not allowed).',
        variant: 'destructive',
      });
      return;
    }
    if (seedForm.state && !hasExtra) {
      toast({
        title: 'Add City, ZIP, or Specialty',
        description: 'Example: State FL + City Miami, or State FL + ZIP 33139.',
        variant: 'destructive',
      });
      return;
    }
    setSeeding(true);
    try {
      const headers = await authHeaders();
      if (!headers.Authorization) {
        throw new Error('Not signed in. Refresh the page and log in again as admin.');
      }
      const res = await fetch('/api/admin/providers/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          state: seedForm.state || undefined,
          city: seedForm.city || undefined,
          zip: seedForm.zip || undefined,
          specialty: seedForm.specialty || undefined,
          limit: Number(seedForm.limit) || 200,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      if (!data.upserted) {
        toast({
          title: 'No providers found',
          description: 'Try a broader filter (e.g. remove specialty, or use a larger city).',
        });
      } else {
        toast({
          title: 'Providers imported',
          description: `Fetched ${data.fetched}, saved ${data.upserted} records from CMS.`,
        });
      }
      setSeedOpen(false);
      setState(seedForm.state || '');
      setCity(seedForm.city || '');
      setZip(seedForm.zip || '');
      setSpecialty(seedForm.specialty || '');
      setPage(1);
      await loadStats();
      {
        const sp = new URLSearchParams();
        if (seedForm.state) sp.set('state', seedForm.state);
        if (seedForm.city.trim()) sp.set('city', seedForm.city.trim());
        if (seedForm.zip.trim()) sp.set('zip', seedForm.zip.trim());
        if (seedForm.specialty.trim()) sp.set('specialty', seedForm.specialty.trim());
        sp.set('page', '1');
        sp.set('limit', '25');
        const listRes = await fetch(`/api/admin/providers?${sp.toString()}`, { headers });
        const listData = await listRes.json();
        if (listRes.ok) {
          setRows(listData.rows || []);
          setTotal(listData.total || 0);
          setSelected(new Set());
        }
      }
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  const handleExport = async (scope: 'filtered' | 'all') => {
    setExporting(true);
    try {
      const headers = await authHeaders();
      const sp = new URLSearchParams(queryString);
      sp.set('scope', scope);
      sp.delete('page');
      sp.delete('limit');
      const res = await fetch(`/api/admin/providers/export?${sp.toString()}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `broca-nppes-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'CSV downloaded', description: scope === 'all' ? 'Full export (capped)' : 'Filtered results exported' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleSendMail = async () => {
    if (!selected.size) return;
    setSendingMail(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/providers/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          npis: [...selected],
          mail_type: mailType,
          address_source: mailAddress,
          template_label: 'Provider outreach',
          html: mailHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      toast({
        title: 'Mail queued',
        description: `${data.success_count} sent, ${data.fail_count} failed`,
      });
      setMailOpen(false);
    } catch (e: any) {
      toast({
        title: 'Physical mail not ready',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSendingMail(false);
    }
  };

  return (
    <AdminLayout
      title="Provider Directory"
      subtitle="Search the CMS NPPES registry, export contact lists, and prepare physical mail outreach"
      headerAction={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-emerald-700 hover:bg-emerald-800 text-white border-0"
            onClick={() => { loadStats(); loadProviders(); }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-emerald-800 hover:bg-emerald-900 text-white"
            onClick={() => setSeedOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import from CMS
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-slate-900">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Providers in DB', value: stats?.total ?? '—', icon: Users, tone: 'from-emerald-50 to-teal-50 border-emerald-100' },
            { label: 'Individuals', value: stats?.individuals ?? '—', icon: UserRound, tone: 'from-sky-50 to-blue-50 border-sky-100' },
            { label: 'Organizations', value: stats?.organizations ?? '—', icon: Building2, tone: 'from-amber-50 to-orange-50 border-amber-100' },
            { label: 'With phone', value: stats?.with_phone ?? '—', icon: Phone, tone: 'from-violet-50 to-purple-50 border-violet-100' },
          ].map((s) => (
            <Card key={s.label} className={`border bg-gradient-to-br ${s.tone} shadow-none text-slate-900`}>
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 font-medium">{s.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/80 border border-black/5 flex items-center justify-center">
                  <s.icon className="h-4 w-4 text-broca-emerald-dark" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats?.last_import && (
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-medium">Last import:</span>
            <span>{stats.last_import.total_upserted.toLocaleString()} saved</span>
            {stats.last_import.filter_state && <span>State {stats.last_import.filter_state}</span>}
            <span className="text-emerald-700/80">
              {stats.last_import.finished_at
                ? new Date(stats.last_import.finished_at).toLocaleString()
                : stats.last_import.status}
            </span>
          </div>
        )}

        {/* Filters */}
        <Card className="border-app bg-white text-slate-900 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-broca-emerald-dark to-emerald-800 px-5 py-4 text-white">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 opacity-90" />
              <h2 className="font-medium text-white">Search providers</h2>
            </div>
            <p className="text-sm text-white/75 mt-1">
              Filter by name, NPI, specialty, and location — then export or prepare mail
            </p>
          </div>
          <CardContent className="p-5 space-y-4 bg-white text-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="xl:col-span-2 space-y-1.5">
                <Label className="text-xs text-slate-600">Name or keyword</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Dr. Smith, clinic name…"
                    className="pl-9 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">NPI</Label>
                <Input
                  value={npi}
                  onChange={(e) => { setNpi(e.target.value.replace(/\D/g, '').slice(0, 10)); setPage(1); }}
                  placeholder="10-digit NPI"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Specialty</Label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <Input
                    value={specialty}
                    onChange={(e) => { setSpecialty(e.target.value); setPage(1); }}
                    placeholder="Cardiology, Dentist…"
                    className="pl-9 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">State</Label>
                <Select value={state || 'none'} onValueChange={(v) => { setState(v === 'none' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                    <SelectValue placeholder="Any state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any state</SelectItem>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">City</Label>
                <Input
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setPage(1); }}
                  placeholder="Miami"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">ZIP</Label>
                <Input
                  value={zip}
                  onChange={(e) => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); setPage(1); }}
                  placeholder="33139"
                  className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Entity type</Label>
                <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="1">Individuals (NPI-1)</SelectItem>
                    <SelectItem value="2">Organizations (NPI-2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting || total === 0}
                  onClick={() => handleExport('filtered')}
                >
                  {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  Export filtered CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting || !stats?.total}
                  onClick={() => handleExport('all')}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export dataset
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  {total.toLocaleString()} matches
                </Badge>
                <Button
                  size="sm"
                  disabled={!selected.size}
                  className="bg-broca-emerald hover:bg-broca-emerald-dark text-white"
                  onClick={() => setMailOpen(true)}
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Send mail ({selected.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-app bg-white text-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-app flex items-center justify-between bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckSquare className="h-4 w-4" />
              {selected.size > 0 ? (
                <span className="text-slate-900 font-medium">{selected.size} selected</span>
              ) : (
                <span>Select rows to export or mail</span>
              )}
            </div>
            <div className="text-xs text-slate-600">
              Page {page} of {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <Table className="bg-white text-slate-900">
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100 text-slate-700 border-b border-slate-200">
                  <TableHead className="w-10 text-slate-700">
                    <Checkbox
                      checked={rows.length > 0 && selected.size === rows.length}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold">Provider</TableHead>
                  <TableHead className="text-slate-700 font-semibold">NPI</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Specialty</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Location</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Phone</TableHead>
                  <TableHead className="w-20 text-slate-700" />
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white text-slate-900">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center text-slate-600">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Loading providers…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="max-w-md mx-auto space-y-3 py-6">
                        <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          <Stethoscope className="h-5 w-5 text-broca-emerald" />
                        </div>
                        <p className="font-medium text-slate-900">No providers in this view yet</p>
                        <p className="text-sm text-slate-600">
                          Click <span className="font-medium text-slate-900">Import from CMS</span> to pull
                          providers for a state, city, ZIP, or specialty into Broca.
                        </p>
                        <Button
                          className="bg-broca-emerald hover:bg-broca-emerald-dark text-white"
                          onClick={() => setSeedOpen(true)}
                        >
                          <Upload className="h-4 w-4 mr-1.5" />
                          Import from CMS
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => (
                    <TableRow
                      key={p.npi}
                      className="cursor-pointer"
                      onClick={() => setDetail(p)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(p.npi)}
                          onCheckedChange={() => toggleOne(p.npi)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[200px]">
                          <p className="font-medium text-slate-900 leading-snug">{displayName(p)}</p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-[10px] ${
                              p.entity_type === '2'
                                ? 'border-amber-200 text-amber-800 bg-amber-50'
                                : 'border-sky-200 text-sky-800 bg-sky-50'
                            }`}
                          >
                            {p.entity_type === '2' ? 'Organization' : 'Individual'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-slate-800">{p.npi}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-slate-600">
                        {p.specialty || '—'}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="flex items-start gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-broca-emerald" />
                          <span className="truncate">{formatAddress(p) || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-slate-800">{p.practice_phone || '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-broca-emerald-dark">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-app flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 tabular-nums">
                {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto bg-white text-slate-900">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-6 leading-snug text-slate-900">{displayName(detail)}</SheetTitle>
                <SheetDescription className="font-mono text-slate-600">{detail.npi}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-slate-900">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {detail.entity_type === '2' ? 'Organization' : 'Individual'}
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    {detail.status}
                  </Badge>
                  {detail.specialty && (
                    <Badge variant="secondary">{detail.specialty}</Badge>
                  )}
                </div>

                <section className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-slate-600 font-medium">Practice address</h4>
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-1">
                    <p>{detail.practice_address_1 || '—'}</p>
                    {detail.practice_address_2 && <p>{detail.practice_address_2}</p>}
                    <p>
                      {[detail.practice_city, detail.practice_state, detail.practice_zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {detail.practice_phone && (
                      <p className="pt-2 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {detail.practice_phone}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-slate-600 font-medium">Mailing address</h4>
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-1">
                    <p>{detail.mailing_address_1 || '—'}</p>
                    <p>
                      {[detail.mailing_city, detail.mailing_state, detail.mailing_zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-600">Taxonomy</p>
                    <p className="font-medium mt-1">{detail.primary_taxonomy_code || '—'}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-600">Last updated</p>
                    <p className="font-medium mt-1">{detail.last_updated || '—'}</p>
                  </div>
                </section>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelected(new Set([detail.npi]));
                      setMailOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Send mail
                  </Button>
                  <Button
                    className="flex-1 bg-broca-emerald hover:bg-broca-emerald-dark text-white"
                    onClick={() => {
                      setSelected(new Set([detail.npi]));
                      handleExport('filtered');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Seed dialog */}
      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Import from CMS NPI Registry</DialogTitle>
            <DialogDescription className="text-slate-600">
              CMS does not allow State alone. Use <strong className="text-slate-800">State + City</strong>,{' '}
              <strong className="text-slate-800">State + ZIP</strong>, or{' '}
              <strong className="text-slate-800">State + Specialty</strong>. Example: FL + Miami, max 200.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-slate-900">
            <div className="space-y-1.5">
              <Label className="text-slate-800 font-medium">State</Label>
              <Select
                value={seedForm.state || 'none'}
                onValueChange={(v) =>
                  setSeedForm((f) => ({
                    ...f,
                    state: v === 'none' ? '' : v,
                    city: '',
                    zip: '',
                  }))
                }
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 max-h-64">
                  <SelectItem value="none">Any</SelectItem>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-800 font-medium">
                  City {loadingSeedLocations ? '(loading…)' : ''}
                </Label>
                {seedForm.state && seedCities.length > 0 ? (
                  <Select
                    value={seedForm.city || 'none'}
                    onValueChange={(v) =>
                      setSeedForm((f) => ({
                        ...f,
                        city: v === 'none' ? '' : v,
                        zip: '',
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 max-h-64">
                      <SelectItem value="none">Select city…</SelectItem>
                      {seedCities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={seedForm.city}
                    onChange={(e) => setSeedForm((f) => ({ ...f, city: e.target.value, zip: '' }))}
                    placeholder={seedForm.state ? 'Type city (e.g. Miami)' : 'Select state first'}
                    disabled={!seedForm.state}
                    className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-800 font-medium">ZIP</Label>
                {seedForm.state && seedZips.length > 0 ? (
                  <Select
                    value={seedForm.zip || 'none'}
                    onValueChange={(v) =>
                      setSeedForm((f) => ({ ...f, zip: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                      <SelectValue placeholder="Select ZIP" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 max-h-64">
                      <SelectItem value="none">Any / skip ZIP</SelectItem>
                      {seedZips.map((z) => (
                        <SelectItem key={z} value={z}>{z}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={seedForm.zip}
                    onChange={(e) =>
                      setSeedForm((f) => ({
                        ...f,
                        zip: e.target.value.replace(/\D/g, '').slice(0, 5),
                      }))
                    }
                    placeholder="e.g. 33139"
                    disabled={!seedForm.state}
                    className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-1">
              After you pick a state, City and ZIP lists load automatically from your database (and major cities).
              Re-importing updates existing NPIs — it does not duplicate your Florida records.
            </p>
            <div className="space-y-1.5">
              <Label className="text-slate-800 font-medium">Specialty / taxonomy</Label>
              <Input
                value={seedForm.specialty}
                onChange={(e) => setSeedForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="e.g. Dentist, Internal Medicine"
                className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-800 font-medium">Max records</Label>
              <Select
                value={seedForm.limit}
                onValueChange={(v) => setSeedForm((f) => ({ ...f, limit: v }))}
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="2000">2,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
              onClick={() => setSeedOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={seeding}
              onClick={handleSeed}
            >
              {seeding ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Import now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mail dialog */}
      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Send physical mail</DialogTitle>
            <DialogDescription>
              Letters and postcards via Lob. Add your <code className="text-xs">LOB_API_KEY</code> to enable live sends.
              Until then, this dialog is ready but sends will be blocked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {selected.size} provider{selected.size === 1 ? '' : 's'} selected · Lob key pending
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mail type</Label>
                <Select value={mailType} onValueChange={(v: any) => setMailType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="postcard">Postcard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Address source</Label>
                <Select value={mailAddress} onValueChange={(v: any) => setMailAddress(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="mailing">Mailing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message HTML (use {'{{name}}'})</Label>
              <Textarea
                value={mailHtml}
                onChange={(e) => setMailHtml(e.target.value)}
                rows={7}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMailOpen(false)}>Cancel</Button>
            <Button
              className="bg-broca-emerald hover:bg-broca-emerald-dark text-white"
              disabled={sendingMail || !selected.size}
              onClick={handleSendMail}
            >
              {sendingMail ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
              Queue with Lob
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
