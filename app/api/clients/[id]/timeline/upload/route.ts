import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

// Helper: Check if user can upload documents on this case
async function canUpload(clientId: string, userId: string): Promise<boolean> {
  // Owner can always upload
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();
  if (client?.broker_id === userId) return true;

  // Check collaborator permissions
  const { data: collab } = await supabaseAdmin
    .from('case_collaborators')
    .select('role, permissions')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .eq('status', 'active')
    .single();

  if (!collab) return false;
  if (collab.role === 'owner' || collab.role === 'co_owner') return true;
  return collab.permissions?.can_upload === true;
}

// POST - Upload a document and create a timeline entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user can upload
    const userCanUpload = await canUpload(clientId, user.id);
    if (!userCanUpload) {
      return NextResponse.json({ error: 'You do not have permission to upload documents' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const description = (formData.get('description') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Allowed: PDF, images, Word, Excel, CSV, text.' }, { status: 400 });
    }

    // Sanitize filename
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_');

    // Upload to Supabase Storage
    const storagePath = `${clientId}/timeline/${Date.now()}_${sanitizedFileName}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Map MIME type to file_type
    const getFileType = (mimeType: string): 'pdf' | 'image' | 'doc' => {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType === 'application/pdf') return 'pdf';
      return 'doc';
    };

    // Get client's broker_id for the document record
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('broker_id')
      .eq('id', clientId)
      .single();

    // Create document record in the documents table
    const { data: docRecord, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        client_id: clientId,
        broker_id: client?.broker_id || user.id,
        name: file.name,
        file_path: storagePath,
        file_url: urlData.publicUrl,
        file_type: getFileType(file.type),
        file_size: String(file.size),
        document_type: 'broker_upload',
        status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document record:', docError);
      // Still continue - the file is uploaded, we just couldn't save the record
    }

    // Create timeline entry
    const { data: entry, error: timelineError } = await supabaseAdmin
      .from('case_timeline')
      .insert({
        client_id: clientId,
        author_id: user.id,
        type: 'document_uploaded',
        content: description
          ? `uploaded document "${file.name}" — ${description}`
          : `uploaded document "${file.name}"`,
        metadata: {
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: getFileType(file.type),
          document_id: docRecord?.id || null,
          storage_path: storagePath,
          description: description || null,
        },
      })
      .select(`
        *,
        author:profiles!case_timeline_author_id_fkey(id, full_name, email, avatar_url),
        milestone:case_milestones!case_timeline_milestone_id_fkey(id, title)
      `)
      .single();

    if (timelineError) {
      console.error('Error creating timeline entry:', timelineError);
      return NextResponse.json({ error: 'File uploaded but failed to create timeline entry' }, { status: 500 });
    }

    return NextResponse.json({
      entry,
      document: docRecord || null,
      file_url: urlData.publicUrl,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in document upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
  }
}
