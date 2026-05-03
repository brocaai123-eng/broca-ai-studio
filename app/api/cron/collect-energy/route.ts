import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnergyData } from '@/lib/services/eia-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let processed = 0;
  let errors = 0;

  try {
    const data = await getEnergyData('FL');

    const { error } = await supabase.from('energy_data').insert({
      state: 'FL',
      collected_at: new Date().toISOString(),
      consumption_mwh: data.consumption,
      generation_revenue: data.generation,
      price_cents_kwh: data.price_cents_kwh,
    });

    if (error) throw error;

    processed = 1;
    console.log('[collect-energy] Inserted FL energy snapshot');
  } catch (err) {
    errors = 1;
    console.error('[collect-energy] Failed:', err);
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
  });
}
