import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminSupabase } from '@/lib/admin-auth';
import { getProvider } from '@/lib/services/nppes';
import {
  currentMonthStartISO,
  getFromAddressPreview,
  getLobMonthlyLimit,
  isLobConfigured,
  isLobCreativeAsset,
  parseAddressPlacement,
  parseLobAddress,
  parsePostcardSize,
  plainTextToMailHtml,
  providerToLobAddress,
  sendPhysicalMail,
  syncPostcardHtmlArtboard,
  type LobAddress,
} from '@/lib/mail/lob';
import { getBuiltInPostcardTemplate } from '@/lib/mail/postcard-templates';

export const maxDuration = 60;

async function getMonthlyMailUsage() {
  const limit = getLobMonthlyLimit();
  const since = currentMonthStartISO();
  const { count, error } = await adminSupabase
    .from('provider_mail_sends')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)
    .neq('status', 'failed');

  if (error) throw new Error(error.message);
  const used = count || 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    month_start: since,
  };
}

function personalizeCreative(value: string, toName: string, from?: LobAddress | null): string {
  if (isLobCreativeAsset(value)) return value;
  const fromName = from?.name?.trim() || 'Broca AI';
  const fromAddr = from
    ? [from.address_line1, from.address_line2, from.address_city, from.address_state, from.address_zip]
        .filter(Boolean)
        .join(', ')
    : '';
  const cleanTo = String(toName || '')
    .replace(/^@+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim() || toName;
  // Fix AI mistakes like "Dear @{{name}}" or "Dear @ Name"
  let out = value.replace(/@\{\{name\}\}/gi, '{{name}}').replace(/Dear\s+@\s+/gi, 'Dear ');
  return out
    .replace(/\{\{name\}\}/gi, cleanTo)
    .replace(/\{\{from_name\}\}/gi, fromName)
    .replace(/\{\{from_address\}\}/gi, fromAddr);
}

/** Resolve postcard front/back from creative mode. */
async function resolvePostcardCreatives(body: any): Promise<{
  front: string;
  back: string;
  label: string;
}> {
  const mode = String(body.creative_mode || 'plain');
  const size = parsePostcardSize(body.postcard_size || body.size);

  const syncHtml = (html: string) => syncPostcardHtmlArtboard(html, size);

  if (mode === 'upload' || mode === 'url') {
    const front = String(body.front_url || body.front || '').trim();
    const back = String(body.back_url || body.back || '').trim();
    const frontHtml = String(body.front_html || '').trim();
    const backHtml = String(body.back_html || '').trim();
    if (frontHtml && backHtml) {
      return {
        front: syncHtml(frontHtml),
        back: syncHtml(backHtml),
        label: String(body.template_label || 'Uploaded design').slice(0, 120),
      };
    }
    if (isLobCreativeAsset(front) && isLobCreativeAsset(back)) {
      return { front, back, label: String(body.template_label || 'Designed postcard').slice(0, 120) };
    }
    if (frontHtml && isLobCreativeAsset(back)) {
      return {
        front: syncHtml(frontHtml),
        back,
        label: String(body.template_label || 'Uploaded design').slice(0, 120),
      };
    }
    if (isLobCreativeAsset(front) && backHtml) {
      return {
        front,
        back: syncHtml(backHtml),
        label: String(body.template_label || 'Uploaded design').slice(0, 120),
      };
    }
    throw new Error('Upload a front and back design (PNG/JPG/PDF) or paste HTTPS image URLs.');
  }

  if (mode === 'template') {
    const templateId = String(body.template_id || '');
    const builtin = getBuiltInPostcardTemplate(templateId);
    if (builtin) {
      return {
        front: syncHtml(builtin.front_html),
        back: syncHtml(builtin.back_html),
        label: builtin.name,
      };
    }
    const { data, error } = await adminSupabase
      .from('postcard_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();
    if (error || !data) {
      throw new Error('Postcard template not found');
    }
    const frontRaw = (data.front_html || data.front_url || '').trim();
    const backRaw = (data.back_html || data.back_url || '').trim();
    if (!frontRaw || !backRaw) throw new Error('Template missing front/back creative');
    const front = isLobCreativeAsset(frontRaw) ? frontRaw : syncHtml(frontRaw);
    const back = isLobCreativeAsset(backRaw) ? backRaw : syncHtml(backRaw);
    return { front, back, label: data.name || 'Saved template' };
  }

  if (mode === 'ai_html' || mode === 'html') {
    const front = String(body.front_html || body.front || '').trim();
    const back = String(body.back_html || body.back || '').trim();
    if (!front || !back) throw new Error('HTML postcard requires front_html and back_html');
    return {
      front: isLobCreativeAsset(front) ? front : syncHtml(front),
      back: isLobCreativeAsset(back) ? back : syncHtml(back),
      label: String(body.template_label || 'AI HTML postcard').slice(0, 120),
    };
  }

  // plain text → HTML sized to selected artboard
  const frontText = String(body.front || body.message || '').trim();
  const backText = String(body.back || frontText).trim();
  return {
    front: plainTextToMailHtml(frontText || 'Hello {{name}}', { postcard: true, postcardSize: size }),
    back: plainTextToMailHtml(backText || frontText || 'Thank you.', { postcard: true, postcardSize: size }),
    label: String(body.template_label || `Plain postcard ${size}`).slice(0, 120),
  };
}

/** List recent mail sends + monthly quota */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { data, error } = await adminSupabase
    .from('provider_mail_sends')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let usage = {
    used: 0,
    limit: getLobMonthlyLimit(),
    remaining: getLobMonthlyLimit(),
    month_start: currentMonthStartISO(),
  };
  try {
    usage = await getMonthlyMailUsage();
  } catch {
    /* ignore usage errors on list */
  }

  return NextResponse.json({
    configured: isLobConfigured(),
    from: getFromAddressPreview(),
    usage,
    rows: data || [],
  });
}

/**
 * Send physical mail (letter/postcard) via Lob.
 * Postcards support plain text, upload/URL designs, saved templates, and AI HTML.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const npis: string[] = Array.isArray(body.npis) ? body.npis.map(String) : [];
    const mailType = body.mail_type === 'postcard' ? 'postcard' : 'letter';
    const addressSource = body.address_source === 'mailing' ? 'mailing' : 'practice';
    const postcardSize = parsePostcardSize(body.postcard_size || body.size);
    const addressPlacement = parseAddressPlacement(body.address_placement);

    const fromOverride = parseLobAddress(body.from);
    const toOverride = parseLobAddress(body.to_override);

    if (!npis.length && !toOverride) {
      return NextResponse.json({ error: 'Select at least one provider or enter a recipient address' }, { status: 400 });
    }
    if (npis.length > 50) {
      return NextResponse.json({ error: 'Max 50 providers per send batch' }, { status: 400 });
    }

    if (
      mailType === 'postcard' &&
      body.creative_mode &&
      body.creative_mode !== 'plain' &&
      body.back_address_zone_clear !== true &&
      body.back_address_zone_clear !== '1' &&
      body.back_address_zone_clear !== 'true'
    ) {
      return NextResponse.json(
        {
          error:
            'Confirm the postcard back keeps Lob’s bottom-right address/postage zone clear (no text, QR, or logos there), then check the confirmation box.',
        },
        { status: 400 },
      );
    }

    if (!isLobConfigured()) {
      return NextResponse.json(
        {
          error: 'Lob is not configured yet. Add LOB_API_KEY to enable physical mail.',
          configured: false,
        },
        { status: 503 },
      );
    }

    const usage = await getMonthlyMailUsage().catch(() => ({
      used: 0,
      limit: getLobMonthlyLimit(),
      remaining: getLobMonthlyLimit(),
      month_start: currentMonthStartISO(),
    }));
    if (usage.remaining <= 0) {
      return NextResponse.json(
        {
          error: `Monthly Lob mail limit reached (${usage.used}/${usage.limit}). Sending is paused until next month.`,
          configured: true,
          usage,
        },
        { status: 429 },
      );
    }
    const sendTargets: string[] = npis.length ? npis : ['manual'];
    if (sendTargets.length > usage.remaining) {
      return NextResponse.json(
        {
          error: `This batch would exceed the monthly limit. You can send ${usage.remaining} more this month (used ${usage.used}/${usage.limit}).`,
          configured: true,
          usage,
        },
        { status: 429 },
      );
    }

    let letterHtml = '';
    let postcardFront = '';
    let postcardBack = '';
    let templateLabel = String(body.template_label || 'Default outreach').slice(0, 120);

    if (mailType === 'postcard') {
      const resolved = await resolvePostcardCreatives(body);
      postcardFront = resolved.front;
      postcardBack = resolved.back;
      templateLabel = resolved.label;
    } else {
      const messageText = typeof body.message === 'string' ? body.message : '';
      letterHtml = messageText
        ? plainTextToMailHtml(messageText, { addressPlacement })
        : String(
            body.html ||
              plainTextToMailHtml(
                'Hello {{name}},\n\nWe would like to connect with your practice regarding opportunities in your area.\n\nBest regards',
                { addressPlacement },
              ),
          );
    }

    const results: Array<{
      npi: string;
      ok: boolean;
      lob_id?: string;
      url?: string;
      error?: string;
    }> = [];

    for (const npi of sendTargets) {
      if (results.filter((r) => r.ok).length >= usage.remaining) {
        results.push({ npi, ok: false, error: 'Monthly Lob limit reached mid-batch' });
        continue;
      }

      let to: LobAddress | null = toOverride;
      if (!to && npi !== 'manual') {
        const provider = await getProvider(npi);
        if (!provider) {
          results.push({ npi, ok: false, error: 'Provider not found' });
          continue;
        }
        to = providerToLobAddress(provider, addressSource);
      }
      if (!to) {
        results.push({ npi, ok: false, error: `Missing ${addressSource} address — enter an address manually` });
        continue;
      }

      const frontOrBody =
        mailType === 'postcard'
          ? personalizeCreative(postcardFront, to.name, fromOverride)
          : personalizeCreative(letterHtml, to.name, fromOverride);
      const back =
        mailType === 'postcard' ? personalizeCreative(postcardBack, to.name, fromOverride) : undefined;

      const send = await sendPhysicalMail({
        mailType,
        to,
        from: fromOverride || undefined,
        description: `${templateLabel} — ${npi}`,
        frontOrBody,
        back,
        postcardSize,
        addressPlacement: mailType === 'letter' ? addressPlacement : undefined,
      });

      await adminSupabase.from('provider_mail_sends').insert({
        admin_user_id: auth.userId,
        npi: npi === 'manual' ? 'manual' : npi,
        lob_id: send.lob_id || null,
        mail_type: mailType,
        status: send.ok ? (send.status === 'processed' ? 'queued' : send.status || 'queued') : 'failed',
        address_source: addressSource,
        to_address: to,
        template_label: templateLabel,
        lob_url: send.url || null,
        error_message: send.error || null,
      });

      results.push({
        npi,
        ok: send.ok,
        lob_id: send.lob_id,
        url: send.url,
        error: send.error,
      });
    }

    const successCount = results.filter((r) => r.ok).length;
    const usageAfter = await getMonthlyMailUsage();
    return NextResponse.json({
      configured: true,
      success_count: successCount,
      fail_count: results.length - successCount,
      usage: usageAfter,
      results,
    });
  } catch (e: any) {
    console.error('[admin/providers/mail]', e);
    return NextResponse.json({ error: e?.message || 'Mail send failed' }, { status: 500 });
  }
}
