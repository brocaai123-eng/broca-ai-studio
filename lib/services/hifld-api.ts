const HIFLD_BASE = 'https://services1.arcgis.com/Hp6G80Pky0om6HgQ/arcgis/rest/services';

export interface SubstationInfo {
  name: string;
  latitude: number;
  longitude: number;
  voltage: string;
  status: string;
  distance_miles: number;
}

export async function getNearestSubstations(
  lat: number,
  lng: number,
  radiusMiles: number = 10
): Promise<SubstationInfo[]> {
  try {
    const radiusMeters = radiusMiles * 1609.34;

    const url = `${HIFLD_BASE}/Electric_Substations/FeatureServer/0/query?` +
      `where=1%3D1` +
      `&geometry=${lng},${lat}` +
      `&geometryType=esriGeometryPoint` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&distance=${radiusMeters}` +
      `&units=esriSRUnit_Meter` +
      `&outFields=NAME,LATITUDE,LONGITUDE,MAX_VOLT,STATUS` +
      `&returnGeometry=false` +
      `&outSR=4326` +
      `&f=json`;

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return [];

    const data = await res.json();
    const features = data.features || [];

    return features.map((f: { attributes: Record<string, string | number> }) => {
      const attrs = f.attributes;
      const dlat = (Number(attrs.LATITUDE) - lat) * 69;
      const dlng = (Number(attrs.LONGITUDE) - lng) * 54.6;
      const distance = Math.sqrt(dlat * dlat + dlng * dlng);

      return {
        name: attrs.NAME || 'Unknown',
        latitude: Number(attrs.LATITUDE),
        longitude: Number(attrs.LONGITUDE),
        voltage: String(attrs.MAX_VOLT || 'N/A'),
        status: String(attrs.STATUS || 'Unknown'),
        distance_miles: Math.round(distance * 10) / 10,
      };
    }).sort((a: SubstationInfo, b: SubstationInfo) => a.distance_miles - b.distance_miles);
  } catch {
    return [];
  }
}

export async function getInfrastructureScore(lat: number, lng: number): Promise<number> {
  const substations = await getNearestSubstations(lat, lng, 5);

  if (substations.length === 0) return 30;
  const nearest = substations[0].distance_miles;

  if (nearest < 1) return 95;
  if (nearest < 2) return 85;
  if (nearest < 3) return 70;
  if (nearest < 5) return 55;
  return 40;
}
