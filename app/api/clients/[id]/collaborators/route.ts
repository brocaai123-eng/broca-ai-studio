import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ROLE_CONFIG } from '@/lib/types/collaboration';
import { sendCollaborationInviteEmail } from '@/lib/email/resend';

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

// Helper: Check if user is the case owner (via case_collaborators OR clients.broker_id fallback)
async function isCallerOwnerOrCoOwner(clientId: string, userId: string): Promise<boolean> {
  // First check case_collaborators table
  const { data: callerCollab } = await supabaseAdmin
    .from('case_collaborators')
    .select('role')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .eq('status', 'active')
    .single();

  if (callerCollab && ['owner', 'co_owner'].includes(callerCollab.role)) {
    return true;
  }

  // Fallback: check if user is the client's broker_id (original owner)
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();

  return client?.broker_id === userId;
}

async function isCallerOwner(clientId: string, userId: string): Promise<boolean> {
  const { data: callerCollab } = await supabaseAdmin
    .from('case_collaborators')
    .select('role')
    .eq('client_id', clientId)
    .eq('broker_id', userId)
    .eq('status', 'active')
    .single();

  if (callerCollab?.role === 'owner') {
    return true;
  }

  // Fallback: check clients.broker_id
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('broker_id')
    .eq('id', clientId)
    .single();

  return client?.broker_id === userId;
}

// GET - List collaborators for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: collaborators, error } = await supabaseAdmin
      .from('case_collaborators')
      .select(`
        *,
        broker:profiles!case_collaborators_broker_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('client_id', clientId)
      .neq('status', 'removed')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching collaborators:', error);
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
    }

    return NextResponse.json({ collaborators: collaborators || [] });
  } catch (error) {
    console.error('Error in GET collaborators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a collaborator by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Verify caller is owner or co_owner
    const canAdd = await isCallerOwnerOrCoOwner(clientId, user.id);
    if (!canAdd) {
      return NextResponse.json({ error: 'Only owners and co-owners can add collaborators' }, { status: 403 });
    }

    // Find the broker by email
    const { data: broker } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email)
      .eq('role', 'broker')
      .single();

    if (!broker) {
      return NextResponse.json({ error: 'No broker found with this email. They must have a Broca account.' }, { status: 404 });
    }

    if (broker.id === user.id) {
      return NextResponse.json({ error: 'You cannot add yourself as a collaborator' }, { status: 400 });
    }

    // Check if already a collaborator
    const { data: existing } = await supabaseAdmin
      .from('case_collaborators')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('broker_id', broker.id)
      .single();

    if (existing && existing.status !== 'removed') {
      return NextResponse.json({ error: 'This broker is already a collaborator on this case' }, { status: 400 });
    }

    const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
    if (!roleConfig) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Insert or update (if previously removed)
    let collaborator;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('case_collaborators')
        .update({
          role,
          permissions: roleConfig.defaultPermissions,
          status: 'pending',
          added_by: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      collaborator = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('case_collaborators')
        .insert({
          client_id: clientId,
          broker_id: broker.id,
          role,
          permissions: roleConfig.defaultPermissions,
          added_by: user.id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      collaborator = data;
    }

    // Add timeline entry
    await supabaseAdmin.from('case_timeline').insert({
      client_id: clientId,
      author_id: user.id,
      type: 'collaborator_added',
      content: `invited ${broker.full_name || broker.email} as ${roleConfig.label}`,
      metadata: { broker_id: broker.id, broker_name: broker.full_name, role },
    });

    // Send email notification to the invited broker
    try {
      // Get the inviter's name and the client name
      const { data: inviterProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const { data: clientInfo } = await supabaseAdmin
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      await sendCollaborationInviteEmail({
        to: broker.email,
        invitedBrokerName: broker.full_name || broker.email.split('@')[0],
        inviterName: inviterProfile?.full_name || inviterProfile?.email || 'A broker',
        clientName: clientInfo?.name || 'a client case',
        clientId,
        role: roleConfig.label,
        roleDescription: roleConfig.description,
      });
    } catch (emailError) {
      // Don't fail the whole request if email fails — collaborator was still added
      console.error('Failed to send collaboration invite email:', emailError);
    }

    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json({ error: error.message || 'Failed to add collaborator' }, { status: 500 });
  }
}

// PUT - Update collaborator (role, status/accept invite)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { collaboratorId, role, status } = await request.json();
    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Accept invite - the invited broker accepts their own invite
    if (status === 'active') {
      const { data: collab } = await supabaseAdmin
        .from('case_collaborators')
        .select('broker_id, status')
        .eq('id', collaboratorId)
        .single();

      if (!collab || collab.broker_id !== user.id) {
        return NextResponse.json({ error: 'You can only accept your own invites' }, { status: 403 });
      }

      updates.status = 'active';
      updates.accepted_at = new Date().toISOString();
    }

    // Reject invite - the invited broker declines their own invite
    if (status === 'removed') {
      const { data: collab } = await supabaseAdmin
        .from('case_collaborators')
        .select('broker_id, status, role')
        .eq('id', collaboratorId)
        .single();

      if (!collab) {
        return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
      }

      // Either the invited broker rejects, or the owner removes
      const isOwnInvite = collab.broker_id === user.id && collab.status === 'pending';
      if (!isOwnInvite) {
        return NextResponse.json({ error: 'You can only reject your own pending invites' }, { status: 403 });
      }

      updates.status = 'removed';
    }

    // Change role - only owner can
    if (role) {
      const canChangeRole = await isCallerOwner(clientId, user.id);
      if (!canChangeRole) {
        return NextResponse.json({ error: 'Only the owner can change roles' }, { status: 403 });
      }

      const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
      if (!roleConfig) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      updates.role = role;
      updates.permissions = roleConfig.defaultPermissions;
    }

    const { data, error } = await supabaseAdmin
      .from('case_collaborators')
      .update(updates)
      .eq('id', collaboratorId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ collaborator: data });
  } catch (error: any) {
    console.error('Error updating collaborator:', error);
    return NextResponse.json({ error: error.message || 'Failed to update collaborator' }, { status: 500 });
  }
}

// DELETE - Remove a collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const collaboratorId = request.nextUrl.searchParams.get('id');
    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID is required' }, { status: 400 });
    }

    // Get the collaborator being removed
    const { data: target } = await supabaseAdmin
      .from('case_collaborators')
      .select('broker_id, role')
      .eq('id', collaboratorId)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the case owner' }, { status: 400 });
    }

    // Verify caller is owner
    const canRemove = await isCallerOwner(clientId, user.id);
    if (!canRemove) {
      return NextResponse.json({ error: 'Only the owner can remove collaborators' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('case_collaborators')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', collaboratorId);

    if (error) throw error;

    // Add timeline entry
    const { data: removedBroker } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', target.broker_id)
      .single();

    await supabaseAdmin.from('case_timeline').insert({
      client_id: clientId,
      author_id: user.id,
      type: 'collaborator_removed',
      content: `removed ${removedBroker?.full_name || removedBroker?.email || 'a collaborator'}`,
      metadata: { broker_id: target.broker_id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove collaborator' }, { status: 500 });
  }
}
