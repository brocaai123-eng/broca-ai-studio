import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zip_code, price, asset_type, square_footage, year_built, cap_rate, noi, occupancy_rate } = body;

    if (!zip_code || !price) {
      return NextResponse.json(
        { error: 'Zip code and price are required' },
        { status: 400 }
      );
    }

    // Weighted formula based on available data points
    let score = 50;
    let factors = 0;
    let totalWeight = 0;

    // Price positioning (weight: 25)
    // Lower price relative to market norms scores higher
    if (price > 0) {
      let priceScore: number;
      if (price < 200000) priceScore = 85;
      else if (price < 500000) priceScore = 75;
      else if (price < 1000000) priceScore = 65;
      else if (price < 2000000) priceScore = 55;
      else priceScore = 45;
      score += priceScore * 0.25;
      factors++;
      totalWeight += 0.25;
    }

    // Cap rate (weight: 20) — higher cap rate = better investment potential
    if (cap_rate != null && cap_rate > 0) {
      let capScore: number;
      if (cap_rate >= 10) capScore = 95;
      else if (cap_rate >= 8) capScore = 85;
      else if (cap_rate >= 6) capScore = 70;
      else if (cap_rate >= 4) capScore = 55;
      else capScore = 35;
      score += capScore * 0.20;
      factors++;
      totalWeight += 0.20;
    }

    // NOI (weight: 15) — positive NOI is favorable
    if (noi != null) {
      let noiScore: number;
      if (noi > 100000) noiScore = 90;
      else if (noi > 50000) noiScore = 75;
      else if (noi > 20000) noiScore = 60;
      else if (noi > 0) noiScore = 45;
      else noiScore = 20;
      score += noiScore * 0.15;
      factors++;
      totalWeight += 0.15;
    }

    // Occupancy (weight: 15) — higher is better
    if (occupancy_rate != null && occupancy_rate > 0) {
      let occScore: number;
      if (occupancy_rate >= 95) occScore = 95;
      else if (occupancy_rate >= 90) occScore = 80;
      else if (occupancy_rate >= 80) occScore = 65;
      else if (occupancy_rate >= 70) occScore = 45;
      else occScore = 25;
      score += occScore * 0.15;
      factors++;
      totalWeight += 0.15;
    }

    // Square footage value (weight: 10) — price per sqft
    if (square_footage && square_footage > 0 && price > 0) {
      const ppsf = price / square_footage;
      let sqftScore: number;
      if (ppsf < 100) sqftScore = 90;
      else if (ppsf < 200) sqftScore = 75;
      else if (ppsf < 350) sqftScore = 60;
      else if (ppsf < 500) sqftScore = 45;
      else sqftScore = 30;
      score += sqftScore * 0.10;
      factors++;
      totalWeight += 0.10;
    }

    // Building age (weight: 10) — newer buildings score slightly higher
    if (year_built && year_built > 1900) {
      const age = new Date().getFullYear() - year_built;
      let ageScore: number;
      if (age <= 5) ageScore = 90;
      else if (age <= 15) ageScore = 75;
      else if (age <= 30) ageScore = 60;
      else if (age <= 50) ageScore = 45;
      else ageScore = 35;
      score += ageScore * 0.10;
      factors++;
      totalWeight += 0.10;
    }

    // Asset type bonus (weight: 5)
    const assetTypeScores: Record<string, number> = {
      multifamily: 80,
      industrial: 75,
      mixed_use: 70,
      retail: 60,
      office: 55,
      land: 50,
      hospitality: 50,
    };
    if (asset_type && assetTypeScores[asset_type]) {
      score += assetTypeScores[asset_type] * 0.05;
      factors++;
      totalWeight += 0.05;
    }

    // Normalize: if we had factors, scale to 0-100
    let finalScore: number;
    if (totalWeight > 0) {
      finalScore = Math.round(Math.min(100, Math.max(0, score / totalWeight)));
    } else {
      finalScore = 50;
    }

    return NextResponse.json({
      aria_score: finalScore,
      factors_used: factors,
      breakdown: {
        zip_code,
        price,
        asset_type: asset_type || null,
        square_footage: square_footage || null,
        year_built: year_built || null,
        cap_rate: cap_rate || null,
        noi: noi || null,
        occupancy_rate: occupancy_rate || null,
      },
    });
  } catch (error) {
    console.error('ARIA score calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate ARIA score' }, { status: 500 });
  }
}
