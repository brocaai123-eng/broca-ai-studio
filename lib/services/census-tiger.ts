const TIGER_BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';

export interface ZipBoundary {
  zip: string;
  geometry: Array<{ lat: number; lng: number }>;
  areaLandSqMi: number;
  areaWaterSqMi: number;
}

export async function getZipBoundary(zip: string): Promise<ZipBoundary | null> {
  try {
    const url = `${TIGER_BASE}/tigerWMS_Census2020/MapServer/2/query?where=ZCTA5CE20='${zip}'&outFields=*&outSR=4326&f=json`;

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const rings = feature.geometry?.rings?.[0] || [];
    return {
      zip,
      geometry: rings.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] })),
      areaLandSqMi: (feature.attributes?.ALAND20 || 0) / 2589988,
      areaWaterSqMi: (feature.attributes?.AWATER20 || 0) / 2589988,
    };
  } catch {
    return null;
  }
}

export async function getCountyBoundary(countyFips: string, stateFips: string = '12'): Promise<Array<{ lat: number; lng: number }>> {
  try {
    const url = `${TIGER_BASE}/tigerWMS_Census2020/MapServer/82/query?where=STATEFP20='${stateFips}' AND COUNTYFP20='${countyFips}'&outFields=*&outSR=4326&f=json`;

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return [];

    const data = await res.json();
    const rings = data.features?.[0]?.geometry?.rings?.[0] || [];
    return rings.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }));
  } catch {
    return [];
  }
}
