import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';

async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function trendFromDelta(delta: number | null) {
  if (delta == null || !Number.isFinite(delta)) return 'stable' as const;
  if (delta > 0.01) return 'up' as const;
  if (delta < -0.01) return 'down' as const;
  return 'stable' as const;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const zip = String(searchParams.get('zip') || '').trim();
    if (!zip || !/^\d{5}$/.test(zip)) return NextResponse.json({ error: 'zip is required (5 digits)' }, { status: 400 });

    const { data: latestDateRows, error: dateErr } = await withTimeout(
      supabaseAdmin
        .from('comparable_zips')
        .select('as_of_date')
        .eq('base_zip', zip)
        .order('as_of_date', { ascending: false })
        .limit(1),
      12000,
      'Comparables date query',
    );
    if (dateErr) throw dateErr;
    const asOfDate = latestDateRows?.[0]?.as_of_date ?? null;
    if (!asOfDate) {
      // Live fallback: compute comparables from the most recent market_snapshots & predictions
      const { data: latestSnapDateRows, error: snapDateErr } = await withTimeout(
        supabaseAdmin
          .from('market_snapshots')
          .select('snapshot_date')
          .order('snapshot_date', { ascending: false })
          .limit(1),
        12000,
        'Latest snapshot date',
      );
      if (snapDateErr) throw snapDateErr;
      const snapDate = latestSnapDateRows?.[0]?.snapshot_date ?? null;
      if (!snapDate) return NextResponse.json({ zip, as_of_date: null, comparables: [] });

      // Base zip snapshot
      const { data: baseSnap, error: baseErr } = await withTimeout(
        supabaseAdmin
          .from('market_snapshots')
          .select('zip, median_price, snapshot_date')
          .eq('zip', zip)
          .eq('snapshot_date', snapDate)
          .maybeSingle(),
        12000,
        'Base snapshot',
      );
      if (baseErr) throw baseErr;
      const basePrice = baseSnap?.median_price != null ? Number(baseSnap.median_price) : null;

      // Candidate zips: top recent snapshots
      const { data: candSnaps, error: candErr } = await withTimeout(
        supabaseAdmin
          .from('market_snapshots')
          .select('zip, median_price')
          .eq('snapshot_date', snapDate)
          .limit(200),
        12000,
        'Candidate snapshots',
      );
      if (candErr) throw candErr;

      // Latest ARIA predictions per zip (if present)
      const { data: preds, error: predErr } = await withTimeout(
        supabaseAdmin
          .from('predictions')
          .select('zip, metric, predicted_value')
          .eq('metric', 'aria_score')
          .order('prediction_date', { ascending: false })
          .limit(500),
        12000,
        'ARIA predictions',
      );
      if (predErr) throw predErr;
      const ariaByZip = new Map<string, number>();
      for (const p of preds ?? []) {
        if (!ariaByZip.has(p.zip) && p.predicted_value != null) {
          ariaByZip.set(p.zip, Number(p.predicted_value));
        }
      }

      // Compute basic 30-day trend from snapshots: compare last 7 vs prior 7 (if data exists)
      const { data: hist, error: histErr } = await withTimeout(
        supabaseAdmin
          .from('market_snapshots')
          .select('zip, snapshot_date, median_price')
          .in('zip', (candSnaps ?? []).map((r) => r.zip).slice(0, 80))
          .order('snapshot_date', { ascending: false })
          .limit(2000),
        12000,
        'Snapshot history',
      );
      if (histErr) throw histErr;
      const byZip = new Map<string, Array<{ date: string; price: number }>>();
      for (const r of hist ?? []) {
        const z = r.zip;
        const p = r.median_price != null ? Number(r.median_price) : NaN;
        if (!Number.isFinite(p)) continue;
        if (!byZip.has(z)) byZip.set(z, []);
        byZip.get(z)!.push({ date: r.snapshot_date, price: p });
      }
      const trendDelta = (z: string): number | null => {
        const rows = byZip.get(z) ?? [];
        if (rows.length < 14) return null;
        const recent = rows.slice(0, 7).map((r) => r.price);
        const prior = rows.slice(7, 14).map((r) => r.price);
        const a = recent.reduce((s, v) => s + v, 0) / recent.length;
        const b = prior.reduce((s, v) => s + v, 0) / prior.length;
        if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
        return (a - b) / b;
      };

      const scored = (candSnaps ?? [])
        .filter((r) => r.zip && r.zip !== zip)
        .map((r) => {
          const price = r.median_price != null ? Number(r.median_price) : null;
          const priceDiff = basePrice != null && price != null ? Math.abs(price - basePrice) / Math.max(1, basePrice) : 1;
          const aria = ariaByZip.get(r.zip) ?? null;
          const delta = trendDelta(r.zip);
          const score = priceDiff; // lower is better
          return { zip: r.zip, median_price: price, aria_score: aria, trend: trendFromDelta(delta), score };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 15);

      const rows = scored.map((r, idx) => ({
        base_zip: zip,
        zip: r.zip,
        city: null,
        state: null,
        aria_score: r.aria_score != null ? Math.round(Number(r.aria_score)) : null,
        trend: r.trend,
        median_price: r.median_price,
        rank: idx + 1,
        as_of_date: snapDate,
        updated_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        await withTimeout(
          supabaseAdmin.from('comparable_zips').upsert(rows, { onConflict: 'base_zip,zip,as_of_date' }),
          20000,
          'Comparables upsert',
        );
      }

      return NextResponse.json({ zip, as_of_date: snapDate, comparables: rows, live_fallback: true });
    }

    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('comparable_zips')
        .select('*')
        .eq('base_zip', zip)
        .eq('as_of_date', asOfDate)
        .order('rank', { ascending: true })
        .limit(25),
      12000,
      'Comparables query',
    );
    if (error) throw error;

    return NextResponse.json({
      zip,
      as_of_date: asOfDate,
      comparables: data ?? [],
    });
  } catch (e) {
    console.error('[market-intelligence/comparables] error', e);
    return NextResponse.json({ error: 'Failed to load comparable zips' }, { status: 500 });
  }
}

