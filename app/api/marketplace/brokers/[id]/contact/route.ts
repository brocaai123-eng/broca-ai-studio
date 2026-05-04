import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { senderName, senderEmail, subject, message } = await request.json();

    if (!senderName || !senderEmail || !message) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
    }

    // Resolve broker email — try broker_profiles first, then profiles
    let brokerEmail: string | null = null;
    let brokerName: string | null = null;

    const { data: bp } = await supabase
      .from('broker_profiles')
      .select('contact_email, user_id')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .maybeSingle();

    const userId = bp?.user_id ?? id;
    if (bp?.contact_email) brokerEmail = bp.contact_email;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .eq('role', 'broker')
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    brokerName = profile.full_name;
    if (!brokerEmail) brokerEmail = profile.email;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: brokerEmail as string,
      replyTo: senderEmail,
      subject: subject || `Message from ${senderName} via BrocaAI`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;">
          <h2 style="color:#1a1a1a">New message via BrocaAI Broker Directory</h2>
          <p><strong>From:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
          <p style="white-space:pre-wrap">${message}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
          <p style="color:#999;font-size:12px">Reply directly to this email to respond to ${senderName}.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Broker contact error:', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
