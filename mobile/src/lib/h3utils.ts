import { cellToBoundary } from 'h3-js';

export interface HexFeature {
  hexId: string;
  ownerId: string;
  username: string;
  color: string;
  captureCount: number;
}

export function hexToCoords(hexId: string) {
  try {
    const boundary = cellToBoundary(hexId);
    return boundary.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return [];
  }
}

export function geoJsonToHexFeatures(geoJson: any): HexFeature[] {
  if (!geoJson?.features) return [];
  return geoJson.features
    .map((f: any) => f.properties)
    .filter((p: any) => p?.hexId && p?.color);
}
