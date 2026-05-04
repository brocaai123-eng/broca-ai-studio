import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const specialty = searchParams.get('specialty');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Fetch all registered broker users from profiles
    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email', { count: 'exact' })
      .eq('role', 'broker');

    if (search) {
      profilesQuery = profilesQuery.ilike('full_name', `%${search}%`);
    }

    profilesQuery = profilesQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: profileRows, error: profilesError, count } = await profilesQuery;
    if (profilesError) throw profilesError;

    if (!profileRows || profileRows.length === 0) {
      return NextResponse.json({ brokers: [], total: 0, page, limit, totalPages: 0 });
    }

    // Fetch any matching broker_profiles rows for extra details
    const userIds = profileRows.map((p) => p.id);
    const { data: bpRows } = await supabase
      .from('broker_profiles')
      .select('*')
      .in('user_id', userIds);

    const bpMap = new Map((bpRows || []).map((bp) => [bp.user_id, bp]));

    // Merge: every broker user gets a card; extra details from broker_profiles if available
    const brokers = profileRows
      .filter((p) => {
        if (specialty && specialty !== 'all') {
          const bp = bpMap.get(p.id);
          return bp?.specialties?.includes(specialty);
        }
        return true;
      })
      .map((p) => {
        const bp = bpMap.get(p.id) ?? null;
        return {
          id: bp?.id ?? p.id,
          user_id: p.id,
          brokerage_name: bp?.brokerage_name ?? null,
          license_number: bp?.license_number ?? null,
          specialties: bp?.specialties ?? [],
          zip_codes_served: bp?.zip_codes_served ?? [],
          cover_photo_url: bp?.cover_photo_url ?? null,
          bio: bp?.bio ?? null,
          contact_email: bp?.contact_email ?? p.email ?? null,
          contact_phone: bp?.contact_phone ?? null,
          linkedin_url: bp?.linkedin_url ?? null,
          aria_performance_score: bp?.aria_performance_score ?? null,
          total_listings: bp?.total_listings ?? 0,
          deals_closed: bp?.deals_closed ?? 0,
          avg_days_to_close: bp?.avg_days_to_close ?? null,
          rating: bp?.rating ?? 0,
          review_count: bp?.review_count ?? 0,
          is_verified: bp?.is_verified ?? false,
          created_at: bp?.created_at ?? new Date().toISOString(),
          updated_at: bp?.updated_at ?? new Date().toISOString(),
          profile: {
            full_name: p.full_name,
            avatar_url: p.avatar_url ?? null,
            email: p.email,
          },
        };
      });

    return NextResponse.json({
      brokers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Brokers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 500 });
  }
}
