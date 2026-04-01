import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — List saved analyses for current broker
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('market_analyses')
      .select('*')
      .eq('broker_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ analyses: data || [] });
  } catch (err) {
    console.error('Error fetching saved analyses:', err);
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
  }
}

// POST — Save an analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { location, zipCode, state, county, ariaScore, marketData, aiSummary, marketType } = body;

    if (!location || !zipCode) {
      return NextResponse.json({ error: 'Location and zip code are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('market_analyses')
      .insert({
        broker_id: user.id,
        location,
        zip_code: zipCode,
        state: state || null,
        county: county || null,
        aria_score: ariaScore || 0,
        market_data: marketData || {},
        ai_summary: aiSummary || null,
        market_type: marketType || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, analysis: data });
  } catch (err) {
    console.error('Error saving analysis:', err);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }
}

// DELETE — Remove a saved analysis
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });

    const { error } = await supabase
      .from('market_analyses')
      .delete()
      .eq('id', id)
      .eq('broker_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting analysis:', err);
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
  }
}
