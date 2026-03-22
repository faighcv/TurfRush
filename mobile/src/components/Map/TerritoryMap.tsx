import { useEffect, useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Polygon, UrlTile, Marker, Region } from 'react-native-maps';
import { territoryApi } from '@/lib/api';
import { useAuthStore, useMapStore } from '@/lib/store';
import { geoJsonToHexFeatures, HexFeature } from '@/lib/h3utils';

const INITIAL_REGION = {
  latitude: 45.5017,
  longitude: -73.5673,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function TerritoryMap() {
  const mapRef = useRef<MapView>(null);
  const { user } = useAuthStore();
  const { userLocation, territoryRefreshTick } = useMapStore();
  const [hexes, setHexes] = useState<HexFeature[]>([]);

  const loadTerritory = useCallback(async (r: Region) => {
    const latD = r.latitudeDelta / 2;
    const lngD = r.longitudeDelta / 2;
    try {
      const geoJson = await territoryApi.viewport(
        r.latitude - latD, r.longitude - lngD,
        r.latitude + latD, r.longitude + lngD
      );
      setHexes(geoJsonToHexFeatures(geoJson));
    } catch (e) {
      console.warn('Territory load failed', e);
    }
  }, []);

  useEffect(() => {
    loadTerritory(INITIAL_REGION);
  }, [territoryRefreshTick]);

  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);
    }
  }, [userLocation]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={INITIAL_REGION}
      onRegionChangeComplete={(r) => loadTerritory(r)}
      showsUserLocation={false}
      showsCompass={false}
      showsScale={false}
      rotateEnabled={false}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        opacity={0.35}
      />

      {hexes.map(hex => (
        <Polygon
          key={hex.hexId}
          coordinates={hex.coordinates}
          fillColor={hex.color + (hex.ownerId === user?.id ? '70' : '45')}
          strokeColor={hex.color + 'BB'}
          strokeWidth={hex.ownerId === user?.id ? 2 : 1}
        />
      ))}

      {userLocation && (
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, {
            backgroundColor: user?.avatar_color || '#00D4FF',
            shadowColor: user?.avatar_color || '#00D4FF',
          }]} />
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
});
