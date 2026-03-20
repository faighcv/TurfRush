// No h3-js on mobile — Hermes doesn't support the WASM encoding it needs.
// The backend returns GeoJSON with pre-computed polygon coordinates.
// We just parse those directly.

export interface HexFeature {
  hexId: string;
  ownerId: string;
  username: string;
  color: string;
  captureCount: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

export function geoJsonToHexFeatures(geoJson: any): HexFeature[] {
  if (!geoJson?.features) return [];
  return geoJson.features
    .map((f: any) => {
      const p = f.properties;
      if (!p?.hexId || !p?.color) return null;

      // GeoJSON coords are [lng, lat] — flip to {latitude, longitude}
      const ring: number[][] = f.geometry?.coordinates?.[0] ?? [];
      const coordinates = ring.map(([lng, lat]: number[]) => ({
        latitude: lat,
        longitude: lng,
      }));

      return {
        hexId:        p.hexId,
        ownerId:      p.ownerId,
        username:     p.username,
        color:        p.color,
        captureCount: p.captureCount ?? 1,
        coordinates,
      } as HexFeature;
    })
    .filter(Boolean) as HexFeature[];
}
