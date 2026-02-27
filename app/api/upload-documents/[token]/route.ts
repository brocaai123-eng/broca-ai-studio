import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/upload-documents/[token]
 * 
 * Public endpoint - fetches document request info by upload token.
 * Tries document_requests table first, then falls back to client onboarding_token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Try document_requests table first
    const { data: docRequest } = await supabase
      .from('document_requests')
      .select(`
        id, client_id, broker_id, message, requested_documents, status, created_at,
        client:clients!document_requests_client_id_fkey(id, name, email),
        broker:profiles!document_requests_broker_id_fkey(full_name)
      `)
      .eq('upload_token', token)
      .single();

    if (docRequest) {
      if (docRequest.status === 'completed') {
        return NextResponse.json({ error: 'Documents have already been submitted' }, { status: 400 });
      }

      const client = Array.isArray(docRequest.client) ? docRequest.client[0] : docRequest.client;
      const broker = Array.isArray(docRequest.broker) ? docRequest.broker[0] : docRequest.broker;

      return NextResponse.json({
        source: 'document_request',
        requestId: docRequest.id,
        clientId: docRequest.client_id,
        clientName: client?.name || 'Client',
        clientEmail: client?.email || '',
        brokerName: broker?.full_name || 'Your Broker',
        brokerId: docRequest.broker_id,
        message: docRequest.message,
        requestedDocuments: docRequest.requested_documents || [],
        createdAt: docRequest.created_at,
      });
    }

    // Fallback: check client onboarding_token
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email, broker_id, status, notes')
      .eq('onboarding_token', token)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Invalid or expired upload link' }, { status: 404 });
    }

    // Parse any document request metadata from notes
    let fallbackMessage: string | null = null;
    let fallbackDocs: string[] = [];
    if (client.notes) {
      const docRequestMatch = client.notes.match(/\[doc_request\] message=(.*?) \| docs=(.*?) \| token=/);
      if (docRequestMatch) {
        fallbackMessage = docRequestMatch[1] || null;
        fallbackDocs = docRequestMatch[2] ? docRequestMatch[2].split(',').filter(Boolean) : [];
      }
    }

    // Get broker name
    const { data: broker } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', client.broker_id)
      .single();

    return NextResponse.json({
      source: 'client_token',
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      brokerName: broker?.full_name || 'Your Broker',
      brokerId: client.broker_id,
      message: fallbackMessage,
      requestedDocuments: fallbackDocs,
    });
  } catch (error) {
    console.error('Error fetching document request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/upload-documents/[token]
 * 
 * Public endpoint - client submits documents via the upload token.
 * Accepts multipart form data with file uploads.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Resolve clientId and brokerId from token
    let clientId: string | null = null;
    let brokerId: string | null = null;
    let requestId: string | null = null;
    let source: 'document_request' | 'client_token' = 'client_token';

    // Try document_requests table
    const { data: docRequest } = await supabase
      .from('document_requests')
      .select('id, client_id, broker_id, status')
      .eq('upload_token', token)
      .single();

    if (docRequest) {
      if (docRequest.status === 'completed') {
        return NextResponse.json({ error: 'Documents already submitted' }, { status: 400 });
      }
      clientId = docRequest.client_id;
      brokerId = docRequest.broker_id;
      requestId = docRequest.id;
      source = 'document_request';
    } else {
      // Fallback to client onboarding_token
      const { data: client } = await supabase
        .from('clients')
        .select('id, broker_id')
        .eq('onboarding_token', token)
        .single();

      if (!client) {
        return NextResponse.json({ error: 'Invalid or expired upload link' }, { status: 404 });
      }
      clientId = client.id;
      brokerId = client.broker_id;
    }

    if (!clientId || !brokerId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const uploadedDocs: Array<{ id: string; name: string; url: string }> = [];

    // Process each uploaded file
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) continue;

      const file = value;
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      // Sanitize filename
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      const filePath = `documents/${clientId}/${Date.now()}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, fileBytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error for', file.name, ':', uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(filePath);

      // Determine document type from the form field name
      const docType = key.startsWith('document_') ? 'other' : 'other';
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileType = fileExt === 'pdf' ? 'pdf' : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '') ? 'image' : 'doc';

      // Create document record
      const { data: docRecord, error: docError } = await supabase
        .from('documents')
        .insert({
          broker_id: brokerId,
          client_id: clientId,
          name: file.name,
          type: docType,
          status: 'pending',
          file_path: filePath,
          file_type: fileType,
          file_size: `${(file.size / 1024).toFixed(1)} KB`,
          file_url: urlData?.publicUrl || null,
          document_type: key.replace('document_', '') || 'additional',
        })
        .select()
        .single();

      if (!docError && docRecord) {
        uploadedDocs.push({
          id: docRecord.id,
          name: file.name,
          url: urlData?.publicUrl || '',
        });
      }
    }

    if (uploadedDocs.length === 0) {
      return NextResponse.json({ error: 'No documents were uploaded successfully' }, { status: 400 });
    }

    // Update status to completed
    if (source === 'document_request' && requestId) {
      await supabase
        .from('document_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          documents_count: uploadedDocs.length,
        })
        .eq('id', requestId);
    } else {
      await supabase
        .from('clients')
        .update({
          status: 'completed',
          documents_submitted: uploadedDocs.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);
    }

    // Log to timeline
    try {
      await supabase
        .from('case_timeline')
        .insert({
          client_id: clientId,
          broker_id: brokerId,
          event_type: 'documents_submitted',
          title: 'Documents Submitted',
          description: `Client uploaded ${uploadedDocs.length} document(s): ${uploadedDocs.map(d => d.name).join(', ')}`,
        });
    } catch {
      // Timeline logging is optional
    }

    return NextResponse.json({
      success: true,
      documentsUploaded: uploadedDocs.length,
      documents: uploadedDocs,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
