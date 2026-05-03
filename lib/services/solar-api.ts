const GOOGLE_SOLAR_KEY = process.env.GOOGLE_SOLAR_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
const NREL_API_KEY = process.env.NREL_API_KEY || '';

export interface SolarProfile {
  max_panel_count: number;
  annual_kwh: number;
  annual_savings_usd: number;
  solar_score: number; // 0-100
  federal_tax_credit_usd: number;
  payback_years: number;
}

export async function getGoogleSolarData(lat: number, lng: number): Promise<SolarProfile | null> {
  if (!GOOGLE_SOLAR_KEY) return getNRELSolarData(lat, lng);

  try {
    const res = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_SOLAR_KEY}`,
      { next: { revalidate: 604800 } }
    );

    if (!res.ok) return getNRELSolarData(lat, lng);
    const data = await res.json();

    const panels = data.solarPotential?.maxArrayPanelsCount || 0;
    const yearlyKwh = data.solarPotential?.maxSunshineHoursPerYear * panels * 0.4 || 0;
    const savings = yearlyKwh * 0.13;
    const installCost = panels * 350;

    return {
      max_panel_count: panels,
      annual_kwh: Math.round(yearlyKwh),
      annual_savings_usd: Math.round(savings),
      solar_score: Math.min(100, Math.round((yearlyKwh / 15000) * 100)),
      federal_tax_credit_usd: Math.round(installCost * 0.30),
      payback_years: savings > 0 ? Math.round((installCost * 0.7) / savings) : 0,
    };
  } catch {
    return getNRELSolarData(lat, lng);
  }
}

export async function getNRELSolarData(lat: number, lng: number): Promise<SolarProfile | null> {
  try {
    const url = NREL_API_KEY
      ? `https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=${NREL_API_KEY}&lat=${lat}&lon=${lng}`
      : `https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=DEMO_KEY&lat=${lat}&lon=${lng}`;

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const data = await res.json();

    const ghi = data.outputs?.avg_ghi?.annual || 4.5;
    const estimatedPanels = 20;
    const yearlyKwh = ghi * 365 * estimatedPanels * 0.4;
    const savings = yearlyKwh * 0.13;
    const installCost = estimatedPanels * 350;

    return {
      max_panel_count: estimatedPanels,
      annual_kwh: Math.round(yearlyKwh),
      annual_savings_usd: Math.round(savings),
      solar_score: Math.min(100, Math.round((ghi / 6) * 100)),
      federal_tax_credit_usd: Math.round(installCost * 0.30),
      payback_years: savings > 0 ? Math.round((installCost * 0.7) / savings) : 0,
    };
  } catch {
    return null;
  }
}
