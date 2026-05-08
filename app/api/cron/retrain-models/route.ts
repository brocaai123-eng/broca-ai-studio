import { NextRequest, NextResponse } from 'next/server';

/**
 * Nightly cron: triggers the ML service to retrain all models
 * using the latest data + resolved prediction_feedback entries.
 *
 * Schedule: 0 5 * * * (5 AM UTC, after backfill-actuals at 4 AM)
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
const ML_AUTH_SECRET = process.env.ML_AUTH_SECRET || '';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ML_SERVICE_URL) {
    return NextResponse.json({
      skipped: true,
      reason: 'ML_SERVICE_URL not configured — using TypeScript models only',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const res = await fetch(`${ML_SERVICE_URL}/retrain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ML_AUTH_SECRET ? { Authorization: `Bearer ${ML_AUTH_SECRET}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[retrain-models] ML service returned ${res.status}:`, text);
      return NextResponse.json(
        { error: `ML service returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    console.log(
      `[retrain-models] Done: ${data.models_retrained?.length ?? 0} models retrained, ${data.errors?.length ?? 0} errors`,
    );

    return NextResponse.json({
      success: true,
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[retrain-models] Failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Retrain failed' },
      { status: 500 },
    );
  }
}
