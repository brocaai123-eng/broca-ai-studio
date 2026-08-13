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
import { PROVIDER_TYPES, friendlySpecialty } from '@/lib/services/nppes-specialties';
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
  Sparkles,
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
  const [mailMessage, setMailMessage] = useState(
    'Hello {{name}},\n\nWe wanted to reach out regarding opportunities that may benefit your practice.\n\nBest regards,\nBrocaAI',
  );
  const [mailFront, setMailFront] = useState(
    'Hello {{name}},\n\nPartner with BrocaAI — opportunities for your practice.',
  );
  const [mailBack, setMailBack] = useState(
    'BrocaAI\n12794 Forest Hill Blvd, Suite 29\nWellington, FL 33414\n\nReply or call to learn more.',
  );
  const [mailAiTopic, setMailAiTopic] = useState('');
  const [generatingMail, setGeneratingMail] = useState(false);
  const [postcardSize, setPostcardSize] = useState<'4x6' | '6x9' | '6x11'>('4x6');
  const [creativeMode, setCreativeMode] = useState<'plain' | 'upload' | 'url' | 'template' | 'ai_html'>('plain');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [frontHtml, setFrontHtml] = useState('');
  const [backHtml, setBackHtml] = useState('');
  const [templateId, setTemplateId] = useState('builtin-emerald-4x6');
  const [builtInTemplates, setBuiltInTemplates] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      size: string;
      front_html?: string;
      back_html?: string;
    }>
  >([]);
  const [artboardHint, setArtboardHint] = useState('4.25" × 6.25" @ 300 DPI');
  const [uploadingCreative, setUploadingCreative] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontLocalPreview, setFrontLocalPreview] = useState<string | null>(null);
  const [backLocalPreview, setBackLocalPreview] = useState<string | null>(null);
  const [sendingMail, setSendingMail] = useState(false);
  const [mailUsage, setMailUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [lobConfigured, setLobConfigured] = useState(false);
  const [lobFromLabel, setLobFromLabel] = useState<string | null>(null);
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

  const loadMailUsage = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/providers/mail', { headers });
      const data = await res.json();
      if (res.ok) {
        setLobConfigured(Boolean(data.configured));
        setLobFromLabel(data.from?.label || null);
        if (data.usage) setMailUsage(data.usage);
      } else {
        console.warn('[providers/mail]', data.error || res.status);
      }
    } catch {
      /* ignore */
    }
  }, [authHeaders]);

  const loadPostcardCreatives = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/providers/mail/creatives', { headers });
      const data = await res.json();
      if (!res.ok) return;
      setBuiltInTemplates(data.built_in || []);
      const match = (data.sizes || []).find((s: { size: string }) => s.size === postcardSize);
      if (match?.artboard?.label) setArtboardHint(match.artboard.label);
    } catch {
      /* ignore */
    }
  }, [authHeaders, postcardSize]);

  // Controlled Dialog does not always fire onOpenChange(true) when opened via setState
  useEffect(() => {
    if (mailOpen && session?.access_token) {
      void loadMailUsage();
      void loadPostcardCreatives();
    }
  }, [mailOpen, session?.access_token, loadMailUsage, loadPostcardCreatives]);

  const openMailDialog = (npis?: string[]) => {
    if (npis?.length) setSelected(new Set(npis));
    setMailOpen(true);
  };

  const selectedProviders = useMemo(
    () => rows.filter((r) => selected.has(r.npi)),
    [rows, selected],
  );

  const selectedTemplatePreview = useMemo(() => {
    const sample = selectedProviders[0] ? displayName(selectedProviders[0]) : 'Provider';
    // Prefer live editable HTML once loaded
    if (frontHtml.trim() && backHtml.trim()) {
      return {
        front: frontHtml.replace(/\{\{name\}\}/gi, sample),
        back: backHtml.replace(/\{\{name\}\}/gi, sample),
        name: builtInTemplates.find((x) => x.id === templateId)?.name || 'Template',
      };
    }
    const t = builtInTemplates.find((x) => x.id === templateId);
    if (!t?.front_html || !t?.back_html) return null;
    return {
      front: t.front_html.replace(/\{\{name\}\}/gi, sample),
      back: t.back_html.replace(/\{\{name\}\}/gi, sample),
      name: t.name,
    };
  }, [builtInTemplates, templateId, selectedProviders, frontHtml, backHtml]);

  const applyTemplateToEditor = useCallback(
    (id: string) => {
      const t = builtInTemplates.find((x) => x.id === id);
      if (t?.front_html && t?.back_html) {
        setFrontHtml(t.front_html);
        setBackHtml(t.back_html);
        if (t.size === '4x6' || t.size === '6x9' || t.size === '6x11') {
          setPostcardSize(t.size);
        }
      }
    },
    [builtInTemplates],
  );

  // When templates load or user is on template mode, seed editor from selection
  useEffect(() => {
    if (creativeMode !== 'template') return;
    if (!builtInTemplates.length) return;
    const t = builtInTemplates.find((x) => x.id === templateId);
    if (t?.front_html && t?.back_html && (!frontHtml.trim() || !backHtml.trim())) {
      setFrontHtml(t.front_html);
      setBackHtml(t.back_html);
    }
  }, [creativeMode, builtInTemplates, templateId, frontHtml, backHtml]);

  const loadSampleDesignUrls = () => {
    // 4x6 bleed artboard at 300 DPI = 1275 × 1875
    const dims =
      postcardSize === '6x9'
        ? '1875x2775'
        : postcardSize === '6x11'
          ? '1875x3375'
          : '1275x1875';
    setFrontUrl(`https://placehold.co/${dims}/064e3b/ffffff/png?text=FRONT+${encodeURIComponent(postcardSize)}`);
    setBackUrl(`https://placehold.co/${dims}/f1f5f9/0f172a/png?text=BACK+${encodeURIComponent(postcardSize)}`);
    setCreativeMode('url');
    toast({
      title: 'Sample URLs loaded',
      description: 'Hosted design URLs mode — preview below, then Queue with Lob (Test).',
    });
  };

  const formatMailTo = (p: Provider) => {
    if (mailAddress === 'mailing') {
      return [p.mailing_address_1, p.mailing_city, p.mailing_state, p.mailing_zip]
        .filter(Boolean)
        .join(', ') || 'Missing mailing address';
    }
    return [p.practice_address_1, p.practice_city, p.practice_state, p.practice_zip]
      .filter(Boolean)
      .join(', ') || 'Missing practice address';
  };

  const handleGenerateMailCopy = async () => {
    setGeneratingMail(true);
    try {
      const headers = await authHeaders();
      const sample = selectedProviders[0];
      const designHtml = mailType === 'postcard' && creativeMode === 'ai_html';
      const rewriteTemplate = mailType === 'postcard' && creativeMode === 'template';
      // Ensure template HTML is loaded before AI rewrite
      if (rewriteTemplate && (!frontHtml.trim() || !backHtml.trim())) {
        applyTemplateToEditor(templateId);
      }
      const res = await fetch('/api/admin/providers/mail/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          mail_type: mailType,
          mode: designHtml ? 'design_html' : rewriteTemplate ? 'rewrite_template' : 'copy',
          postcard_size: postcardSize,
          topic: mailAiTopic,
          sample_name: sample ? displayName(sample) : undefined,
          ...(rewriteTemplate
            ? {
                front_html:
                  frontHtml ||
                  builtInTemplates.find((t) => t.id === templateId)?.front_html ||
                  '',
                back_html:
                  backHtml ||
                  builtInTemplates.find((t) => t.id === templateId)?.back_html ||
                  '',
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generate failed');
      if (designHtml || rewriteTemplate) {
        if (data.front_html) setFrontHtml(data.front_html);
        if (data.back_html) setBackHtml(data.back_html);
        toast({
          title: rewriteTemplate ? 'Template copy updated' : 'AI design ready',
          description: 'Edit the text below if needed, then queue with Lob.',
        });
      } else if (mailType === 'postcard') {
        if (data.front) setMailFront(data.front);
        if (data.back) setMailBack(data.back);
        toast({ title: 'AI draft ready', description: 'Review the text, then queue with Lob.' });
      } else if (data.message) {
        setMailMessage(data.message);
        toast({ title: 'AI draft ready', description: 'Review the text, then queue with Lob.' });
      }
    } catch (e: any) {
      toast({
        title: 'AI write failed',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingMail(false);
    }
  };

  const handleUploadCreatives = async () => {
    if (!frontFile || !backFile) {
      toast({
        title: 'Files required',
        description: 'Choose front and back PDF/PNG/JPG files.',
        variant: 'destructive',
      });
      return;
    }
    setUploadingCreative(true);
    try {
      const headers = await authHeaders();
      const form = new FormData();
      form.set('front', frontFile);
      form.set('back', backFile);
      form.set('size', postcardSize);
      form.set('name', `Upload ${postcardSize} ${new Date().toISOString().slice(0, 10)}`);
      form.set('save', '1');
      const res = await fetch('/api/admin/providers/mail/creatives', {
        method: 'POST',
        headers,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFrontUrl(data.front_url || '');
      setBackUrl(data.back_url || '');
      if (data.artboard?.label) setArtboardHint(data.artboard.label);
      toast({
        title: 'Design uploaded',
        description: 'Front and back URLs ready — queue with Lob when ready.',
      });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingCreative(false);
    }
  };

  const handleSendMail = async () => {
    if (!selected.size) return;
    setSendingMail(true);
    try {
      const headers = await authHeaders();
      const payload: Record<string, unknown> = {
        npis: [...selected],
        mail_type: mailType,
        address_source: mailAddress,
        postcard_size: postcardSize,
        template_label: mailType === 'postcard' ? 'Provider postcard' : 'Provider letter',
      };
      if (mailType === 'postcard') {
        payload.creative_mode = creativeMode;
        if (creativeMode === 'plain') {
          payload.front = mailFront;
          payload.back = mailBack;
        } else if (creativeMode === 'upload' || creativeMode === 'url') {
          payload.front_url = frontUrl;
          payload.back_url = backUrl;
        } else if (creativeMode === 'template') {
          // Send edited HTML so template pack text changes are applied
          payload.creative_mode = 'html';
          payload.front_html = frontHtml;
          payload.back_html = backHtml;
          payload.template_label =
            builtInTemplates.find((t) => t.id === templateId)?.name || 'Template postcard';
        } else if (creativeMode === 'ai_html') {
          payload.front_html = frontHtml;
          payload.back_html = backHtml;
        }
      } else {
        payload.message = mailMessage;
      }
      const res = await fetch('/api/admin/providers/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.usage) setMailUsage(data.usage);
      if (typeof data.configured === 'boolean') setLobConfigured(data.configured);
      if (!res.ok) throw new Error(data.error || 'Send failed');
      const firstError = Array.isArray(data.results)
        ? data.results.find((r: { ok?: boolean; error?: string }) => !r.ok)?.error
        : null;
      const proofUrl = Array.isArray(data.results)
        ? data.results.find((r: { ok?: boolean; url?: string }) => r.ok && r.url)?.url
        : null;
      toast({
        title: data.success_count > 0 ? 'Mail queued' : 'Mail failed',
        description:
          `${data.success_count} sent, ${data.fail_count} failed` +
          (data.usage ? ` · ${data.usage.remaining} left this month` : '') +
          (firstError ? ` — ${firstError}` : '') +
          (proofUrl ? ' · Open Lob Test → Postcards for PDF proof' : ''),
        variant: data.success_count > 0 ? 'default' : 'destructive',
      });
      if (data.success_count > 0) setMailOpen(false);
    } catch (e: any) {
      toast({
        title: 'Physical mail blocked',
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
              Filter by name, NPI, provider type, and location — then export or prepare mail
            </p>
          </div>
          <CardContent className="p-5 space-y-4 bg-white text-slate-900">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Provider type</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSpecialty(''); setPage(1); }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    !specialty
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  All types
                </button>
                <div className="flex-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
                  <div className="flex gap-2 min-w-max pr-2">
                    {PROVIDER_TYPES.map((t) => {
                      const active = specialty === t.id || specialty === t.label;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSpecialty(active ? '' : t.id);
                            setPage(1);
                          }}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Slide the list sideways to pick dentist, oncology, family medicine, and more.</p>
            </div>
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
                <Label className="text-xs text-slate-600">Provider type (dropdown)</Label>
                <Select
                  value={specialty || 'none'}
                  onValueChange={(v) => { setSpecialty(v === 'none' ? '' : v); setPage(1); }}
                >
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 max-h-72">
                    <SelectItem value="none">Any type</SelectItem>
                    {PROVIDER_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  onClick={() => openMailDialog()}
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
                  <TableHead className="text-slate-700 font-semibold">Provider type</TableHead>
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
                        <div className="min-w-[220px]">
                          <p className="font-medium text-slate-900 leading-snug">{displayName(p)}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge className="border-0 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 text-[11px] font-semibold">
                              {friendlySpecialty(p)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                p.entity_type === '2'
                                  ? 'border-amber-200 text-amber-800 bg-amber-50'
                                  : 'border-sky-200 text-sky-800 bg-sky-50'
                              }`}
                            >
                              {p.entity_type === '2' ? 'Organization' : 'Individual'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-slate-800">{p.npi}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                          {friendlySpecialty(p)}
                        </span>
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
        <SheetContent className="sm:max-w-lg overflow-y-auto bg-white text-slate-900 border-l border-slate-200 [&>button]:text-slate-700 [&>button]:hover:text-slate-900 [&>button]:opacity-100">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="pr-8 leading-snug text-slate-900">{displayName(detail)}</SheetTitle>
                <SheetDescription className="font-mono text-slate-600">{detail.npi}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-slate-900">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-0 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 font-semibold">
                    {friendlySpecialty(detail)}
                  </Badge>
                  <Badge className="border border-slate-300 bg-white text-slate-800 hover:bg-white">
                    {detail.entity_type === '2' ? 'Organization' : 'Individual'}
                  </Badge>
                  <Badge className="border-0 bg-slate-100 text-slate-800 hover:bg-slate-100">
                    {detail.status}
                  </Badge>
                </div>

                <section className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-slate-600 font-medium">Practice address</h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1 text-slate-900">
                    <p>{detail.practice_address_1 || '—'}</p>
                    {detail.practice_address_2 && <p>{detail.practice_address_2}</p>}
                    <p>
                      {[detail.practice_city, detail.practice_state, detail.practice_zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {detail.practice_phone && (
                      <p className="pt-2 flex items-center gap-2 text-slate-800">
                        <Phone className="h-3.5 w-3.5" />
                        {detail.practice_phone}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-slate-600 font-medium">Mailing address</h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1 text-slate-900">
                    <p>{detail.mailing_address_1 || '—'}</p>
                    <p>
                      {[detail.mailing_city, detail.mailing_state, detail.mailing_zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
                    <p className="text-xs text-slate-600">Provider type</p>
                    <p className="font-medium mt-1">{friendlySpecialty(detail)}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">{detail.primary_taxonomy_code || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
                    <p className="text-xs text-slate-600">Last updated</p>
                    <p className="font-medium mt-1">{detail.last_updated || '—'}</p>
                  </div>
                </section>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white border-0"
                    onClick={() => {
                      setDetail(null);
                      openMailDialog([detail.npi]);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Send mail
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
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
              <Label className="text-slate-800 font-medium">Provider type</Label>
              <Select
                value={seedForm.specialty || 'none'}
                onValueChange={(v) => setSeedForm((f) => ({ ...f, specialty: v === 'none' ? '' : v }))}
              >
                <SelectTrigger className="bg-white text-slate-900 border-slate-300">
                  <SelectValue placeholder="Any / skip specialty" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 max-h-72">
                  <SelectItem value="none">Any / skip specialty</SelectItem>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      <Dialog
        open={mailOpen}
        onOpenChange={(open) => {
          setMailOpen(open);
          if (open) void loadMailUsage();
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Send physical mail</DialogTitle>
            <DialogDescription className="text-slate-600">
              Letters or designed postcards via Lob — plain text, upload, templates, or AI HTML.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1 text-slate-900">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {selected.size} provider{selected.size === 1 ? '' : 's'} selected
                </span>
                {mailUsage && (
                  <span className="text-xs text-slate-600 shrink-0">
                    {mailUsage.used}/{mailUsage.limit} used · {mailUsage.remaining} left
                  </span>
                )}
              </div>
              {lobConfigured ? (
                <p className="text-xs text-emerald-800">Lob connected (test or live key loaded).</p>
              ) : (
                <p className="text-xs text-amber-800">
                  Lob key not loaded — restart the app after setting LOB_API_KEY.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">From</p>
                <p className="text-sm text-slate-900 leading-snug">
                  {lobFromLabel || 'From address not set in env'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">To</p>
                <ul className="text-sm text-slate-900 space-y-1.5 max-h-28 overflow-y-auto">
                  {selectedProviders.length === 0 ? (
                    <li className="text-slate-500">No providers selected</li>
                  ) : (
                    selectedProviders.slice(0, 8).map((p) => (
                      <li key={p.npi} className="leading-snug">
                        <span className="font-medium">{displayName(p)}</span>
                        <span className="block text-xs text-slate-600">{formatMailTo(p)}</span>
                      </li>
                    ))
                  )}
                  {selectedProviders.length > 8 && (
                    <li className="text-xs text-slate-500">+{selectedProviders.length - 8} more</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-800">Mail type</Label>
                <Select value={mailType} onValueChange={(v: any) => setMailType(v)}>
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="letter">Letter (long message)</SelectItem>
                    <SelectItem value="postcard">Postcard (designed or text)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-800">Send to address</Label>
                <Select value={mailAddress} onValueChange={(v: any) => setMailAddress(v)}>
                  <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="practice">Practice location</SelectItem>
                    <SelectItem value="mailing">Mailing address</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mailType === 'postcard' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Postcard size</Label>
                  <Select
                    value={postcardSize}
                    onValueChange={(v: any) => {
                      setPostcardSize(v);
                      const hints: Record<string, string> = {
                        '4x6': '4.25" × 6.25" @ 300 DPI',
                        '6x9': '6.25" × 9.25" @ 300 DPI',
                        '6x11': '6.25" × 11.25" @ 300 DPI',
                      };
                      setArtboardHint(hints[v] || hints['4x6']);
                    }}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900">
                      <SelectItem value="4x6">4×6 (default)</SelectItem>
                      <SelectItem value="6x9">6×9</SelectItem>
                      <SelectItem value="6x11">6×11</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">Upload artboard: {artboardHint}. Leave back bottom-right clear for address.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Creative source</Label>
                  <Select value={creativeMode} onValueChange={(v: any) => {
                    setCreativeMode(v);
                    if (v === 'template') {
                      // defer apply until templates may already be loaded
                      setTimeout(() => applyTemplateToEditor(templateId), 0);
                    }
                  }}>
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900">
                      <SelectItem value="plain">Plain text</SelectItem>
                      <SelectItem value="upload">Upload design (PDF/PNG/JPG)</SelectItem>
                      <SelectItem value="url">Hosted design URLs</SelectItem>
                      <SelectItem value="template">Saved / built-in template</SelectItem>
                      <SelectItem value="ai_html">AI HTML design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {mailType === 'postcard' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-xs text-slate-700 space-y-1.5">
                <p className="font-medium text-slate-900">Test resources</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <button
                      type="button"
                      className="underline text-emerald-900 hover:text-emerald-700"
                      onClick={loadSampleDesignUrls}
                    >
                      Load sample front/back image URLs
                    </button>{' '}
                    (correct bleed size for Lob)
                  </li>
                  <li>
                    Specs:{' '}
                    <a
                      className="underline text-emerald-900"
                      href="https://help.lob.com/print-and-mail/designing-mail-creatives/mail-piece-design-specs/postcards"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lob postcard sizes &amp; ink-free zone
                    </a>
                  </li>
                  <li>
                    Gallery:{' '}
                    <a
                      className="underline text-emerald-900"
                      href="https://www.lob.com/template-gallery#postcards"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lob template gallery
                    </a>
                  </li>
                  <li>
                    Canva: create <strong>{postcardSize}</strong> design → export PNG/PDF at{' '}
                    <strong>{artboardHint}</strong> → Upload design
                  </li>
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <Label className="text-slate-800">Write with AI</Label>
              <p className="text-xs text-slate-500">
                {mailType === 'postcard' && creativeMode === 'ai_html'
                  ? 'AI drafts full HTML front & back marketing layouts for the selected size.'
                  : mailType === 'postcard' && creativeMode === 'template'
                    ? 'AI rewrites the text inside your selected template (layout/colors stay the same).'
                    : mailType === 'postcard'
                      ? 'AI drafts plain front & back copy (switch Creative source to AI HTML for designed layouts).'
                      : 'AI drafts the letter message.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={mailAiTopic}
                  onChange={(e) => setMailAiTopic(e.target.value)}
                  placeholder="e.g. Invite Florida clinics to partner on patient referrals"
                  className="bg-white text-slate-900 border-slate-300"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-slate-300 text-slate-800 bg-white hover:bg-slate-100"
                  disabled={generatingMail}
                  onClick={handleGenerateMailCopy}
                >
                  {generatingMail ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1.5" />
                  )}
                  {mailType === 'postcard' && (creativeMode === 'ai_html' || creativeMode === 'template')
                    ? creativeMode === 'template'
                      ? 'Rewrite with AI'
                      : 'Design with AI'
                    : 'Write with AI'}
                </Button>
              </div>
            </div>

            {mailType === 'letter' ? (
              <div className="space-y-1.5">
                <Label className="text-slate-800">Letter message</Label>
                <p className="text-xs text-slate-500">
                  Plain text only. Use {'{{name}}'} for the provider name. Line breaks are kept.
                </p>
                <Textarea
                  value={mailMessage}
                  onChange={(e) => setMailMessage(e.target.value)}
                  rows={8}
                  className="bg-white text-slate-900 border-slate-300 text-sm leading-relaxed"
                  placeholder="Hello {{name}},&#10;&#10;Your message here..."
                />
              </div>
            ) : creativeMode === 'plain' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Postcard — Front</Label>
                  <Textarea
                    value={mailFront}
                    onChange={(e) => setMailFront(e.target.value)}
                    rows={6}
                    className="bg-white text-slate-900 border-slate-300 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Postcard — Back</Label>
                  <Textarea
                    value={mailBack}
                    onChange={(e) => setMailBack(e.target.value)}
                    rows={6}
                    className="bg-white text-slate-900 border-slate-300 text-sm"
                  />
                </div>
              </div>
            ) : creativeMode === 'upload' ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-600">
                  Upload print-ready front &amp; back ({artboardHint}). PNG, JPG, or PDF.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-800">Front file</Label>
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                      className="bg-white text-slate-900 border-slate-300"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setFrontFile(f);
                        setFrontLocalPreview((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-800">Back file</Label>
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
                      className="bg-white text-slate-900 border-slate-300"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setBackFile(f);
                        setBackLocalPreview((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
                        });
                      }}
                    />
                  </div>
                </div>
                {(frontLocalPreview || backLocalPreview || frontFile || backFile) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100 min-h-[8rem]">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Front preview</p>
                      {frontLocalPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={frontLocalPreview} alt="Front" className="w-full h-40 object-contain bg-white" />
                      ) : (
                        <p className="text-xs text-slate-500 px-2 py-4">{frontFile ? frontFile.name : 'No image yet'}</p>
                      )}
                    </div>
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100 min-h-[8rem]">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Back preview</p>
                      {backLocalPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={backLocalPreview} alt="Back" className="w-full h-40 object-contain bg-white" />
                      ) : (
                        <p className="text-xs text-slate-500 px-2 py-4">{backFile ? backFile.name : 'No image yet'}</p>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-300 text-slate-800 bg-white"
                  disabled={uploadingCreative || !frontFile || !backFile}
                  onClick={handleUploadCreatives}
                >
                  {uploadingCreative ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  Upload to storage
                </Button>
                {(frontUrl || backUrl) && (
                  <div className="text-xs text-slate-600 space-y-1 break-all">
                    <p><span className="font-medium text-slate-800">Front:</span> {frontUrl || '—'}</p>
                    <p><span className="font-medium text-slate-800">Back:</span> {backUrl || '—'}</p>
                  </div>
                )}
              </div>
            ) : creativeMode === 'url' ? (
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Front HTTPS URL</Label>
                  <Input
                    value={frontUrl}
                    onChange={(e) => setFrontUrl(e.target.value)}
                    placeholder="https://…/front.png"
                    className="bg-white text-slate-900 border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Back HTTPS URL</Label>
                  <Input
                    value={backUrl}
                    onChange={(e) => setBackUrl(e.target.value)}
                    placeholder="https://…/back.png"
                    className="bg-white text-slate-900 border-slate-300"
                  />
                </div>
                {(frontUrl || backUrl) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Front preview</p>
                      {frontUrl && !/\.pdf(\?|$)/i.test(frontUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={frontUrl} alt="Front URL" className="w-full h-40 object-contain bg-white" />
                      ) : frontUrl ? (
                        <a href={frontUrl} target="_blank" rel="noreferrer" className="block text-xs text-emerald-800 underline px-2 py-3 break-all">
                          Open front PDF
                        </a>
                      ) : null}
                    </div>
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Back preview</p>
                      {backUrl && !/\.pdf(\?|$)/i.test(backUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={backUrl} alt="Back URL" className="w-full h-40 object-contain bg-white" />
                      ) : backUrl ? (
                        <a href={backUrl} target="_blank" rel="noreferrer" className="block text-xs text-emerald-800 underline px-2 py-3 break-all">
                          Open back PDF
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ) : creativeMode === 'template' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Template pack</Label>
                  <Select
                    value={templateId}
                    onValueChange={(id) => {
                      setTemplateId(id);
                      applyTemplateToEditor(id);
                    }}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900">
                      {(builtInTemplates.length
                        ? builtInTemplates
                        : [
                            { id: 'builtin-emerald-4x6', name: 'Emerald partnership (4x6)', description: '', size: '4x6' },
                            { id: 'builtin-slate-4x6', name: 'Slate professional (4x6)', description: '', size: '4x6' },
                            { id: 'builtin-coral-6x9', name: 'Warm highlight (6x9)', description: '', size: '6x9' },
                          ]
                      ).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Edit the front/back text below, or use <strong>Rewrite with AI</strong> above. Keep {'{{name}}'} for personalization.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-800">Edit front</Label>
                    <Textarea
                      value={frontHtml}
                      onChange={(e) => setFrontHtml(e.target.value)}
                      rows={7}
                      className="font-mono text-xs bg-white text-slate-900 border-slate-300"
                      placeholder="Template front HTML loads here…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-800">Edit back</Label>
                    <Textarea
                      value={backHtml}
                      onChange={(e) => setBackHtml(e.target.value)}
                      rows={7}
                      className="font-mono text-xs bg-white text-slate-900 border-slate-300"
                      placeholder="Template back HTML loads here…"
                    />
                  </div>
                </div>
                {selectedTemplatePreview ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">
                        Front preview — {selectedTemplatePreview.name}
                      </p>
                      <iframe
                        title="Template front preview"
                        sandbox=""
                        srcDoc={selectedTemplatePreview.front}
                        className="w-full h-48 bg-white"
                      />
                    </div>
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Back preview</p>
                      <iframe
                        title="Template back preview"
                        sandbox=""
                        srcDoc={selectedTemplatePreview.back}
                        className="w-full h-48 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800">
                    Preview loading… pick a template or reopen Send mail.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Front HTML</Label>
                  <Textarea
                    value={frontHtml}
                    onChange={(e) => setFrontHtml(e.target.value)}
                    rows={5}
                    className="font-mono text-xs bg-white text-slate-900 border-slate-300"
                    placeholder="Use Design with AI, or paste Lob-ready HTML…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Back HTML</Label>
                  <Textarea
                    value={backHtml}
                    onChange={(e) => setBackHtml(e.target.value)}
                    rows={5}
                    className="font-mono text-xs bg-white text-slate-900 border-slate-300"
                    placeholder="Keep bottom-right clear for Lob address zone…"
                  />
                </div>
                {(frontHtml || backHtml) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Front preview</p>
                      <iframe
                        title="Front preview"
                        sandbox=""
                        srcDoc={frontHtml}
                        className="w-full h-40 bg-white"
                      />
                    </div>
                    <div className="rounded border border-slate-200 overflow-hidden bg-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Back preview</p>
                      <iframe
                        title="Back preview"
                        sandbox=""
                        srcDoc={backHtml}
                        className="w-full h-40 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
              onClick={() => setMailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={
                sendingMail ||
                !selected.size ||
                !lobConfigured ||
                (mailUsage != null && mailUsage.remaining <= 0) ||
                (mailType === 'postcard' &&
                  ((creativeMode === 'upload' || creativeMode === 'url') && (!frontUrl || !backUrl))) ||
                (mailType === 'postcard' &&
                  (creativeMode === 'ai_html' || creativeMode === 'template') &&
                  (!frontHtml || !backHtml))
              }
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
