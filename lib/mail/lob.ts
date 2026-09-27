/**
 * Lob physical mail client (letters + postcards).
 * Stubbed until LOB_API_KEY is configured — APIs and UI are ready to wire.
 * Docs: https://docs.lob.com/
 */

export type LobMailType = 'letter' | 'postcard';

/** Default sender name on letters/postcards (AI + templates resolve {{from_name}} to this). */
export const DEFAULT_MAIL_FROM_NAME = 'Broca AI';

/** Lob postcard sizes (API enum). */
export type LobPostcardSize = '4x6' | '6x9' | '6x11';

export const LOB_POSTCARD_SIZES: LobPostcardSize[] = ['4x6', '6x9', '6x11'];

/** Print artboard (with bleed) for uploaded PDF/PNG/JPG at 300 DPI.
 * Lob `4x6` is landscape (6"×4" finished → 6.25"×4.25" with bleed).
 * `6x9` / `6x11` are portrait (taller than wide).
 */
export const LOB_POSTCARD_ARTBOARD: Record<
  LobPostcardSize,
  { widthIn: number; heightIn: number; widthPx: number; heightPx: number; label: string; orientation: 'landscape' | 'portrait' }
> = {
  '4x6': {
    widthIn: 6.25,
    heightIn: 4.25,
    widthPx: 1875,
    heightPx: 1275,
    label: '6.25" × 4.25" landscape @ 300 DPI',
    orientation: 'landscape',
  },
  '6x9': {
    widthIn: 6.25,
    heightIn: 9.25,
    widthPx: 1875,
    heightPx: 2775,
    label: '6.25" × 9.25" portrait @ 300 DPI',
    orientation: 'portrait',
  },
  '6x11': {
    widthIn: 6.25,
    heightIn: 11.25,
    widthPx: 1875,
    heightPx: 3375,
    label: '6.25" × 11.25" portrait @ 300 DPI',
    orientation: 'portrait',
  },
};

export function parsePostcardSize(value: unknown): LobPostcardSize {
  if (value === '6x9' || value === '6x11' || value === '4x6') return value;
  return '4x6';
}

/** Lob letter page + address window (top_first_page). Dimensions in inches. */
export const LOB_LETTER_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  /** Content starts below Lob's injected from/to + barcode block. */
  contentTopIn: 2.95,
  sideMarginIn: 0.65,
  bottomMarginIn: 0.65,
  addressWindow: { leftIn: 0.6, topIn: 0.84, widthIn: 3.15, heightIn: 2 },
} as const;

export type LobAddressPlacement = 'top_first_page' | 'insert_blank_page';

export function parseAddressPlacement(value: unknown): LobAddressPlacement {
  return value === 'insert_blank_page' ? 'insert_blank_page' : 'top_first_page';
}

/**
 * Postcard back ink-free address/postage zone (inches from artboard edges).
 * Lob: 4x6 block ~3.2835×2.375", 0.275" from right, 0.25" from bottom (incl. bleed).
 * Other sizes: 4.0×2.375", same edge offsets.
 */
export function postcardBackAddressZone(size: LobPostcardSize): {
  widthIn: number;
  heightIn: number;
  rightIn: number;
  bottomIn: number;
} {
  const rightIn = 0.275;
  const bottomIn = 0.25;
  if (size === '4x6') {
    return { widthIn: 3.2835, heightIn: 2.375, rightIn, bottomIn };
  }
  return { widthIn: 4.0, heightIn: 2.375, rightIn, bottomIn };
}

/** Pixel tolerance when validating uploaded PNG/JPG against artboard. */
export const POSTCARD_DIM_TOLERANCE_PX = 40;
/** Aspect-ratio tolerance: same orientation as Lob size can be auto-fitted via HTML wrap. */
export const POSTCARD_ASPECT_TOLERANCE = 0.04;

export function validatePostcardImageDimensions(
  widthPx: number,
  heightPx: number,
  size: LobPostcardSize,
): {
  ok: boolean;
  exact: boolean;
  softFit: boolean;
  expected: { widthPx: number; heightPx: number; label: string };
  message?: string;
  warning?: string;
} {
  const art = LOB_POSTCARD_ARTBOARD[size];
  const expected = { widthPx: art.widthPx, heightPx: art.heightPx, label: art.label };
  const dw = Math.abs(widthPx - art.widthPx);
  const dh = Math.abs(heightPx - art.heightPx);
  if (dw <= POSTCARD_DIM_TOLERANCE_PX && dh <= POSTCARD_DIM_TOLERANCE_PX) {
    return { ok: true, exact: true, softFit: false, expected };
  }

  const imgAspect = widthPx / Math.max(1, heightPx);
  const artAspect = art.widthPx / art.heightPx;
  const aspectOk = Math.abs(imgAspect - artAspect) <= POSTCARD_ASPECT_TOLERANCE;

  if (aspectOk) {
    return {
      ok: true,
      exact: false,
      softFit: true,
      expected,
      warning: `Image is ${widthPx}×${heightPx}px (Lob ideal ${art.widthPx}×${art.heightPx}). Same aspect — we'll fit it into the ${size} artboard. For sharpest print, re-export at ${art.widthPx}×${art.heightPx}px.`,
    };
  }

  return {
    ok: false,
    exact: false,
    softFit: false,
    expected,
    message: `Image is ${widthPx}×${heightPx}px; Lob ${size} needs ${art.widthPx}×${art.heightPx}px (${art.label}). Wrong aspect ratio — pick the matching size (portrait flyers → 6x9; landscape → 4x6) or re-export.`,
  };
}

/** Read PNG/JPEG width×height from file bytes (no native deps). */
export function readImageDimensions(
  buffer: Buffer | Uint8Array | ArrayBuffer,
): { width: number; height: number } | null {
  let bytes: Uint8Array;
  if (buffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(buffer);
  } else if (buffer instanceof Uint8Array) {
    bytes = buffer;
  } else {
    // Node Buffer
    bytes = new Uint8Array(buffer as Buffer);
  }
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width > 0 && height > 0) return { width, height };
    return null;
  }
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset + 2);
      // SOF0 / SOF1 / SOF2
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = view.getUint16(offset + 5);
        const width = view.getUint16(offset + 7);
        if (width > 0 && height > 0) return { width, height };
        return null;
      }
      offset += 2 + length;
    }
  }
  return null;
}

/**
 * Force HTML postcard body width/height to match selected Lob artboard.
 * Fixes size desync when AI/template HTML was authored for a different size.
 */
export function syncPostcardHtmlArtboard(html: string, size: LobPostcardSize): string {
  const art = LOB_POSTCARD_ARTBOARD[size];
  const w = `${art.widthIn}in`;
  const h = `${art.heightIn}in`;
  let out = html;
  // Prefer rewriting existing body width/height declarations
  if (/<body\b[^>]*>/i.test(out)) {
    out = out.replace(/<body\b([^>]*)>/i, (_m, attrs: string) => {
      let a = attrs;
      if (/style\s*=/i.test(a)) {
        a = a.replace(/style\s*=\s*(["'])([\s\S]*?)\1/i, (_sm, q: string, style: string) => {
          let s = style
            .replace(/width\s*:\s*[^;]+;?/gi, '')
            .replace(/height\s*:\s*[^;]+;?/gi, '')
            .replace(/margin\s*:\s*[^;]+;?/gi, '');
          s = `margin:0;width:${w};height:${h};${s}`.replace(/;;+/g, ';');
          return `style=${q}${s}${q}`;
        });
      } else {
        a = `${a} style="margin:0;width:${w};height:${h};"`;
      }
      return `<body${a}>`;
    });
    return out;
  }
  return `<html><head><meta charset="utf-8"/></head><body style="margin:0;width:${w};height:${h};">${out}</body></html>`;
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

/** Strip stray "@" prefixes from mail names (AI / bad data). */
function sanitizeMailDisplayName(raw: string | null | undefined, fallback = 'Provider'): string {
  let name = String(raw || '')
    .replace(/^@+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  name = name.replace(/(^|\s)@(?=[A-Za-z0-9])/g, '$1').replace(/\s+/g, ' ').trim();
  return name || fallback;
}

function sanitizeLobAddress(addr: LobAddress | null | undefined): Record<string, string> | null {
  if (!addr) return null;
  const name = sanitizeMailDisplayName(addr.name?.trim(), '');
  const address_line1 = addr.address_line1?.trim();
  const address_city = addr.address_city?.trim();
  const address_state = addr.address_state?.trim();
  const address_zip = String(addr.address_zip || '').replace(/\D/g, '').slice(0, 10);
  if (!name || !address_line1 || !address_city || !address_state || address_zip.length < 5) return null;
  const out: Record<string, string> = {
    name,
    address_line1,
    address_city,
    address_state,
    address_zip,
    address_country: addr.address_country || 'US',
  };
  const line2 = addr.address_line2?.trim();
  if (line2) out.address_line2 = line2;
  return out;
}

function mapLobStatus(status?: string): string {
  const s = (status || 'queued').toLowerCase();
  if (['queued', 'processed', 'rendered', 'in_transit', 'delivered', 'returned', 'failed', 'canceled'].includes(s)) {
    return s === 'processed' ? 'queued' : s;
  }
  return 'queued';
}

export function parseLobAddress(input: unknown): LobAddress | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const name = sanitizeMailDisplayName(String(o.name || '').trim(), '');
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

/** Wrap a PNG/JPG URL or data URL as postcard HTML sized to Lob artboard (contain — no crop).
 * Prefer this over raw image URLs so Lob does not reject non-exact pixel dimensions.
 */
export function postcardHtmlFromImageSrc(src: string, size: LobPostcardSize): string {
  const art = LOB_POSTCARD_ARTBOARD[size];
  const safe = src.replace(/"/g, '');
  return `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:${art.widthIn}in;height:${art.heightIn}in;background:#ffffff;">
<div style="width:${art.widthIn}in;height:${art.heightIn}in;display:flex;align-items:center;justify-content:center;overflow:hidden;">
<img src="${safe}" alt="" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;border:0;" />
</div>
</body></html>`;
}

/** @deprecated alias — use postcardHtmlFromImageSrc */
export function postcardHtmlFromImageData(dataUrl: string, size: LobPostcardSize): string {
  return postcardHtmlFromImageSrc(dataUrl, size);
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
 * Letters clear Lob's top_first_page address window (~3in top).
 */
export function plainTextToMailHtml(
  text: string,
  opts?: { postcard?: boolean; postcardSize?: LobPostcardSize; addressPlacement?: LobAddressPlacement },
): string {
  const raw = (text || '').trim();
  const safe = escapeHtml(raw || ' ');
  const withBreaks = safe.replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
  if (opts?.postcard) {
    const size = parsePostcardSize(opts.postcardSize);
    const art = LOB_POSTCARD_ARTBOARD[size];
    return `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:${art.widthIn}in;height:${art.heightIn}in;font-family:Georgia,serif;background:#fff;color:#0f172a;">
<div style="box-sizing:border-box;width:100%;height:100%;padding:0.35in;font-size:13pt;line-height:1.45;text-align:center;overflow:hidden;">${withBreaks}</div>
</body></html>`;
  }

  const L = LOB_LETTER_PAGE;
  const placement = parseAddressPlacement(opts?.addressPlacement);
  // insert_blank_page: Lob adds a blank address page — content can use normal letter margins
  const topPad = placement === 'insert_blank_page' ? L.sideMarginIn : L.contentTopIn;
  const maxContentH = L.heightIn - topPad - L.bottomMarginIn;
  const wordCount = raw.split(/\s+/).filter(Boolean).length;
  const fontSize = wordCount > 220 ? 10.5 : wordCount > 140 ? 11 : 12;
  const lineHeight = wordCount > 180 ? 1.35 : 1.45;

  return `<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;width:${L.widthIn}in;height:${L.heightIn}in;font-family:Georgia,serif;color:#0f172a;background:#fff;">
<div class="page" style="position:relative;box-sizing:border-box;width:${L.widthIn}in;height:${L.heightIn}in;padding:${topPad}in ${L.sideMarginIn}in ${L.bottomMarginIn}in ${L.sideMarginIn}in;">
<div style="box-sizing:border-box;max-height:${maxContentH}in;overflow:hidden;font-size:${fontSize}pt;line-height:${lineHeight};">${withBreaks}</div>
</div>
</body></html>`;
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
  /** Letter address placement (default top_first_page — leave ~3in top clear in HTML) */
  addressPlacement?: LobAddressPlacement;
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
  const from =
    sanitizeLobAddress(opts.from) ||
    lobFromAddressId() ||
    sanitizeLobAddress(fromAddress);

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
    const to = sanitizeLobAddress(opts.to) || opts.to;

    const addressPlacement = parseAddressPlacement(opts.addressPlacement);
    const body: Record<string, unknown> =
      opts.mailType === 'postcard'
        ? {
            description: opts.description || 'Provider outreach',
            to,
            from,
            front: opts.frontOrBody,
            back: opts.back || opts.frontOrBody,
            use_type: 'marketing',
            size,
          }
        : {
            description: opts.description || 'Provider outreach',
            to,
            from,
            file: opts.frontOrBody,
            color: false,
            use_type: 'marketing',
            address_placement: addressPlacement,
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
      status: mapLobStatus(json.status),
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
  const name = sanitizeMailDisplayName(
    p.entity_type === '2'
      ? p.provider_org_name || 'Provider'
      : [p.provider_first_name, p.provider_last_name].filter(Boolean).join(' ') || 'Provider',
  );

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
