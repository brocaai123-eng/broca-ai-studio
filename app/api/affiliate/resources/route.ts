import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch affiliate resources
export async function GET() {
  try {
    const { data: resources, error } = await supabase
      .from('affiliate_resources')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    return NextResponse.json({ resources: resources || [] });
  } catch (error) {
    console.error('Error in GET /api/affiliate/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
