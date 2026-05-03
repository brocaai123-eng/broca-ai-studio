import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fetchCrimeScore(state: string): number | null {
  if (!state) return null;
  const stateRates: Record<string, number> = {
    AL: 453, AK: 838, AZ: 485, AR: 672, CA: 442, CO: 424, CT: 183,
    DE: 431, FL: 384, GA: 400, HI: 254, ID: 227, IL: 416, IN: 382,
    IA: 297, KS: 405, KY: 211, LA: 639, ME: 109, MD: 453, MA: 308,
    MI: 478, MN: 280, MS: 291, MO: 543, MT: 452, NE: 306, NV: 460,
    NH: 146, NJ: 195, NM: 832, NY: 364, NC: 420, ND: 303, OH: 347,
    OK: 434, OR: 292, PA: 390, RI: 218, SC: 530, SD: 501, TN: 673,
    TX: 446, UT: 233, VT: 173, VA: 208, WA: 394, WV: 355, WI: 323, WY: 234,
    DC: 999,
  };
  const code = state.toUpperCase().substring(0, 2);
  const rate = stateRates[code];
  if (rate === undefined) return null;
  return Math.round(Math.max(5, Math.min(95, 100 - (rate / 10))));
}

function calculateAriaScore(
  price: number,
  specs: Record<string, unknown>,
  crimeScore: number | null
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  // Price attractiveness (25%)
  if (price > 0) {
    let s: number;
    if (price < 200000) s = 85;
    else if (price < 500000) s = 72;
    else if (price < 1000000) s = 60;
    else if (price < 2000000) s = 48;
    else s = 35;
    weightedSum += s * 0.25;
    totalWeight += 0.25;
  }

  // Price per sqft (20%)
  const sqft = Number(specs.sqft) || 0;
  if (sqft > 0 && price > 0) {
    const ppsf = price / sqft;
    let s: number;
    if (ppsf < 100) s = 88;
    else if (ppsf < 200) s = 72;
    else if (ppsf < 350) s = 55;
    else if (ppsf < 500) s = 40;
    else s = 25;
    weightedSum += s * 0.20;
    totalWeight += 0.20;
  }

  // Building age (15%)
  const yb = Number(specs.year_built) || 0;
  if (yb > 1900) {
    const age = new Date().getFullYear() - yb;
    let s: number;
    if (age <= 5) s = 85;
    else if (age <= 15) s = 72;
    else if (age <= 30) s = 58;
    else if (age <= 50) s = 42;
    else s = 30;
    weightedSum += s * 0.15;
    totalWeight += 0.15;
  }

  // Condition (15%)
  const cond = String(specs.condition || '');
  if (cond) {
    const m: Record<string, number> = { excellent: 90, good: 70, fair: 45, needs_work: 25 };
    weightedSum += (m[cond] ?? 50) * 0.15;
    totalWeight += 0.15;
  }

  // Bedrooms (10%)
  const beds = Number(specs.bedrooms) || 0;
  if (beds > 0) {
    const s = beds >= 4 ? 75 : beds >= 3 ? 68 : beds >= 2 ? 55 : 40;
    weightedSum += s * 0.10;
    totalWeight += 0.10;
  }

  // Crime safety (15%)
  if (crimeScore != null) {
    weightedSum += crimeScore * 0.15;
    totalWeight += 0.15;
  }

  if (totalWeight === 0) return 50;
  return Math.round(Math.max(10, Math.min(95, weightedSum / totalWeight)));
}

async function generateAIAnalysis(
  listing: Record<string, unknown>,
  crimeScore: number | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const specs = (listing.specs || {}) as Record<string, unknown>;
    const prompt = `You are ARIA, an AI real estate investment analyst for BrocaAI. Analyze this property listing and give a concise 3-4 paragraph investment analysis.

Property: ${listing.title}
Location: ${listing.location_city}, ${listing.location_state} ${listing.location_zip}
Type: ${specs.subtype || listing.asset_type}
Asking Price: $${Number(listing.asking_price).toLocaleString()}
Bedrooms: ${specs.bedrooms || 'N/A'}, Bathrooms: ${specs.bathrooms || 'N/A'}
Sqft: ${specs.sqft || 'N/A'}
Year Built: ${specs.year_built || 'N/A'}
Condition: ${specs.condition || 'N/A'}
Crime Score (higher=safer): ${crimeScore ?? 'N/A'}/100
ARIA Score: ${listing.aria_score ?? 'N/A'}/100

Provide: 1) Investment Summary (is this a good deal?), 2) Key Risks, 3) Recommendation. Be specific and data-driven. Keep it under 200 words.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('Claude API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch (e) {
    console.error('AI analysis error:', e);
    return null;
  }
}

async function geocodeAddress(city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const q = [city, state, zip].filter(Boolean).join(', ');
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const specs = (listing.specs || {}) as Record<string, unknown>;
    const price = Number(listing.asking_price) || 0;

    const crimeScore = fetchCrimeScore(listing.location_state || '');
    const ariaScore = calculateAriaScore(price, specs, crimeScore);

    // --- AI Analysis: generate ONCE then store in specs.ai_analysis ---
    let aiAnalysis: string | null = null;
    const storedAnalysis = (specs.ai_analysis as string) || listing.description_ai;

    if (storedAnalysis) {
      aiAnalysis = storedAnalysis;
    } else {
      aiAnalysis = await generateAIAnalysis(
        { ...listing, aria_score: ariaScore },
        crimeScore
      );
      if (aiAnalysis) {
        const updatedSpecs = { ...specs, ai_analysis: aiAnalysis };
        await supabase
          .from('marketplace_listings')
          .update({ specs: updatedSpecs })
          .eq('id', id);
      }
    }

    // --- Geocode for lat/lng if not stored ---
    let lat = listing.latitude ? Number(listing.latitude) : null;
    let lng = listing.longitude ? Number(listing.longitude) : null;

    if ((lat === null || lng === null) && (listing.location_city || listing.location_zip)) {
      const coords = await geocodeAddress(
        listing.location_city || '',
        listing.location_state || '',
        listing.location_zip || ''
      );
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        await supabase
          .from('marketplace_listings')
          .update({ latitude: lat, longitude: lng })
          .eq('id', id);
      }
    }

    // --- Persist ARIA + crime score ---
    const updates: Record<string, unknown> = {};
    if (ariaScore != null) updates.aria_score = ariaScore;
    if (crimeScore != null) updates.crime_score = crimeScore;
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('marketplace_listings')
        .update(updates)
        .eq('id', id);
    }

    const motivatedScore = listing.motivated_seller_score ?? Math.floor(price > 0 ? Math.min(50, (500000 / price) * 20) : 25);
    const daysToClose = listing.estimated_days_to_close ?? (price < 300000 ? 35 : price < 600000 ? 50 : 75);

    return NextResponse.json({
      aria_score: ariaScore,
      crime_score: crimeScore,
      ai_analysis: aiAnalysis,
      latitude: lat,
      longitude: lng,
      neighborhood_direction: listing.neighborhood_direction || 'stable',
      motivated_seller_score: motivatedScore,
      estimated_days_to_close: daysToClose,
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json({ error: 'Failed to enrich listing' }, { status: 500 });
  }
}
