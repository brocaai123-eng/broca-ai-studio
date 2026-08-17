/**
 * Lob physical mail client (letters + postcards).
 * Stubbed until LOB_API_KEY is configured — APIs and UI are ready to wire.
 * Docs: https://docs.lob.com/
 */

export type LobMailType = 'letter' | 'postcard';

/** Lob postcard sizes (API enum). */
export type LobPostcardSize = '4x6' | '6x9' | '6x11';

export const LOB_POSTCARD_SIZES: LobPostcardSize[] = ['4x6', '6x9', '6x11'];

/** Print artboard (with bleed) for uploaded PDF/PNG/JPG at 300 DPI. */
export const LOB_POSTCARD_ARTBOARD: Record<
  LobPostcardSize,
  { widthIn: number; heightIn: number; widthPx: number; heightPx: number; label: string }
> = {
  '4x6': { widthIn: 4.25, heightIn: 6.25, widthPx: 1275, heightPx: 1875, label: '4.25" × 6.25" @ 300 DPI' },
  '6x9': { widthIn: 6.25, heightIn: 9.25, widthPx: 1875, heightPx: 2775, label: '6.25" × 9.25" @ 300 DPI' },
  '6x11': { widthIn: 6.25, heightIn: 11.25, widthPx: 1875, heightPx: 3375, label: '6.25" × 11.25" @ 300 DPI' },
};

export function parsePostcardSize(value: unknown): LobPostcardSize {
  if (value === '6x9' || value === '6x11' || value === '4x6') return value;
  return '4x6';
}

/** True if value is an HTTPS URL or Lob tmpl_ id Lob can fetch/use as creative. */
export function isLobCreativeAsset(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^tmpl_[a-zA-Z0-9]+$/i.test(v)) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface LobAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country?: string;
}

export interface LobSendResult {
  ok: boolean;
  configured: boolean;
  lob_id?: string;
  status?: string;
  url?: string;
  error?: string;
}

export function isLobConfigured(): boolean {
  return Boolean(process.env.LOB_API_KEY?.trim());
}

/** Monthly send cap (default 5900 to stay under free-plan usage). */
export function getLobMonthlyLimit(): number {
  const n = Number(process.env.LOB_MONTHLY_LIMIT || 5900);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5900;
}

export function currentMonthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function lobFromAddressId(): string | undefined {
  const id = process.env.LOB_FROM_ADDRESS_ID?.trim();
  return id || undefined;
}

export function envFromAddress(): LobAddress | null {
  const name = process.env.LOB_FROM_NAME?.trim();
  const line1 = process.env.LOB_FROM_ADDRESS_LINE1?.trim();
  const city = process.env.LOB_FROM_CITY?.trim();
  const state = process.env.LOB_FROM_STATE?.trim();
  const zip = process.env.LOB_FROM_ZIP?.trim();
  if (!name || !line1 || !city || !state || !zip) return null;
  return {
    name,
    address_line1: line1,
    address_line2: process.env.LOB_FROM_ADDRESS_LINE2?.trim() || undefined,
    address_city: city,
    address_state: state,
    address_zip: zip,
    address_country: 'US',
  };
}

export function getFromAddress(): LobAddress | null {
  if (lobFromAddressId()) return null;
  return envFromAddress();
}

export function parseLobAddress(input: unknown): LobAddress | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const name = String(o.name || '').trim();
  const address_line1 = String(o.address_line1 || o.line1 || '').trim();
  const address_city = String(o.address_city || o.city || '').trim();
  const address_state = String(o.address_state || o.state || '').trim().toUpperCase();
  const address_zip = String(o.address_zip || o.zip || '').replace(/\D/g, '').slice(0, 10);
  const address_line2 = String(o.address_line2 || o.line2 || '').trim() || undefined;
  if (!name || !address_line1 || !address_city || !address_state || address_zip.length < 5) return null;
  return {
    name,
    address_line1,
    address_line2,
    address_city,
    address_state,
    address_zip,
    address_country: 'US',
  };
}

/** Format from address for admin UI preview */
export function getFromAddressPreview(): {
  configured: boolean;
  address_id?: string;
  label: string | null;
  fields: {
    name: string;
    address_line1: string;
    address_line2: string;
    address_city: string;
    address_state: string;
    address_zip: string;
  };
} {
  const env = envFromAddress();
  const fields = {
    name: env?.name || '',
    address_line1: env?.address_line1 || '',
    address_line2: env?.address_line2 || '',
    address_city: env?.address_city || '',
    address_state: env?.address_state || '',
    address_zip: env?.address_zip || '',
  };
  const addressId = lobFromAddressId();
  if (addressId) {
    return {
      configured: isLobConfigured(),
      address_id: addressId,
      label: env ? `${env.name} · ${[env.address_line1, env.address_city, env.address_state, env.address_zip].filter(Boolean).join(', ')}` : `Saved Lob address (${addressId})`,
      fields,
    };
  }
  if (!env) {
    return { configured: isLobConfigured(), label: null, fields };
  }
  const line = [env.address_line1, env.address_line2, env.address_city, env.address_state, env.address_zip]
    .filter(Boolean)
    .join(', ');
  return {
    configured: isLobConfigured(),
    label: `${env.name} · ${line}`,
    fields,
  };
}

/** Wrap a PNG/JPG data URL as full-bleed postcard HTML (no storage required). */
export function postcardHtmlFromImageData(dataUrl: string, size: LobPostcardSize): string {
  const art = LOB_POSTCARD_ARTBOARD[size];
  const src = dataUrl.replace(/"/g, '');
  return `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:${art.widthIn}in;height:${art.heightIn}in;">
<img src="${src}" alt="" width="100%" height="100%" style="width:100%;height:100%;object-fit:cover;display:block;border:0;" />
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Turn plain client message text into Lob-ready HTML.
 * Supports {{name}} placeholder (left as-is for later personalization).
 */
export function plainTextToMailHtml(text: string, opts?: { postcard?: boolean }): string {
  const raw = (text || '').trim();
  const safe = escapeHtml(raw || ' ');
  // Keep {{name}} usable after escape (braces/name are fine); restore if user typed HTML entities somehow
  const withBreaks = safe.replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
  if (opts?.postcard) {
    return `<html><body style="font-family:Georgia,serif;font-size:14pt;padding:24px;text-align:center;">${withBreaks}</body></html>`;
  }
  return `<html><body style="font-family:Georgia,serif;font-size:12pt;line-height:1.5;padding:0.6in;">${withBreaks}</body></html>`;
}

/**
 * Send a physical letter or postcard via Lob.
 * Returns a clear "not configured" result until LOB_API_KEY is set.
 */
export async function sendPhysicalMail(opts: {
  mailType: LobMailType;
  to: LobAddress;
  description?: string;
  /** HTML body for letters; front HTML/URL/tmpl for postcards */
  frontOrBody: string;
  /** Back HTML/URL/tmpl for postcards */
  back?: string;
  /** Postcard size (ignored for letters) */
  postcardSize?: LobPostcardSize;
  /** Overrides env from-address when provided */
  from?: LobAddress;
}): Promise<LobSendResult> {
  if (!isLobConfigured()) {
    return {
      ok: false,
      configured: false,
      error: 'LOB_API_KEY is not configured. Add it to environment variables to enable physical mail.',
    };
  }

  const apiKey = process.env.LOB_API_KEY!;
  const fromAddress = getFromAddress();
  const from = opts.from || lobFromAddressId() || fromAddress;

  if (!from) {
    return {
      ok: false,
      configured: true,
      error: 'From address is missing. Enter sender name and street address in the mail dialog.',
    };
  }

  try {
    const endpoint =
      opts.mailType === 'postcard'
        ? 'https://api.lob.com/v1/postcards'
        : 'https://api.lob.com/v1/letters';

    const size = parsePostcardSize(opts.postcardSize);

    const body: Record<string, unknown> =
      opts.mailType === 'postcard'
        ? {
            description: opts.description || 'Provider outreach',
            to: opts.to,
            from,
            front: opts.frontOrBody,
            back: opts.back || opts.frontOrBody,
            use_type: 'marketing',
            size,
          }
        : {
            description: opts.description || 'Provider outreach',
            to: opts.to,
            from,
            file: opts.frontOrBody,
            color: false,
            use_type: 'marketing',
          };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      const lobMsg =
        json?.error?.message ||
        json?.error?.error?.message ||
        (typeof json?.error === 'string' ? json.error : null) ||
        `Lob API error ${res.status}`;
      console.error('[lob]', res.status, JSON.stringify(json?.error || json));
      return {
        ok: false,
        configured: true,
        error: lobMsg,
      };
    }

    return {
      ok: true,
      configured: true,
      lob_id: json.id,
      status: json.status || 'queued',
      url: json.url,
    };
  } catch (e: any) {
    return {
      ok: false,
      configured: true,
      error: e?.message || 'Lob request failed',
    };
  }
}

export function providerToLobAddress(p: {
  provider_org_name?: string | null;
  provider_first_name?: string | null;
  provider_last_name?: string | null;
  entity_type?: string;
  practice_address_1?: string | null;
  practice_address_2?: string | null;
  practice_city?: string | null;
  practice_state?: string | null;
  practice_zip?: string | null;
  mailing_address_1?: string | null;
  mailing_address_2?: string | null;
  mailing_city?: string | null;
  mailing_state?: string | null;
  mailing_zip?: string | null;
}, source: 'practice' | 'mailing' = 'practice'): LobAddress | null {
  const name =
    p.entity_type === '2'
      ? p.provider_org_name || 'Provider'
      : [p.provider_first_name, p.provider_last_name].filter(Boolean).join(' ') || 'Provider';

  if (source === 'mailing') {
    if (!p.mailing_address_1 || !p.mailing_city || !p.mailing_state || !p.mailing_zip) return null;
    return {
      name,
      address_line1: p.mailing_address_1,
      address_line2: p.mailing_address_2 || undefined,
      address_city: p.mailing_city,
      address_state: p.mailing_state,
      address_zip: p.mailing_zip,
      address_country: 'US',
    };
  }

  if (!p.practice_address_1 || !p.practice_city || !p.practice_state || !p.practice_zip) return null;
  return {
    name,
    address_line1: p.practice_address_1,
    address_line2: p.practice_address_2 || undefined,
    address_city: p.practice_city,
    address_state: p.practice_state,
    address_zip: p.practice_zip,
    address_country: 'US',
  };
}
