import { NextRequest, NextResponse } from 'next/server';
import { runLocalTraining } from '@/lib/services/run-local-models';

/**
 * Nightly cron: retrain using latest property/market data + resolved prediction_feedback.
 * Tries the Python ML service when configured; always runs the local TypeScript trainer
 * so training does not depend on Railway staying online.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
const ML_AUTH_SECRET = process.env.ML_AUTH_SECRET || '';

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let ml: { ok: boolean; skipped?: boolean; error?: string; data?: unknown } = {
    ok: false,
    skipped: !ML_SERVICE_URL,
  };

  if (ML_SERVICE_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      const res = await fetch(`${ML_SERVICE_URL}/retrain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ML_AUTH_SECRET ? { Authorization: `Bearer ${ML_AUTH_SECRET}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        ml = { ok: true, data: await res.json() };
      } else {
        const text = await res.text();
        console.error(`[retrain-models] ML service returned ${res.status}:`, text);
        ml = { ok: false, error: `ML service ${res.status}` };
      }
    } catch (e) {
      console.error('[retrain-models] ML service failed:', e);
      ml = { ok: false, error: e instanceof Error ? e.message : 'ML retrain failed' };
    }
  }

  try {
    const local = await runLocalTraining();
    return NextResponse.json({
      success: true,
      ml,
      local,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[retrain-models] Local trainer failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Retrain failed', ml },
      { status: 500 },
    );
  }
}
