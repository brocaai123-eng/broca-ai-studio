/**
 * Lob physical mail client (letters + postcards).
 * Stubbed until LOB_API_KEY is configured — APIs and UI are ready to wire.
 * Docs: https://docs.lob.com/
 */

export type LobMailType = 'letter' | 'postcard';

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

function getFromAddress(): LobAddress | null {
  if (process.env.LOB_FROM_ADDRESS_ID) {
    // Lob accepts a saved address id string in `from` — handled by caller
    return null;
  }
  const name = process.env.LOB_FROM_NAME;
  const line1 = process.env.LOB_FROM_ADDRESS_LINE1;
  const city = process.env.LOB_FROM_CITY;
  const state = process.env.LOB_FROM_STATE;
  const zip = process.env.LOB_FROM_ZIP;
  if (!name || !line1 || !city || !state || !zip) return null;
  return {
    name,
    address_line1: line1,
    address_line2: process.env.LOB_FROM_ADDRESS_LINE2 || undefined,
    address_city: city,
    address_state: state,
    address_zip: zip,
    address_country: 'US',
  };
}

/**
 * Send a physical letter or postcard via Lob.
 * Returns a clear "not configured" result until LOB_API_KEY is set.
 */
export async function sendPhysicalMail(opts: {
  mailType: LobMailType;
  to: LobAddress;
  description?: string;
  /** HTML body for letters; front HTML for postcards */
  frontOrBody: string;
  /** Back HTML for postcards */
  back?: string;
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
  const from = process.env.LOB_FROM_ADDRESS_ID || fromAddress;

  if (!from) {
    return {
      ok: false,
      configured: true,
      error: 'Lob from-address is missing. Set LOB_FROM_* env vars or LOB_FROM_ADDRESS_ID.',
    };
  }

  try {
    const endpoint =
      opts.mailType === 'postcard'
        ? 'https://api.lob.com/v1/postcards'
        : 'https://api.lob.com/v1/letters';

    const body: Record<string, unknown> =
      opts.mailType === 'postcard'
        ? {
            description: opts.description || 'BrocaAI provider outreach',
            to: opts.to,
            from,
            front: opts.frontOrBody,
            back: opts.back || opts.frontOrBody,
          }
        : {
            description: opts.description || 'BrocaAI provider outreach',
            to: opts.to,
            from,
            file: opts.frontOrBody,
            color: false,
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
      return {
        ok: false,
        configured: true,
        error: json?.error?.message || `Lob API error ${res.status}`,
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
