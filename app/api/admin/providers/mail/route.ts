import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, adminSupabase } from '@/lib/admin-auth';
import { getProvider } from '@/lib/services/nppes';
import { isLobConfigured, providerToLobAddress, sendPhysicalMail } from '@/lib/mail/lob';

export const maxDuration = 60;

/** List recent mail sends */
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

  return NextResponse.json({
    configured: isLobConfigured(),
    rows: data || [],
  });
}

/**
 * Send physical mail (letter/postcard) via Lob.
 * Works end-to-end once LOB_API_KEY (+ from address) is set.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const npis: string[] = Array.isArray(body.npis) ? body.npis.map(String) : [];
    const mailType = body.mail_type === 'postcard' ? 'postcard' : 'letter';
    const addressSource = body.address_source === 'mailing' ? 'mailing' : 'practice';
    const templateLabel = String(body.template_label || 'Default outreach').slice(0, 120);
    const html = String(
      body.html ||
        `<html><body style="font-family:Georgia,serif;padding:40px;"><p>Hello {{name}},</p><p>We would like to connect with your practice regarding opportunities in your area.</p><p>Best regards,<br/>BrocaAI</p></body></html>`,
    );

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

    const results: Array<{ npi: string; ok: boolean; lob_id?: string; error?: string }> = [];

    for (const npi of npis) {
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

      const personalized = html.replace(/\{\{name\}\}/gi, to.name);
      const send = await sendPhysicalMail({
        mailType,
        to,
        description: `${templateLabel} — ${npi}`,
        frontOrBody: personalized,
        back: body.back_html || personalized,
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
        error: send.error,
      });
    }

    const successCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      configured: true,
      success_count: successCount,
      fail_count: results.length - successCount,
      results,
    });
  } catch (e: any) {
    console.error('[admin/providers/mail]', e);
    return NextResponse.json({ error: e?.message || 'Mail send failed' }, { status: 500 });
  }
}
