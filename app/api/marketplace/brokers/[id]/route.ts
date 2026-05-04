import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try broker_profiles by id first, then by user_id
    let bp: Record<string, unknown> | null = null;
    const { data: bpById } = await supabase
      .from('broker_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (bpById) {
      bp = bpById;
    } else {
      const { data: bpByUser } = await supabase
        .from('broker_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      bp = bpByUser;
    }

    // Resolve the user_id: either from broker_profile or id itself is the user_id
    const userId = bp ? (bp.user_id as string) : id;

    // Fetch profile (registered user)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'broker') {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    // Fetch active listings
    const lookupId = bp?.id ?? id;
    const { data: listings } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('broker_id', lookupId)
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    const broker = {
      id: bp?.id ?? userId,
      user_id: userId,
      brokerage_name: bp?.brokerage_name ?? null,
      license_number: bp?.license_number ?? null,
      specialties: bp?.specialties ?? [],
      zip_codes_served: bp?.zip_codes_served ?? [],
      cover_photo_url: bp?.cover_photo_url ?? null,
      bio: bp?.bio ?? null,
      contact_email: bp?.contact_email ?? profile.email ?? null,
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
        full_name: profile.full_name,
        avatar_url: profile.avatar_url ?? null,
        email: profile.email,
      },
      active_listings: listings ?? [],
    };

    return NextResponse.json({ broker });
  } catch (error) {
    console.error('Broker GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch broker profile' }, { status: 500 });
  }
}
