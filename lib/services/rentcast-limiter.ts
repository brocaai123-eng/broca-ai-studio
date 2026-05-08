import { createClient } from '@supabase/supabase-js';

const DAILY_LIMIT = Number(process.env.RENTCAST_DAILY_LIMIT || 500);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let memoryCount = 0;
let memoryDate = '';

function today() {
  return new Date().toISOString().split('T')[0];
}

export async function checkAndIncrementRentCast(): Promise<{ allowed: boolean; used: number; limit: number }> {
  const d = today();

  // Fast in-memory check for hot path
  if (memoryDate === d && memoryCount >= DAILY_LIMIT) {
    return { allowed: false, used: memoryCount, limit: DAILY_LIMIT };
  }

  try {
    // Atomic increment via upsert + raw SQL isn't available through supabase-js,
    // so we read-then-update with a fallback insert.
    const { data: row } = await supabase
      .from('api_usage_log')
      .select('id, call_count')
      .eq('api_name', 'rentcast')
      .eq('call_date', d)
      .maybeSingle();

    const currentCount = row?.call_count ?? 0;

    if (currentCount >= DAILY_LIMIT) {
      memoryDate = d;
      memoryCount = currentCount;
      return { allowed: false, used: currentCount, limit: DAILY_LIMIT };
    }

    const newCount = currentCount + 1;

    if (row?.id) {
      await supabase
        .from('api_usage_log')
        .update({ call_count: newCount })
        .eq('id', row.id);
    } else {
      await supabase
        .from('api_usage_log')
        .insert({ api_name: 'rentcast', call_date: d, call_count: 1 });
    }

    memoryDate = d;
    memoryCount = newCount;
    return { allowed: true, used: newCount, limit: DAILY_LIMIT };
  } catch (e) {
    // If the table doesn't exist yet, allow the call but log warning
    console.warn('[rentcast-limiter] DB check failed, allowing call:', e);
    memoryCount++;
    memoryDate = d;
    return { allowed: memoryCount <= DAILY_LIMIT, used: memoryCount, limit: DAILY_LIMIT };
  }
}
