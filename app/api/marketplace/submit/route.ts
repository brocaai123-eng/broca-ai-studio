import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Generate a one-time AI summary saved to the DB — never called again for the same listing */
async function generateAiSummary(data: {
  title: string;
  description: string | null;
  asset_type: string;
  asking_price: number | null;
  location_city: string | null;
  location_state: string | null;
  specs: Record<string, unknown>;
}): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const prompt = `You are a real estate and marine asset expert. Write a concise 2-3 sentence professional listing summary for a potential buyer. Be specific, highlight key selling points, and keep it factual.

Listing details:
- Type: ${data.asset_type === 'boat' ? 'Vessel/Yacht' : 'Real Estate'}
- Title: ${data.title}
- Price: ${data.asking_price ? `$${data.asking_price.toLocaleString()}` : 'Price on request'}
- Location: ${[data.location_city, data.location_state].filter(Boolean).join(', ') || 'N/A'}
- Description: ${data.description || 'Not provided'}
- Specs: ${JSON.stringify(data.specs)}

Write a professional 2-3 sentence buyer-facing summary:`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.4,
    });
    return res.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

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
      brokerData,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!asset_type) {
      return NextResponse.json({ error: 'Asset type is required' }, { status: 400 });
    }

    // ── Broker profile path ──────────────────────────────────────────────────
    if (asset_type === 'broker_profile') {
      const bd = brokerData || {};
      const { data: profile, error } = await supabase
        .from('broker_profiles')
        .upsert(
          {
            user_id: userId,
            license_number: bd.licenseNumber || null,
            brokerage_name: bd.brokerageName || null,
            specialties: bd.specialties || [],
            zip_codes_served: bd.zipCodes || [],
            contact_email: bd.contactEmail || null,
            contact_phone: bd.contactPhone || null,
            bio: bd.bio || null,
            cover_photo_url: bd.coverPhotoUrl || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) {
        console.error('Broker profile upsert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ profile }, { status: 201 });
    }

    // ── Listing path (real_estate / boat) ────────────────────────────────────
    if (!title || asking_price === undefined || asking_price === null) {
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

    // Generate AI summary once — stored in DB, never regenerated
    const aiSummary = await generateAiSummary({
      title,
      description: description || null,
      asset_type,
      asking_price: isNaN(parsedPrice) ? null : parsedPrice,
      location_city: location_city || null,
      location_state: location_state || null,
      specs: specs || {},
    });

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
        specs: { ...(specs || {}), ai_summary: aiSummary },
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
