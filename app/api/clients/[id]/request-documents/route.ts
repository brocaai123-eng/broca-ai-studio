import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { randomBytes } from 'crypto';
import { sendDocumentRequestEmail } from '@/lib/email/resend';

async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/clients/[id]/request-documents
 * 
 * Request additional documents from a client.
 * Generates a unique upload token & sends email with upload link.
 * 
 * Body: { message?: string, requestedDocuments?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { message, requestedDocuments } = body;

    // Fetch client (must be owned by broker or broker is collaborator)
    let client: { id: string; name: string; email: string; broker_id: string } | null = null;

    const { data: ownedClient } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, broker_id')
      .eq('id', clientId)
      .eq('broker_id', user.id)
      .single();

    if (ownedClient) {
      client = ownedClient;
    } else {
      // Check if collaborator
      const { data: collab } = await supabaseAdmin
        .from('case_collaborators')
        .select('id')
        .eq('client_id', clientId)
        .eq('broker_id', user.id)
        .eq('status', 'active')
        .single();

      if (collab) {
        const { data: collabClient } = await supabaseAdmin
          .from('clients')
          .select('id, name, email, broker_id')
          .eq('id', clientId)
          .single();
        client = collabClient;
      }
    }

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 });
    }

    if (!client.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
    }

    // Get broker info
    const { data: broker } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const brokerName = broker?.full_name || broker?.email || 'Your Broker';

    // Generate a unique document upload token
    const uploadToken = randomBytes(32).toString('hex');

    // Store the document request in the database
    const { data: docRequest, error: insertError } = await supabaseAdmin
      .from('document_requests')
      .insert({
        client_id: clientId,
        broker_id: user.id,
        upload_token: uploadToken,
        message: message || null,
        requested_documents: requestedDocuments || [],
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      // If table doesn't exist yet, fall back to using client's onboarding_token field
      console.warn('document_requests table may not exist, using fallback:', insertError.message);

      // Store token on client record (keep status as valid enum value)
      await supabaseAdmin
        .from('clients')
        .update({
          onboarding_token: uploadToken,
          notes: [
            client.email ? '' : '',
            `[doc_request] message=${message || ''} | docs=${(requestedDocuments || []).join(',')} | token=${uploadToken}`,
          ].filter(Boolean).join('\n'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);
    }

    // Build upload link
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const uploadLink = `${APP_URL}/upload-documents/${uploadToken}`;

    // Send email to client
    try {
      console.log('📧 Sending document request email to:', client.email, 'from broker:', brokerName);
      console.log('📧 Upload link:', uploadLink);
      const emailResult = await sendDocumentRequestEmail({
        to: client.email,
        clientName: client.name,
        brokerName,
        uploadLink,
        message: message || undefined,
        requestedDocuments: requestedDocuments || undefined,
      });
      console.log('📧 Email sent successfully:', emailResult);
    } catch (emailError) {
      console.error('❌ Failed to send document request email:', emailError);
      return NextResponse.json({ error: 'Failed to send email. Check server logs.' }, { status: 500 });
    }

    // Log to timeline if available
    try {
      await supabaseAdmin
        .from('case_timeline')
        .insert({
          client_id: clientId,
          broker_id: user.id,
          event_type: 'document_request',
          title: 'Document Request Sent',
          description: requestedDocuments && requestedDocuments.length > 0
            ? `Requested: ${requestedDocuments.join(', ')}`
            : 'Additional documents requested from client',
        });
    } catch {
      // Timeline logging is optional
    }

    return NextResponse.json({
      success: true,
      uploadLink,
      message: `Document request email sent to ${client.email}`,
    });
  } catch (error) {
    console.error('Error requesting documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
