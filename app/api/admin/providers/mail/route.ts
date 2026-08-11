import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminSupabase } from '@/lib/admin-auth';
import { getProvider } from '@/lib/services/nppes';
import {
  currentMonthStartISO,
  getFromAddressPreview,
  getLobMonthlyLimit,
  isLobConfigured,
  isLobCreativeAsset,
  parsePostcardSize,
  plainTextToMailHtml,
  providerToLobAddress,
  sendPhysicalMail,
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

function personalizeCreative(value: string, name: string): string {
  if (isLobCreativeAsset(value)) return value;
  return value.replace(/\{\{name\}\}/gi, name);
}

/** Resolve postcard front/back from creative mode. */
async function resolvePostcardCreatives(body: any): Promise<{
  front: string;
  back: string;
  label: string;
}> {
  const mode = String(body.creative_mode || 'plain');
  const size = parsePostcardSize(body.postcard_size || body.size);

  if (mode === 'upload' || mode === 'url') {
    const front = String(body.front_url || body.front || '').trim();
    const back = String(body.back_url || body.back || '').trim();
    if (!isLobCreativeAsset(front) || !isLobCreativeAsset(back)) {
      throw new Error('Designed postcard requires HTTPS front_url and back_url (PDF/PNG/JPG)');
    }
    return { front, back, label: String(body.template_label || 'Designed postcard').slice(0, 120) };
  }

  if (mode === 'template') {
    const templateId = String(body.template_id || '');
    const builtin = getBuiltInPostcardTemplate(templateId);
    if (builtin) {
      return {
        front: builtin.front_html,
        back: builtin.back_html,
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
    const front = (data.front_html || data.front_url || '').trim();
    const back = (data.back_html || data.back_url || '').trim();
    if (!front || !back) throw new Error('Template missing front/back creative');
    return { front, back, label: data.name || 'Saved template' };
  }

  if (mode === 'ai_html' || mode === 'html') {
    const front = String(body.front_html || body.front || '').trim();
    const back = String(body.back_html || body.back || '').trim();
    if (!front || !back) throw new Error('HTML postcard requires front_html and back_html');
    return {
      front,
      back,
      label: String(body.template_label || 'AI HTML postcard').slice(0, 120),
    };
  }

  // plain text → HTML
  const frontText = String(body.front || body.message || '').trim();
  const backText = String(body.back || frontText).trim();
  return {
    front: plainTextToMailHtml(frontText || 'Hello {{name}}', { postcard: true }),
    back: plainTextToMailHtml(backText || frontText || 'BrocaAI', { postcard: true }),
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

    if (!npis.length) {
      return NextResponse.json({ error: 'Select at least one provider' }, { status: 400 });
    }
    if (npis.length > 50) {
      return NextResponse.json({ error: 'Max 50 providers per send batch' }, { status: 400 });
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

    const usage = await getMonthlyMailUsage();
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
    if (npis.length > usage.remaining) {
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
        ? plainTextToMailHtml(messageText)
        : String(
            body.html ||
              plainTextToMailHtml(
                'Hello {{name}},\n\nWe would like to connect with your practice regarding opportunities in your area.\n\nBest regards,\nBrocaAI',
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

    for (const npi of npis) {
      if (results.filter((r) => r.ok).length >= usage.remaining) {
        results.push({ npi, ok: false, error: 'Monthly Lob limit reached mid-batch' });
        continue;
      }

      const provider = await getProvider(npi);
      if (!provider) {
        results.push({ npi, ok: false, error: 'Provider not found' });
        continue;
      }

      const to = providerToLobAddress(provider, addressSource);
      if (!to) {
        results.push({ npi, ok: false, error: `Missing ${addressSource} address` });
        continue;
      }

      const frontOrBody =
        mailType === 'postcard'
          ? personalizeCreative(postcardFront, to.name)
          : letterHtml.replace(/\{\{name\}\}/gi, to.name);
      const back =
        mailType === 'postcard' ? personalizeCreative(postcardBack, to.name) : undefined;

      const send = await sendPhysicalMail({
        mailType,
        to,
        description: `${templateLabel} — ${npi}`,
        frontOrBody,
        back,
        postcardSize,
      });

      await adminSupabase.from('provider_mail_sends').insert({
        admin_user_id: auth.userId,
        npi,
        lob_id: send.lob_id || null,
        mail_type: mailType,
        status: send.ok ? send.status || 'queued' : 'failed',
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
