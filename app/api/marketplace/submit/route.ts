import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function calculateAriaScore(price: number, specs: Record<string, unknown>): number {
  let score = 50;
  let totalWeight = 0;

  if (price > 0) {
    let priceScore: number;
    if (price < 200000) priceScore = 85;
    else if (price < 500000) priceScore = 75;
    else if (price < 1000000) priceScore = 65;
    else if (price < 2000000) priceScore = 55;
    else priceScore = 45;
    score += priceScore * 0.30;
    totalWeight += 0.30;
  }

  const sqft = Number(specs.sqft) || 0;
  if (sqft > 0 && price > 0) {
    const ppsf = price / sqft;
    let sqftScore: number;
    if (ppsf < 100) sqftScore = 90;
    else if (ppsf < 200) sqftScore = 75;
    else if (ppsf < 350) sqftScore = 60;
    else if (ppsf < 500) sqftScore = 45;
    else sqftScore = 30;
    score += sqftScore * 0.25;
    totalWeight += 0.25;
  }

  const yearBuilt = Number(specs.year_built) || 0;
  if (yearBuilt > 1900) {
    const age = new Date().getFullYear() - yearBuilt;
    let ageScore: number;
    if (age <= 5) ageScore = 90;
    else if (age <= 15) ageScore = 75;
    else if (age <= 30) ageScore = 60;
    else if (age <= 50) ageScore = 45;
    else ageScore = 35;
    score += ageScore * 0.20;
    totalWeight += 0.20;
  }

  const condition = String(specs.condition || '');
  if (condition) {
    const conditionScores: Record<string, number> = {
      excellent: 95, good: 75, fair: 50, needs_work: 30,
    };
    score += (conditionScores[condition] ?? 50) * 0.15;
    totalWeight += 0.15;
  }

  const bedrooms = Number(specs.bedrooms) || 0;
  if (bedrooms > 0) {
    score += Math.min(bedrooms * 10, 80) * 0.10;
    totalWeight += 0.10;
  }

  if (totalWeight > 0) {
    return Math.round(Math.min(100, Math.max(0, score / totalWeight)));
  }
  return 50;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      title,
      description,
      asset_type,
      asking_price,
      location_city,
      location_state,
      location_zip,
      photos,
      specs,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!title || !asset_type || asking_price === undefined || asking_price === null) {
      return NextResponse.json(
        { error: 'Title, asset type, and asking price are required' },
        { status: 400 }
      );
    }

    const parsedPrice = typeof asking_price === 'string'
      ? parseFloat(asking_price.replace(/,/g, ''))
      : Number(asking_price);

    const ariaScore = calculateAriaScore(
      isNaN(parsedPrice) ? 0 : parsedPrice,
      specs || {}
    );

    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        asset_type,
        asking_price: isNaN(parsedPrice) ? null : parsedPrice,
        location_city: location_city || null,
        location_state: location_state || null,
        location_zip: location_zip || null,
        photos: photos || [],
        specs: specs || {},
        aria_score: ariaScore,
        status: 'live',
        view_count: 0,
      })
      .select('*, broker:profiles!marketplace_listings_broker_id_fkey(*)')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('Submit listing error:', error);
    return NextResponse.json({ error: 'Failed to submit listing' }, { status: 500 });
  }
}
