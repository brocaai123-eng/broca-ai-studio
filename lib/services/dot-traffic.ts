export interface TrafficCount {
  road_name: string;
  daily_count: number;
  year: number;
  direction: string;
  lat: number;
  lng: number;
}

// DOT traffic data is downloaded and stored locally
// This service queries the local database or provides fallback estimates
export async function getTrafficCountByZip(zip: string): Promise<TrafficCount[]> {
  // In production, this queries the traffic_data table
  // For now return estimated data for South Florida corridors
  const corridors: Record<string, TrafficCount[]> = {
    '33401': [
      { road_name: 'I-95', daily_count: 145000, year: 2024, direction: 'NB/SB', lat: 26.7153, lng: -80.0534 },
      { road_name: 'Okeechobee Blvd', daily_count: 42000, year: 2024, direction: 'EB/WB', lat: 26.7120, lng: -80.0600 },
    ],
    '33470': [
      { road_name: 'SR-7', daily_count: 35000, year: 2024, direction: 'NB/SB', lat: 26.6300, lng: -80.1700 },
      { road_name: 'Southern Blvd', daily_count: 28000, year: 2024, direction: 'EB/WB', lat: 26.6550, lng: -80.1500 },
    ],
  };

  return corridors[zip] || [];
}

export function getTrafficScore(dailyCount: number): number {
  if (dailyCount > 100000) return 95;
  if (dailyCount > 50000) return 80;
  if (dailyCount > 25000) return 65;
  if (dailyCount > 10000) return 50;
  return 30;
}

export function isCommercialViable(dailyCount: number): boolean {
  return dailyCount > 15000;
}
