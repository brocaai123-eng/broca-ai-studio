const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export interface ParcelData {
  boundary: Array<{ lat: number; lng: number }>;
  land_use: string;
  name: string;
}

export interface NearbyPOI {
  name: string;
  type: string;
  distance_m: number;
  lat: number;
  lng: number;
}

export async function getParcelBoundary(lat: number, lng: number, radius: number = 100): Promise<ParcelData | null> {
  const query = `
    [out:json][timeout:10];
    way(around:${radius},${lat},${lng})["building"];
    out geom;
  `;

  try {
    const res = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) return null;
    const data = await res.json();

    const building = data.elements?.[0];
    if (!building?.geometry) return null;

    return {
      boundary: building.geometry.map((p: { lat: number; lon: number }) => ({ lat: p.lat, lng: p.lon })),
      land_use: building.tags?.landuse || building.tags?.['building:use'] || 'residential',
      name: building.tags?.name || '',
    };
  } catch {
    return null;
  }
}

export async function getNearbyPOIs(lat: number, lng: number, radius: number = 1000): Promise<NearbyPOI[]> {
  const query = `
    [out:json][timeout:15];
    (
      node(around:${radius},${lat},${lng})["amenity"~"school|hospital|pharmacy|bank|restaurant|supermarket"];
      node(around:${radius},${lat},${lng})["leisure"~"park|playground"];
      node(around:${radius},${lat},${lng})["shop"~"supermarket|mall"];
    );
    out body;
  `;

  try {
    const res = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.elements || []).slice(0, 20).map((el: { tags?: Record<string, string>; lat: number; lon: number }) => {
      const type = el.tags?.amenity || el.tags?.leisure || el.tags?.shop || 'other';
      const dlat = el.lat - lat;
      const dlng = el.lon - lng;
      const distance_m = Math.round(Math.sqrt(dlat * dlat + dlng * dlng) * 111320);

      return {
        name: el.tags?.name || type,
        type,
        distance_m,
        lat: el.lat,
        lng: el.lon,
      };
    });
  } catch {
    return [];
  }
}

export async function getLandUse(lat: number, lng: number): Promise<string> {
  const query = `
    [out:json][timeout:10];
    way(around:50,${lat},${lng})["landuse"];
    out tags;
  `;

  try {
    const res = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data.elements?.[0]?.tags?.landuse || 'unknown';
  } catch {
    return 'unknown';
  }
}
