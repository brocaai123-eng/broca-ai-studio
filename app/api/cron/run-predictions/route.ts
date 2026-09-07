import { NextRequest, NextResponse } from 'next/server';
import {
  persistModelResults,
  runTypeScriptModels,
  type LocalModelResult,
} from '@/lib/services/run-local-models';
import { MONITORED_ZIPS } from '@/lib/services/monitored-zips';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
const ML_AUTH_SECRET = process.env.ML_AUTH_SECRET || '';

export const maxDuration = 120;

async function callMLService(zip: string): Promise<LocalModelResult[] | null> {
  if (!ML_SERVICE_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(`${ML_SERVICE_URL}/predict/${zip}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ML_AUTH_SECRET ? { Authorization: `Bearer ${ML_AUTH_SECRET}` } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.predictions ?? null;
  } catch (e) {
    console.warn(`[run-predictions] ML service call failed for ${zip}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const results: Array<{ zip: string; models: number; errors: number; source: string }> = [];

  for (const zip of MONITORED_ZIPS) {
    const mlResults = await callMLService(zip);
    if (mlResults && mlResults.length > 0) {
      const persisted = await persistModelResults(zip, mlResults, today);
      results.push({ zip, models: persisted.modelsRun, errors: persisted.errors, source: 'ml-service' });
    } else {
      const ts = await runTypeScriptModels(zip);
      const persisted = await persistModelResults(zip, ts.results, today);
      results.push({
        zip,
        models: persisted.modelsRun,
        errors: persisted.errors + ts.errors,
        source: 'typescript',
      });
    }
  }

  const totalModels = results.reduce((s, r) => s + r.models, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);
  const mlCount = results.filter((r) => r.source === 'ml-service').length;

  return NextResponse.json({
    success: true,
    totalModels,
    totalErrors,
    mlServiceUsed: mlCount,
    timestamp: new Date().toISOString(),
    details: results,
  });
}
