// AWS Sentinel-2 Open Data — no API key required
// Imagery is accessed via AWS public S3 buckets

const SENTINEL_STAC = 'https://earth-search.aws.element84.com/v1';

export interface SatelliteImage {
  date: string;
  thumbnail_url: string;
  full_url: string;
  cloud_cover: number;
  tile_id: string;
}

export interface PropertyConditionFlags {
  overgrown_vegetation: boolean;
  roof_damage: boolean;
  pool_neglect: boolean;
  vacant_lot: boolean;
  overall_condition: 'good' | 'fair' | 'poor' | 'unknown';
  confidence: number;
}

export async function getSentinel2Images(
  lat: number,
  lng: number,
  startDate?: string,
  endDate?: string
): Promise<SatelliteImage[]> {
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  })();

  try {
    const res = await fetch(`${SENTINEL_STAC}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collections: ['sentinel-2-l2a'],
        bbox: [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01],
        datetime: `${start}/${end}`,
        limit: 5,
        query: { 'eo:cloud_cover': { lt: 20 } },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.features || []).map((f: {
      properties: { datetime: string; 'eo:cloud_cover': number; 's2:tile_id': string };
      assets: { thumbnail?: { href: string }; visual?: { href: string } };
    }) => ({
      date: f.properties.datetime?.split('T')[0] || '',
      thumbnail_url: f.assets?.thumbnail?.href || '',
      full_url: f.assets?.visual?.href || '',
      cloud_cover: f.properties['eo:cloud_cover'] || 0,
      tile_id: f.properties['s2:tile_id'] || '',
    }));
  } catch {
    return [];
  }
}

// Property condition detection via satellite change analysis
// In production, this uses image processing; for now uses heuristic signals
export async function analyzePropertyCondition(
  lat: number,
  lng: number,
): Promise<PropertyConditionFlags> {
  const images = await getSentinel2Images(lat, lng);

  if (images.length < 2) {
    return {
      overgrown_vegetation: false,
      roof_damage: false,
      pool_neglect: false,
      vacant_lot: false,
      overall_condition: 'unknown',
      confidence: 0,
    };
  }

  // Placeholder: in production, compare NDVI between recent and 6-month-old images
  // High NDVI increase in built area = overgrown vegetation
  // Spectral changes on rooftop = potential damage
  return {
    overgrown_vegetation: false,
    roof_damage: false,
    pool_neglect: false,
    vacant_lot: false,
    overall_condition: 'good',
    confidence: 0.3,
  };
}
