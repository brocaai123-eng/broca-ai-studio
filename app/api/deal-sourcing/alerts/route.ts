import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

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

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('deal_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ alerts: data ?? [] });
  } catch (e) {
    console.error('[deal-sourcing/alerts] GET error', e);
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const zipCodes = Array.isArray(body.zip_codes)
      ? body.zip_codes
      : String(body.zip_codes || '')
          .split(',')
          .map((z: string) => z.trim())
          .filter(Boolean);

    const row = {
      user_id: user.id,
      zip_codes: zipCodes,
      min_market_score: body.min_market_score ?? null,
      min_motivated_score: body.min_motivated_score ?? null,
      max_asking_price: body.max_asking_price ?? null,
      property_types: Array.isArray(body.property_types) ? body.property_types : [],
      channels: Array.isArray(body.channels) ? body.channels : [],
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('deal_alerts')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ alert: data });
  } catch (e) {
    console.error('[deal-sourcing/alerts] POST error', e);
    return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 });
  }
}

