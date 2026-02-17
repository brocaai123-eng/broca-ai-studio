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

// GET - List all cases the broker collaborates on + owned cases with full team details
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get all collaborations where user is invited (not owner via clients.broker_id)
    const { data: collaborations, error } = await supabaseAdmin
      .from('case_collaborators')
      .select(`
        id,
        client_id,
        role,
        permissions,
        status,
        invited_at,
        accepted_at,
        client:clients(id, name, email, status, broker_id, created_at),
        invited_by_profile:profiles!case_collaborators_added_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('broker_id', user.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collaboration cases:', error);
      return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
    }

    // 2. Get ALL cases the broker owns
    const { data: ownedCases, error: ownedError } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, status, created_at')
      .eq('broker_id', user.id);

    if (ownedError) {
      console.error('Error fetching owned cases:', ownedError);
    }

    // 3. For owned cases, get FULL collaborator details (not just counts)
    const ownedCaseIds = (ownedCases || []).map(c => c.id);

    interface CollaboratorDetail {
      id: string;
      client_id: string;
      broker_id: string;
      role: string;
      permissions: Record<string, boolean>;
      status: string;
      invited_at: string;
      accepted_at: string | null;
      broker: {
        id: string;
        full_name: string | null;
        email: string;
        avatar_url: string | null;
      } | null;
    }

    interface OwnedCaseWithTeam {
      client_id: string;
      client_name: string;
      client_email: string;
      client_status: string;
      collaborators: CollaboratorDetail[];
    }

    let ownedWithCollabs: OwnedCaseWithTeam[] = [];
    if (ownedCaseIds.length > 0) {
      const { data: collabDetails } = await supabaseAdmin
        .from('case_collaborators')
        .select(`
          id,
          client_id,
          broker_id,
          role,
          permissions,
          status,
          invited_at,
          accepted_at,
          broker:profiles!case_collaborators_broker_id_fkey(id, full_name, email, avatar_url)
        `)
        .in('client_id', ownedCaseIds)
        .neq('broker_id', user.id)
        .neq('status', 'removed');

      // Group by client_id
      const groupMap: Record<string, CollaboratorDetail[]> = {};
      (collabDetails || []).forEach((c: Record<string, unknown>) => {
        const clientId = c.client_id as string;
        // Supabase returns single-relation joins as arrays, normalize to single object
        const brokerRaw = c.broker;
        const broker = Array.isArray(brokerRaw) ? brokerRaw[0] || null : brokerRaw || null;
        const detail: CollaboratorDetail = {
          id: c.id as string,
          client_id: clientId,
          broker_id: c.broker_id as string,
          role: c.role as string,
          permissions: (c.permissions || {}) as Record<string, boolean>,
          status: c.status as string,
          invited_at: c.invited_at as string,
          accepted_at: c.accepted_at as string | null,
          broker: broker as CollaboratorDetail['broker'],
        };
        if (!groupMap[clientId]) groupMap[clientId] = [];
        groupMap[clientId].push(detail);
      });

      ownedWithCollabs = Object.entries(groupMap).map(([client_id, collaborators]) => {
        const clientInfo = (ownedCases || []).find(c => c.id === client_id);
        return {
          client_id,
          client_name: clientInfo?.name || 'Unknown',
          client_email: clientInfo?.email || '',
          client_status: clientInfo?.status || 'active',
          collaborators,
        };
      });
    }

    // 4. Compute summary counts for dashboard widget
    const totalOwnedTeamMembers = ownedWithCollabs.reduce((sum, c) => sum + c.collaborators.length, 0);
    const activeCollaborationsOnOthers = (collaborations || []).filter(
      (c: Record<string, unknown>) => {
        const client = Array.isArray(c.client) ? c.client[0] : c.client;
        return c.status === 'active' && client?.broker_id !== user.id;
      }
    ).length;

    return NextResponse.json({
      collaborations: collaborations || [],
      ownedWithCollaborators: ownedWithCollabs,
      ownedCases: ownedCases || [],
      summary: {
        totalOwnedTeamMembers,
        activeCollaborationsOnOthers,
        ownedCasesWithTeams: ownedWithCollabs.length,
        totalTeamCases: ownedWithCollabs.length + activeCollaborationsOnOthers,
      },
    });
  } catch (error) {
    console.error('Error in GET collaboration cases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
