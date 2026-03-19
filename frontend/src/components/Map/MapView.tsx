'use client';
import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { territoryApi } from '@/lib/api';
import { useAuthStore, useMapStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';

// Dark map style using free OSM tiles via Stadia Maps / OpenFreeMap
const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm',
      paint: {
        'raster-opacity': 1,
        'raster-brightness-max': 0.3,
        'raster-brightness-min': 0,
        'raster-saturation': -0.8,
        'raster-contrast': 0.2,
        'raster-hue-rotate': 200,
      },
    },
  ],
};

interface MapViewProps {
  className?: string;
}

export default function MapView({ className }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const { user } = useAuthStore();
  const { userLocation, territoryRefreshTick } = useMapStore();

  const TERRITORY_SOURCE = 'territory';
  const TERRITORY_FILL   = 'territory-fill';
  const TERRITORY_BORDER = 'territory-border';

  const loadTerritory = useCallback(async () => {
    if (!map.current?.isStyleLoaded()) return;
    const bounds = map.current.getBounds();
    try {
      const geoJson = await territoryApi.viewport(
        bounds.getSouth(), bounds.getWest(),
        bounds.getNorth(), bounds.getEast()
      );

      const src = map.current.getSource(TERRITORY_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geoJson);
      } else {
        map.current.addSource(TERRITORY_SOURCE, { type: 'geojson', data: geoJson });

        // Fill layer — territory color from property
        map.current.addLayer({
          id: TERRITORY_FILL,
          type: 'fill',
          source: TERRITORY_SOURCE,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['==', ['get', 'ownerId'], user?.id ?? ''],
              0.55,
              0.35,
            ],
          },
        });

        // Border layer
        map.current.addLayer({
          id: TERRITORY_BORDER,
          type: 'line',
          source: TERRITORY_SOURCE,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.5,
            'line-opacity': 0.7,
          },
        });

        // Tooltip on hover
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
        map.current.on('mouseenter', TERRITORY_FILL, (e) => {
          map.current!.getCanvas().style.cursor = 'pointer';
          const props = e.features?.[0]?.properties;
          if (props) {
            popup.setLngLat(e.lngLat)
              .setHTML(`
                <div style="font-family:Inter,sans-serif;padding:4px 8px;background:#0f1724;border-radius:6px;border:1px solid #1e2d45;color:#f0f4f8;font-size:12px">
                  <strong style="color:${props.color}">${props.username}</strong><br/>
                  ${props.captureCount} captures
                </div>
              `)
              .addTo(map.current!);
          }
        });
        map.current.on('mouseleave', TERRITORY_FILL, () => {
          map.current!.getCanvas().style.cursor = '';
          popup.remove();
        });
      }
    } catch (e) {
      console.error('Territory load failed', e);
    }
  }, [user?.id]);

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-73.5673, 45.5017], // Montreal default
      zoom: 14,
      pitchWithRotate: false,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      loadTerritory();
      // Connect socket
      getSocket();
    });

    map.current.on('moveend', loadTerritory);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [loadTerritory]);

  // Refresh territory when tick changes (socket broadcast or manual trigger)
  useEffect(() => {
    if (territoryRefreshTick > 0) loadTerritory();
  }, [territoryRefreshTick, loadTerritory]);

  // Update user's location dot on map
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (!userMarker.current) {
      // Create custom location dot
      const el = document.createElement('div');
      el.style.cssText = `
        width:16px;height:16px;border-radius:50%;
        background:${user?.avatar_color || '#00D4FF'};
        border:3px solid white;
        box-shadow:0 0 0 3px ${user?.avatar_color || '#00D4FF'}60, 0 0 20px ${user?.avatar_color || '#00D4FF'}80;
      `;
      userMarker.current = new maplibregl.Marker({ element: el }).setLngLat(userLocation).addTo(map.current);
    } else {
      userMarker.current.setLngLat(userLocation);
    }

    // Pan to user
    map.current.easeTo({ center: userLocation, duration: 500 });
  }, [userLocation, user?.avatar_color]);

  return (
    <div ref={mapContainer} className={className} />
  );
}
