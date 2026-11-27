import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';

// Ensure MapLibre GL v6.19+ WebWorker always resolves with valid application/javascript MIME type in Vite
maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.js`);
import {
  Radar,
  Layers,
  Box,
  Compass,
  Plus,
  Minus,
  LocateFixed,
  Route,
  X,
  Star,
  ArrowLeftRight,
  BookmarkPlus,
  Check,
  Car,
  Footprints,
  Sun,
} from 'lucide-react';
import type { CityName, RankedVenue, Venue, VenueCategory } from '../types';
import { CITY_CENTERS, CITY_NEIGHBORHOODS, VENUE_CATEGORIES, type NeighborhoodHotspot } from '../data/venues';
import { scoreColor } from '../utils/elo';
import type { MapBoundsBox } from '../utils/overpass';
import type { ActiveRouteData } from '../utils/routingAndGeo';
import { getCachedVenueThumb } from '../utils/pythonGmapsClient';
import { fetchTerraceWeather, type TerraceWeatherInfo } from '../utils/terraceWeather';

interface TurkeyMap3DProps {
  city: CityName;
  visibleVenues: Venue[];
  ranked: RankedVenue[];
  wantToGoIds: string[];
  selectedVenueId: string | null;
  activeRoute: ActiveRouteData | null;
  loadingLiveOsm: boolean;
  liveOsmMsg: string | null;
  onSelectVenue: (venueId: string | null) => void;
  onRankVenue: (venue: Venue) => void;
  onToggleWant: (venueId: string) => void;
  onStartRoute: (venue: Venue, mode: 'driving' | 'walking') => void;
  onClearRoute: () => void;
  onFetchLiveArea: (bounds: MapBoundsBox, force?: boolean) => void;
  onPickPoint?: (lat: number, lng: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  activeCategory?: VenueCategory | 'Tümü';
  onSelectCategory?: (cat: VenueCategory | 'Tümü') => void;
}

type MapStyleMode = 'apple3d' | 'night3d' | 'googleStreet' | 'googleSat' | 'organicTopo';

const STYLE_LABELS: Record<MapStyleMode, string> = {
  apple3d: 'Tadım 3D',
  night3d: 'Gece 3D',
  googleStreet: 'Google',
  googleSat: 'Uydu',
  organicTopo: 'Topo',
};

const CARTO_VECTOR_TILES = [
  'https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
  'https://tiles-b.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
  'https://tiles-c.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
  'https://tiles-d.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
];
const CARTO_GLYPHS = 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf';

function buildTadimVectorStyle(isNight: boolean): StyleSpecification {
  return {
    version: 8,
    glyphs: CARTO_GLYPHS,
    sources: {
      'carto-vector': {
        type: 'vector',
        tiles: CARTO_VECTOR_TILES,
        minzoom: 0,
        maxzoom: 14,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      },
    },
    layers: [
      {
        id: 'bg',
        type: 'background',
        paint: { 'background-color': isNight ? '#09181F' : '#F4F1EA' },
      },
      {
        id: 'landuse-res',
        type: 'fill',
        source: 'carto-vector',
        'source-layer': 'landuse',
        filter: ['in', 'class', 'residential', 'suburb', 'neighbourhood'],
        paint: {
          'fill-color': isNight ? '#0C1E26' : '#EFECE4',
          'fill-opacity': 0.7,
        },
      },
      {
        id: 'landcover-green',
        type: 'fill',
        source: 'carto-vector',
        'source-layer': 'landcover',
        filter: ['in', 'class', 'grass', 'wood'],
        paint: {
          'fill-color': isNight ? '#0E2925' : '#DCEBD9',
          'fill-opacity': 0.85,
        },
      },
      {
        id: 'park-fill',
        type: 'fill',
        source: 'carto-vector',
        'source-layer': 'park',
        paint: {
          'fill-color': isNight ? '#0F2E29' : '#D4E8D0',
          'fill-opacity': 0.88,
        },
      },
      {
        id: 'water-fill',
        type: 'fill',
        source: 'carto-vector',
        'source-layer': 'water',
        paint: {
          'fill-color': isNight ? '#0B3B44' : '#82CED6',
        },
      },
      {
        id: 'road-casing-minor',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['in', 'class', 'minor', 'service', 'street'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': isNight ? '#132A33' : '#E2DDD3',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 15, 5, 18, 11],
        },
      },
      {
        id: 'road-casing-major',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': isNight ? '#15323D' : '#D6CFC2',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 3.5, 15, 8.5, 18, 17],
        },
      },
      {
        id: 'road-pedestrian',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'transportation',
        minzoom: 14,
        filter: ['==', 'class', 'path'],
        paint: {
          'line-color': isNight ? '#1B3A46' : '#E6DFD3',
          'line-dasharray': [2, 1.5],
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.2, 17, 2.8],
        },
      },
      {
        id: 'road-fill-minor',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['in', 'class', 'minor', 'service', 'street'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': isNight ? '#193641' : '#FFFFFF',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.9, 15, 3.6, 18, 8.5],
        },
      },
      {
        id: 'road-fill-major',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': isNight ? '#1F4452' : '#FFFDF9',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 2.4, 15, 6.5, 18, 14],
        },
      },
      {
        id: 'road-fill-highway',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'motorway', 'trunk'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': isNight ? '#245363' : '#FDE6B8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 12, 3, 15, 7.5, 18, 15],
        },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'carto-vector',
        'source-layer': 'boundary',
        filter: ['==', 'admin_level', 2],
        paint: {
          'line-color': isNight ? '#335C67' : '#94A3B8',
          'line-width': 1.2,
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'building-2d',
        type: 'fill',
        source: 'carto-vector',
        'source-layer': 'building',
        minzoom: 12,
        maxzoom: 12.8,
        paint: {
          'fill-color': isNight ? '#112730' : '#E7E1D6',
          'fill-opacity': 0.7,
        },
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'carto-vector',
        'source-layer': 'building',
        minzoom: 12.6,
        paint: {
          'fill-extrusion-height': ['max', ['coalesce', ['get', 'render_height'], 16], 12],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-color': isNight
            ? [
                'interpolate',
                ['linear'],
                ['max', ['coalesce', ['get', 'render_height'], 16], 12],
                0,
                '#122B34',
                25,
                '#183C47',
                75,
                '#235764',
              ]
            : [
                'interpolate',
                ['linear'],
                ['max', ['coalesce', ['get', 'render_height'], 16], 12],
                0,
                '#EDE7DC',
                20,
                '#E2DDD2',
                55,
                '#C7D6DC',
                110,
                '#9BBAC4',
              ],
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'water-label',
        type: 'symbol',
        source: 'carto-vector',
        'source-layer': 'water_name',
        minzoom: 8,
        layout: {
          'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name'], ['get', 'name:latin']],
          'text-font': ['Open Sans Italic', 'Noto Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': isNight ? '#5EEAD4' : '#0E626D',
          'text-halo-color': isNight ? 'rgba(9,24,31,0.85)' : 'rgba(255,255,255,0.85)',
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'road-label',
        type: 'symbol',
        source: 'carto-vector',
        'source-layer': 'transportation_name',
        minzoom: 13,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name'], ['get', 'name:latin']],
          'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 11.5],
        },
        paint: {
          'text-color': isNight ? '#94B8C2' : '#475569',
          'text-halo-color': isNight ? 'rgba(9,24,31,0.9)' : 'rgba(255,255,255,0.92)',
          'text-halo-width': 1.6,
        },
      },
      {
        id: 'place-neighbourhood',
        type: 'symbol',
        source: 'carto-vector',
        'source-layer': 'place',
        minzoom: 11.5,
        filter: ['in', 'class', 'suburb', 'quarter', 'neighbourhood'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name'], ['get', 'name:latin']],
          'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.08,
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 11.5],
        },
        paint: {
          'text-color': isNight ? '#67A3B0' : '#5B6B73',
          'text-halo-color': isNight ? 'rgba(9,24,31,0.92)' : 'rgba(244,241,234,0.95)',
          'text-halo-width': 1.8,
        },
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'carto-vector',
        'source-layer': 'place',
        maxzoom: 14,
        filter: ['in', 'class', 'city', 'town'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name'], ['get', 'name:latin']],
          'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 10, 14, 13, 16],
        },
        paint: {
          'text-color': isNight ? '#E2F1F4' : '#0F172A',
          'text-halo-color': isNight ? 'rgba(9,24,31,0.95)' : 'rgba(255,255,255,0.95)',
          'text-halo-width': 2,
        },
      },
      {
        id: 'poi-food',
        type: 'symbol',
        source: 'carto-vector',
        'source-layer': 'poi',
        minzoom: 14.2,
        filter: ['in', 'class', 'restaurant', 'cafe', 'fast_food', 'bakery', 'ice_cream', 'bar', 'pub', 'pastry', 'grocery', 'shop'],
        layout: {
          'text-field': ['coalesce', ['get', 'name:tr'], ['get', 'name'], ['get', 'name:latin']],
          'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
          'text-size': 10,
          'text-max-width': 10,
          'text-optional': true,
        },
        paint: {
          'text-color': isNight ? '#7DD3FC' : '#64748B',
          'text-halo-color': isNight ? 'rgba(9,24,31,0.9)' : 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.4,
        },
      },
    ],
  };
}

function buildRasterStyle(
  tileUrl: string,
  attribution: string,
  bg: string,
  isSatellite = false
): StyleSpecification {
  return {
    version: 8,
    glyphs: CARTO_GLYPHS,
    sources: {
      'raster-base': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution,
      },
      'carto-vector': {
        type: 'vector',
        tiles: CARTO_VECTOR_TILES,
        minzoom: 0,
        maxzoom: 14,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': bg } },
      { id: 'raster-layer', type: 'raster', source: 'raster-base' },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'carto-vector',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': isSatellite
            ? [
                'interpolate',
                ['linear'],
                ['max', ['coalesce', ['get', 'render_height'], 18], 14],
                0,
                '#93C5FD',
                28,
                '#60A5FA',
                75,
                '#3B82F6',
              ]
            : [
                'interpolate',
                ['linear'],
                ['max', ['coalesce', ['get', 'render_height'], 18], 14],
                0,
                '#EAE6DF',
                24,
                '#DCE2EA',
                65,
                '#AFC2D6',
              ],
          'fill-extrusion-height': ['max', ['coalesce', ['get', 'render_height'], 18], 14],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': isSatellite ? 0.56 : 0.84,
          'fill-extrusion-vertical-gradient': true,
        },
      },
    ],
  };
}

function getStyleSource(mode: MapStyleMode): StyleSpecification {
  if (mode === 'apple3d') return buildTadimVectorStyle(false);
  if (mode === 'night3d') return buildTadimVectorStyle(true);
  if (mode === 'googleStreet') {
    return buildRasterStyle(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=tr',
      '&copy; Google Maps &middot; 3D Binalar: CARTO',
      '#F1F5F9',
      false
    );
  }
  if (mode === 'googleSat') {
    return buildRasterStyle(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=tr',
      '&copy; Google Hybrid Satellite &middot; 3D Binalar: CARTO',
      '#0F172A',
      true
    );
  }
  return buildRasterStyle(
    'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    '&copy; OpenTopoMap &copy; Organic Maps / OSM',
    '#E8EFEA',
    false
  );
}

/**
 * Applies TadımRotası directional sun/moon lighting and sky horizon atmosphere.
 */
function enhanceAppleStyle3D(map: maplibregl.Map, mode: MapStyleMode) {
  try {
    map.setLight({
      anchor: 'viewport',
      color: mode === 'night3d' ? '#99F6E4' : '#FFF8EB',
      intensity: mode === 'night3d' ? 0.42 : 0.58,
      position: mode === 'night3d' ? [1.3, 200, 42] : [1.35, 210, 36],
    });
  } catch {
    // Ignore on restricted WebGL drivers
  }

  if (mode === 'apple3d' || mode === 'night3d') {
    try {
      const skyMap = map as unknown as { setSky?: (sky: Record<string, unknown>) => void };
      skyMap.setSky?.(
        mode === 'night3d'
          ? {
              'sky-color': '#061821',
              'sky-horizon-blend': 0.5,
              'horizon-color': '#0E2E36',
              'horizon-fog-blend': 0.6,
              'fog-color': '#091E24',
              'fog-ground-blend': 0.82,
            }
          : {
              'sky-color': '#CBE7EE',
              'sky-horizon-blend': 0.45,
              'horizon-color': '#F8F4EC',
              'horizon-fog-blend': 0.55,
              'fog-color': '#F5F1E8',
              'fog-ground-blend': 0.82,
            }
      );
    } catch {
      // Ignore if setSky is unsupported on current GPU
    }
  }
}

function categoryColor(cat: Venue['category'], isWant: boolean): string {
  if (isWant) return '#0B4A4F';
  switch (cat) {
    case 'Döner & Ocakbaşı':
      return '#D97706';
    case '3. Nesil Kahve':
      return '#7C3AED';
    case 'Tatlı & Pastane':
      return '#DB2777';
    case 'Meyhane & Bistro':
      return '#0284C7';
    case 'Kahvaltı & Fırın':
      return '#059669';
    case 'Sokak Lezzeti':
      return '#EA580C';
    default:
      return '#0F766E';
  }
}

function buildVenuesGeoJson(
  venues: Venue[],
  rankMap: Map<string, RankedVenue>,
  wantSet: Set<string>
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: venues
      .filter((v) => !rankMap.has(v.id))
      .map((v) => {
        const isWant = wantSet.has(v.id);
        const ratingStr = v.googleRating ? ` ★${v.googleRating.toFixed(1)}` : '';
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [v.lng, v.lat],
          },
          properties: {
            id: v.id,
            name: v.name,
            label: `${v.name}${ratingStr}`,
            color: categoryColor(v.category, isWant),
            isWant: isWant ? 1 : 0,
          },
        };
      }),
  };
}

export function TurkeyMap3D({
  city,
  visibleVenues,
  ranked,
  wantToGoIds,
  selectedVenueId,
  activeRoute,
  loadingLiveOsm,
  liveOsmMsg,
  onSelectVenue,
  onRankVenue,
  onToggleWant,
  onStartRoute,
  onClearRoute,
  onFetchLiveArea,
  onPickPoint,
  userLocation,
  activeCategory,
  onSelectCategory,
}: TurkeyMap3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const styleLoadedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const isFirstCityEffect = useRef(true);

  const visibleVenuesRef = useRef(visibleVenues);
  visibleVenuesRef.current = visibleVenues;
  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;
  const wantRef = useRef(wantToGoIds);
  wantRef.current = wantToGoIds;
  const onSelectRef = useRef(onSelectVenue);
  onSelectRef.current = onSelectVenue;
  const onFetchRef = useRef(onFetchLiveArea);
  onFetchRef.current = onFetchLiveArea;
  const onPickRef = useRef(onPickPoint);
  onPickRef.current = onPickPoint;

  const [styleMode, setStyleMode] = useState<MapStyleMode>('apple3d');
  const styleModeRef = useRef<MapStyleMode>('apple3d');
  styleModeRef.current = styleMode;
  const [is3D, setIs3D] = useState(true);
  const [bearing, setBearing] = useState(-22);
  const [locating, setLocating] = useState(false);
  const [terraceWeather, setTerraceWeather] = useState<TerraceWeatherInfo | null>(null);

  const selectedVenue = selectedVenueId
    ? visibleVenues.find((v) => v.id === selectedVenueId) ?? null
    : null;
  const selectedRank = selectedVenue ? ranked.find((r) => r.venueId === selectedVenue.id) : null;
  const selectedIsWant = selectedVenue ? wantToGoIds.includes(selectedVenue.id) : false;

  // Fetch live Open-Meteo terrace weather whenever a venue is selected
  useEffect(() => {
    if (!selectedVenue) {
      setTerraceWeather(null);
      return;
    }
    let alive = true;
    void fetchTerraceWeather(selectedVenue.lat, selectedVenue.lng).then((info) => {
      if (alive) setTerraceWeather(info);
    });
    return () => {
      alive = false;
    };
  }, [selectedVenue]);

  const syncVenueLayers = (map: maplibregl.Map, activeMode: MapStyleMode = styleModeRef.current) => {
    const rankMap = new Map(rankedRef.current.map((r) => [r.venueId, r]));
    const wantSet = new Set(wantRef.current);
    const data = buildVenuesGeoJson(visibleVenuesRef.current, rankMap, wantSet);
    const isDarkTextBg = activeMode === 'googleSat' || activeMode === 'night3d';

    const existing = map.getSource('tr-venues') as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data);
      if (map.getLayer('tr-venues-labels')) {
        map.setPaintProperty('tr-venues-labels', 'text-color', isDarkTextBg ? '#FFFFFF' : '#0F172A');
        map.setPaintProperty(
          'tr-venues-labels',
          'text-halo-color',
          isDarkTextBg ? 'rgba(9, 24, 31, 0.94)' : 'rgba(255, 255, 255, 0.96)'
        );
      }
      return;
    }

    // Native GPU-accelerated Clustering + Unclustered Restaurant Points (handles 3,500+ venues at 60fps!)
    map.addSource('tr-venues', {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 42,
    });

    // Cluster bubbles when zoomed out
    map.addLayer({
      id: 'tr-clusters',
      type: 'circle',
      source: 'tr-venues',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#0B4A4F',
        'circle-radius': ['step', ['get', 'point_count'], 18, 40, 22, 150, 27],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    map.addLayer({
      id: 'tr-cluster-count',
      type: 'symbol',
      source: 'tr-venues',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#FFFFFF',
      },
    });

    // Ambient outer halo under gastronomy pins
    map.addLayer({
      id: 'tr-venues-glow',
      type: 'circle',
      source: 'tr-venues',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 9, 14, 13, 16.5, 17],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.22,
        'circle-blur': 0.65,
      },
    });

    // Individual restaurant pins (color-coded by category)
    map.addLayer({
      id: 'tr-venues-dots',
      type: 'circle',
      source: 'tr-venues',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          ['case', ['==', ['get', 'isWant'], 1], 7, 5],
          14,
          ['case', ['==', ['get', 'isWant'], 1], 9.5, 7.5],
          16.5,
          ['case', ['==', ['get', 'isWant'], 1], 11.5, 9.5],
        ],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    // Restaurant Name + Star Rating Labels (`Çiya Sofrası ★4.8`)
    map.addLayer({
      id: 'tr-venues-labels',
      type: 'symbol',
      source: 'tr-venues',
      filter: ['!', ['has', 'point_count']],
      minzoom: 13.2,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Bold', 'Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13.2, 10.5, 16, 12],
        'text-offset': [0, 1.05],
        'text-anchor': 'top',
        'text-max-width': 13,
        'text-optional': true,
      },
      paint: {
        'text-color': isDarkTextBg ? '#FFFFFF' : '#0F172A',
        'text-halo-color': isDarkTextBg ? 'rgba(9, 24, 31, 0.94)' : 'rgba(255, 255, 255, 0.96)',
        'text-halo-width': 1.8,
      },
    });

    // Click cluster -> zoom smoothly into that neighborhood's 3D buildings
    map.on('click', 'tr-clusters', (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      const coords = feature.geometry.coordinates as [number, number];
      map.flyTo({
        center: coords,
        zoom: Math.max(map.getZoom() + 2.5, 15.2),
        pitch: 58,
        duration: 750,
      });
    });

    map.on('click', 'tr-venues-dots', (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) onSelectRef.current(id);
    });
    map.on('click', 'tr-venues-labels', (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) onSelectRef.current(id);
    });

    for (const layerId of ['tr-clusters', 'tr-venues-dots', 'tr-venues-labels']) {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    }
  };

  // Initialize MapLibre GL 3D WebGL Map right inside 3D buildings (zoom 15.5, pitch 60°)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const initial = CITY_CENTERS[city];
    const map = new maplibregl.Map({
      container: el,
      style: getStyleSource('apple3d'),
      center: [initial.lng, initial.lat],
      zoom: initial.zoom,
      pitch: 60,
      bearing: -22,
      maxPitch: 72,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    // Provide a transparent 1x1 fallback image for any missing OSM POI sprite icons
    map.on('styleimagemissing', (e) => {
      const id = e.id;
      if (!id || map.hasImage(id)) return;
      map.addImage(id, {
        width: 1,
        height: 1,
        data: new Uint8Array([0, 0, 0, 0]),
      });
    });

    const onStyleReady = () => {
      styleLoadedRef.current = true;
      enhanceAppleStyle3D(map, styleModeRef.current);
      syncVenueLayers(map, styleModeRef.current);
    };

    map.on('style.load', onStyleReady);
    map.on('rotate', () => setBearing(Math.round(map.getBearing())));
    map.on('pitchend', () => setIs3D(map.getPitch() > 15));

    // Auto-stream additional street restaurants when panning to any unharvested district
    map.on('moveend', () => {
      if (map.getZoom() < 12.2) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const b = map.getBounds();
        onFetchRef.current(
          {
            south: b.getSouth(),
            west: b.getWest(),
            north: b.getNorth(),
            east: b.getEast(),
          },
          false
        );
      }, 1100);
    });

    // Click any unpinned place on the Google map -> open/add that exact point
    map.on('click', (e) => {
      const layerIds = ['tr-clusters', 'tr-venues-dots', 'tr-venues-labels'].filter((id) => map.getLayer(id));
      const hits = layerIds.length ? map.queryRenderedFeatures(e.point, { layers: layerIds }) : [];
      if (hits.length > 0 || map.getZoom() < 14) return;
      onPickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    });

    // Initial live scan so the first neighborhood fills densely
    map.once('idle', () => {
      const b = map.getBounds();
      onFetchRef.current({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }, false);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    mapRef.current = map;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
  }, []);

  // Switch map engine (Tadım 3D / Gece 3D / Google / Uydu / Topo)
  const prevStyleRef = useRef<MapStyleMode>('apple3d');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || prevStyleRef.current === styleMode) return;
    prevStyleRef.current = styleMode;
    styleLoadedRef.current = false;

    map.setStyle(getStyleSource(styleMode));
  }, [styleMode]);

  // Smooth 3D flyTo when switching cities
  useEffect(() => {
    if (isFirstCityEffect.current) {
      isFirstCityEffect.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const target = CITY_CENTERS[city];
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom,
      pitch: city === 'Tüm Türkiye' ? 15 : is3D ? 60 : 0,
      bearing: city === 'Tüm Türkiye' ? 0 : -22,
      duration: 950,
      essential: true,
    });
    if (city !== 'Tüm Türkiye') {
      window.setTimeout(() => {
        onFetchRef.current(
          {
            south: target.lat - 0.025,
            north: target.lat + 0.025,
            west: target.lng - 0.032,
            east: target.lng + 0.032,
          },
          false
        );
      }, 400);
    }
  }, [city]);

  // Smooth 3D focus when selecting a venue
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVenueId) return;
    const target = visibleVenuesRef.current.find((v) => v.id === selectedVenueId);
    if (!target) return;
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: Math.max(map.getZoom(), 16.1),
      pitch: is3D ? 62 : 0,
      duration: 650,
      essential: true,
    });
  }, [selectedVenueId]);

  // Sync GeoJSON layer + crisp DOM markers for Ranked Elo scores and Active Selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (styleLoadedRef.current && map.isStyleLoaded()) {
      syncVenueLayers(map);
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const rankMap = new Map(ranked.map((r) => [r.venueId, r]));

    visibleVenues.forEach((venue) => {
      const rank = rankMap.get(venue.id);
      const isSelected = selectedVenueId === venue.id;
      if (!rank && !isSelected) return;

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', venue.name);

      if (rank) {
        const bg = scoreColor(rank.score);
        el.className = `tr-pin-score ${isSelected ? 'tr-pin-selected' : ''}`;
        el.style.width = isSelected ? '44px' : '34px';
        el.style.height = isSelected ? '44px' : '34px';
        el.style.background = bg;
        el.textContent = rank.score.toFixed(1);
      } else {
        el.className = 'tr-pin-active';
        el.innerHTML = '<span></span>';
      }

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onSelectRef.current(venue.id);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [visibleVenues, ranked, wantToGoIds, selectedVenueId]);

  // Render 3D Turn-by-Turn Route Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current || !map.isStyleLoaded()) return;

    const emptyRoute: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: activeRoute
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: activeRoute.coordinates,
              },
              properties: {},
            },
          ]
        : [],
    };

    const existing = map.getSource('tr-route') as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(emptyRoute);
    } else {
      map.addSource('tr-route', { type: 'geojson', data: emptyRoute });
      map.addLayer({
        id: 'tr-route-casing',
        type: 'line',
        source: 'tr-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': 9, 'line-opacity': 0.92 },
      });
      map.addLayer({
        id: 'tr-route-line',
        type: 'line',
        source: 'tr-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#059669', 'line-width': 5.5 },
      });
    }

    if (activeRoute && activeRoute.coordinates.length >= 2) {
      const bounds = new maplibregl.LngLatBounds(
        activeRoute.coordinates[0],
        activeRoute.coordinates[0]
      );
      for (const coord of activeRoute.coordinates) {
        bounds.extend(coord);
      }
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 130, left: 70, right: 70 },
        pitch: is3D ? 55 : 0,
        duration: 850,
      });
    }
  }, [activeRoute, is3D]);

  // User location blue dot + fly to it
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;
    const el = document.createElement('div');
    el.style.cssText =
      'width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 8px rgba(37,99,235,0.22)';
    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
    map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15.6, pitch: is3D ? 55 : 0, duration: 900 });
  }, [userLocation]);

  const handleFlyHotspot = (spot: NeighborhoodHotspot) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [spot.lng, spot.lat],
      zoom: spot.zoom,
      pitch: is3D ? 60 : 0,
      bearing: -22,
      duration: 800,
    });
  };

  const handleManualScan = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    onFetchLiveArea(
      {
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      },
      true
    );
  };

  const handleToggle3D = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3D;
    setIs3D(next);
    map.easeTo({
      pitch: next ? 60 : 0,
      bearing: next ? -22 : 0,
      duration: 500,
    });
  };

  const handleOrbitOrReset = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      bearing: (map.getBearing() + 45) % 360,
      pitch: Math.max(map.getPitch(), 58),
      duration: 450,
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15.8,
          pitch: is3D ? 60 : 0,
          duration: 900,
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const hotspots = CITY_NEIGHBORHOODS[city] ?? [];
  const selectedThumb = selectedVenue ? getCachedVenueThumb(selectedVenue) : null;

  return (
    <div className="relative w-full h-full bg-[#EAE5DC]">
      <div ref={containerRef} className="w-full h-full" aria-label="3 Boyutlu Türkiye restoran haritası" />

      {/* Top Overlay: Neighborhood 3D Quick-Flight Bar + Map Engine Switcher */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[20] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Neighborhood 3D Quick-Jump Pills + Live Area Scanner */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pointer-events-auto pb-0.5">
          {hotspots.map((spot) => (
            <button
              key={spot.label}
              type="button"
              onClick={() => handleFlyHotspot(spot)}
              className="shrink-0 rounded-full bg-white/95 hover:bg-[#0B4A4F] hover:text-white border border-[#D1D5DB] px-2.5 py-1 text-[11px] font-bold text-[#111827] shadow-sm transition-colors cursor-pointer"
            >
              {spot.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleManualScan}
            disabled={loadingLiveOsm}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#111827]/92 text-white px-3 py-1 text-[11px] font-bold shadow-md hover:bg-[#0B4A4F] cursor-pointer disabled:opacity-70"
          >
            <Radar className={`w-3 h-3 ${loadingLiveOsm ? 'animate-spin' : ''}`} />
            {loadingLiveOsm ? 'Taranıyor...' : 'Bu Alanı Tara'}
          </button>
        </div>

        {/* Right: 5-Engine Map Switcher (Apple 3D / Gece 3D / Google Sokak / Google Uydu / Organic Topo) */}
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-white/95 backdrop-blur-xs border border-[#D1D5DB] p-1 shadow-md">
          <Layers className="hidden sm:block w-3.5 h-3.5 text-[#64748B] ml-1.5 mr-1" />
          {(Object.keys(STYLE_LABELS) as MapStyleMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStyleMode(mode)}
              className={`rounded-md px-2 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                styleMode === mode
                  ? 'bg-[#0B4A4F] text-white'
                  : 'text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              {STYLE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Live Status / Active Route Pill */}
      {(liveOsmMsg || activeRoute) && (
        <div className="absolute top-13 left-1/2 -translate-x-1/2 z-[20] flex flex-col items-center gap-1.5 pointer-events-none">
          {liveOsmMsg && (
            <div className="pointer-events-auto rounded-full bg-white/95 border border-[#D8E0E4] px-3 py-1 text-[11px] font-semibold text-[#111827] shadow-sm">
              {liveOsmMsg}
            </div>
          )}

          {activeRoute && (
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#059669] text-white px-3.5 py-1.5 text-xs font-extrabold shadow-lg">
              <Route className="w-3.5 h-3.5" />
              <span>
                {activeRoute.venueName}: {activeRoute.distanceKm} km · ~{activeRoute.durationMin} dk
              </span>
              <button
                type="button"
                onClick={onClearRoute}
                aria-label="Rotayı kapat"
                className="rounded-full bg-white/20 hover:bg-white/30 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating On-Map Apple Maps / Google Maps 3D Venue Preview Card */}
      {selectedVenue && (
        <div className="hidden sm:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-[25] w-[470px] max-w-[92%] rounded-xl border border-[#CBD5E1] bg-white/98 backdrop-blur-xs p-3 shadow-2xl items-center gap-3">
          {selectedThumb && (
            <img
              src={selectedThumb}
              alt={selectedVenue.name}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-lg object-cover shrink-0 bg-[#E5ECEC]"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-[#111827] truncate">
                  {selectedVenue.name}
                </h3>
                <div className="text-[11px] text-[#64748B] truncate">
                  {selectedVenue.district}, {selectedVenue.city} · {selectedVenue.category} ·{' '}
                  {selectedVenue.priceTier}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectVenue(null)}
                aria-label="Kapat"
                className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              {selectedVenue.googleRating && (
                <span className="inline-flex items-center gap-0.5 rounded bg-[#FEF3C7] px-1.5 py-0.5 font-extrabold text-[#92400E]">
                  <Star className="w-3 h-3 fill-[#D97706] text-[#D97706]" />
                  {selectedVenue.googleRating.toFixed(1)}
                  {selectedVenue.googleReviewCount ? ` (${selectedVenue.googleReviewCount})` : ''}
                </span>
              )}
              {selectedRank && (
                <span
                  className="rounded px-1.5 py-0.5 font-extrabold text-white tabular-nums"
                  style={{ backgroundColor: scoreColor(selectedRank.score) }}
                >
                  Elo {selectedRank.score.toFixed(1)}
                </span>
              )}
              {terraceWeather && (
                <span className="inline-flex items-center gap-1 rounded bg-[#ECFDF5] px-1.5 py-0.5 font-bold text-[#047857]">
                  <Sun className="w-3 h-3" />
                  {terraceWeather.badgeText}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onRankVenue(selectedVenue)}
                className="inline-flex items-center gap-1 rounded-md bg-[#0B4A4F] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#08393D] cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3" />
                {selectedRank ? 'Yeniden Sırala' : 'Sırala'}
              </button>
              <button
                type="button"
                onClick={() => onToggleWant(selectedVenue.id)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold cursor-pointer ${
                  selectedIsWant
                    ? 'border-[#0B4A4F] bg-[#EAF4F4] text-[#0B4A4F]'
                    : 'border-[#D1D5DB] bg-white text-[#111827]'
                }`}
              >
                {selectedIsWant ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                {selectedIsWant ? 'Kayıtlı' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => onStartRoute(selectedVenue, 'driving')}
                className="inline-flex items-center gap-1 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-1 text-[11px] font-bold text-[#047857] cursor-pointer"
              >
                <Car className="w-3 h-3" />
                3D Araç
              </button>
              <button
                type="button"
                onClick={() => onStartRoute(selectedVenue, 'walking')}
                className="inline-flex items-center gap-1 rounded-md border border-[#BAE6FD] bg-[#F0F9FF] px-2 py-1 text-[11px] font-bold text-[#0369A1] cursor-pointer"
              >
                <Footprints className="w-3 h-3" />
                Yürü
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right: Apple Maps-Style 3D / Orbit / Zoom / GPS Control Stack */}
      <div className="absolute bottom-20 lg:bottom-16 right-3 z-[20] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleToggle3D}
          title={is3D ? '2D kuşbakışı görünüme geç' : 'Apple tarzı 3D bina görünümüne geç'}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-extrabold shadow-md cursor-pointer transition-colors ${
            is3D
              ? 'border-[#0B4A4F] bg-[#0B4A4F] text-white'
              : 'border-[#D1D5DB] bg-white/95 text-[#111827] hover:bg-[#F8FAFC]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          {is3D ? '3D' : '2D'}
        </button>

        <div className="flex flex-col rounded-lg border border-[#D1D5DB] bg-white/95 backdrop-blur-xs shadow-md overflow-hidden divide-y divide-[#E5E7EB]">
          <button
            type="button"
            onClick={handleOrbitOrReset}
            title="3D kamera açısını 45° döndür"
            className="p-2 text-[#111827] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <Compass
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: `rotate(${-bearing}deg)` }}
            />
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            title="Yakınımdaki restoranları bul"
            className={`p-2 hover:bg-[#F1F5F9] cursor-pointer ${
              locating ? 'text-[#0B4A4F] animate-pulse' : 'text-[#111827]'
            }`}
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn({ duration: 260 })}
            aria-label="Yakınlaştır"
            className="p-2 text-[#111827] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut({ duration: 260 })}
            aria-label="Uzaklaştır"
            className="p-2 text-[#111827] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom-Left: Interactive Tadım 3D Gastronomy Category Legend */}
      <div className="hidden md:flex absolute bottom-9 left-3 z-[20] items-center gap-1 rounded-full bg-white/92 backdrop-blur-xs border border-[#D1D5DB] px-2.5 py-1 shadow-md max-w-[calc(100%-160px)] overflow-x-auto">
        {VENUE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          const shortLabel = cat
            .replace('Esnaf Lokantası', 'Esnaf')
            .replace('Döner & Ocakbaşı', 'Ocakbaşı')
            .replace('3. Nesil Kahve', 'Kahve')
            .replace('Meyhane & Bistro', 'Meyhane')
            .replace('Kahvaltı & Fırın', 'Kahvaltı')
            .replace('Tatlı & Pastane', 'Tatlı')
            .replace('Sokak Lezzeti', 'Sokak');
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory?.(active ? 'Tümü' : cat)}
              title={cat}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0B4A4F] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 border border-white/80"
                style={{ backgroundColor: categoryColor(cat, false) }}
              />
              {shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
