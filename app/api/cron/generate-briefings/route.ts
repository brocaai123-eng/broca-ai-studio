import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MONITORED_ZIPS = [
  '33470', '33411', '33401', '33413', '33418',
  '33458', '33467', '33328', '33309', '33063',
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  let processed = 0;
  let errors = 0;
  const results: { zip: string; status: string }[] = [];

  for (const zip of MONITORED_ZIPS) {
    try {
      const [{ data: predictions }, { data: marketData }] = await Promise.all([
        supabase
          .from('predictions')
          .select('*')
          .eq('zip', zip)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('market_snapshots')
          .select('*')
          .eq('zip', zip)
          .order('snapshot_date', { ascending: false })
          .limit(1),
      ]);

      // In production, this will call Claude API to generate a narrative briefing
      const briefingText =
        'ARIA briefing generation pending — collecting data';

      const { error } = await supabase.from('daily_briefings').insert({
        zip,
        briefing_date: today,
        briefing_text: briefingText,
        prediction_snapshot: predictions?.[0] ?? null,
        market_snapshot: marketData?.[0] ?? null,
        generated_by: 'placeholder',
      });

      if (error) throw error;

      processed++;
      results.push({ zip, status: 'ok' });
    } catch (err) {
      errors++;
      results.push({
        zip,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      });
      console.error(`[generate-briefings] Failed for zip ${zip}:`, err);
    }
  }

  console.log(`[generate-briefings] Done: ${processed} processed, ${errors} errors`);

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    details: results,
  });
}
