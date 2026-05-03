const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export function getStaticMapUrl(lat: number, lng: number, zoom: number = 15, size: string = '600x400'): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&key=${GOOGLE_MAPS_API_KEY}`;
}

export function getStreetViewUrl(lat: number, lng: number, size: string = '600x400'): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
}

export function getEmbedMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=15`;
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!res.ok) return null;
    const data = await res.json();

    if (data.results?.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted: result.formatted_address,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPlaceAutocomplete(input: string): Promise<Array<{ description: string; place_id: string }>> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.predictions || []).map((p: { description: string; place_id: string }) => ({
      description: p.description,
      place_id: p.place_id,
    }));
  } catch {
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<{
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
} | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,address_components,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!res.ok) return null;
    const data = await res.json();
    const result = data.result;
    if (!result) return null;

    const components = result.address_components || [];
    const getComponent = (type: string) =>
      components.find((c: { types: string[] }) => c.types.includes(type))?.short_name || '';

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      address: result.formatted_address,
      city: getComponent('locality') || getComponent('sublocality'),
      state: getComponent('administrative_area_level_1'),
      zip: getComponent('postal_code'),
    };
  } catch {
    return null;
  }
}
