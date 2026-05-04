import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSocrataCrimeByZip } from '@/lib/services/crime-api';
import { writePrediction } from '@/lib/services/prediction-tracker';

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
      const breakdown = await getSocrataCrimeByZip(zip);
      if (!breakdown) {
        results.push({ zip, status: 'skipped — no data' });
        continue;
      }

      const rows = breakdown.map((entry) => ({
        zip,
        record_date: today,
        crime_type: entry.category,
        incident_count: entry.count,
        per_capita_rate: entry.per_capita,
        trend: entry.trend,
      }));

      if (rows.length > 0) {
        const { error } = await supabase.from('crime_records').insert(rows);
        if (error) throw error;
      }

      // Write crime_trend prediction (total incidents as proxy)
      const totalIncidents = breakdown.reduce((s, e) => s + (e.count ?? 0), 0);
      void writePrediction({ zip, metric: 'crime_trend', model_version: 'socrata-v1', predicted_value: totalIncidents });

      processed++;
      results.push({ zip, status: `ok — ${rows.length} categories` });
    } catch (err) {
      errors++;
      results.push({
        zip,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      });
      console.error(`[collect-crime-data] Failed for zip ${zip}:`, err);
    }
  }

  console.log(`[collect-crime-data] Done: ${processed} processed, ${errors} errors`);

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    details: results,
  });
}
