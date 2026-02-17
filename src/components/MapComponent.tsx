
import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Property, DistrictInfo } from '../types';
import L from 'leaflet';

// Choropleth color scale based on priceChange (%)
const CHOROPLETH_SCALE: [number, string][] = [
  [0, '#93C5FD'],
  [2, '#60A5FA'],
  [3, '#3B82F6'],
  [4, '#2563EB'],
  [5, '#1D4ED8'],
  [6, '#1E40AF'],
];
const CHOROPLETH_MAX = '#1E3A8A';
const SELECTED_COLOR = '#2D4B5F';
const DEFAULT_COLOR = '#F1F5F9';

// Tile layer definitions — all Mapbox
export type TileLayerKey = 'blue' | 'snapmap' | 'dark';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const TILE_LAYERS: Record<TileLayerKey, { name: string; url: string; options?: L.TileLayerOptions }> = {
  blue: {
    name: 'Blue',
    url: `https://api.mapbox.com/styles/v1/drskjelde/cmlo7u0tk002r01qn5z3i9jps/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
    options: { maxZoom: 19, tileSize: 512, zoomOffset: -1 },
  },
  snapmap: {
    name: 'Snapmap',
    url: `https://api.mapbox.com/styles/v1/drskjelde/cmkm3e0hv00it01sd4ddd4syy/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
    options: { maxZoom: 19, tileSize: 512, zoomOffset: -1 },
  },
  dark: {
    name: 'Dark',
    url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
    options: { maxZoom: 19, tileSize: 512, zoomOffset: -1 },
  },
};

// Custom Mapbox dark style for automatic theme switching
const MAPBOX_DARK_STYLE_URL = `https://api.mapbox.com/styles/v1/drskjelde/cmlqetclu004r01sc7rw5ecrb/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_DARK_STYLE_OPTIONS: L.TileLayerOptions = { maxZoom: 19, tileSize: 512, zoomOffset: -1 };

// Per-layer style config
const LAYER_STYLES: Record<TileLayerKey, {
  showOverlay: boolean;          // show GeoJSON polygons (false = map style handles borders)
  showLabels: boolean;           // show our district name labels
  showChoropleth: boolean;       // fill areas with choropleth colors
  borderColor: string;
  borderWeight: number;
  borderOpacity: number;
  selectedFillColor: string;
  hoverFillOpacity: number;
  labelColor: string;
  labelSelectedColor: string;
  labelShadow: string;
  labelSelectedShadow: string;
}> = {
  blue: {
    showOverlay: true,
    showLabels: true,
    showChoropleth: true,
    borderColor: '#FFFFFF',
    borderWeight: 1.5,
    borderOpacity: 0.8,
    selectedFillColor: SELECTED_COLOR,
    hoverFillOpacity: 0.55,
    labelColor: '#1E3A50',
    labelSelectedColor: '#FFFFFF',
    labelShadow: '0 0 4px rgba(255,255,255,0.9), 0 0 2px rgba(255,255,255,0.9)',
    labelSelectedShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  snapmap: {
    showOverlay: false,           // Mapbox style has its own borders
    showLabels: true,             // Our district labels on top
    showChoropleth: false,
    borderColor: 'transparent',
    borderWeight: 0,
    borderOpacity: 0,
    selectedFillColor: 'transparent',
    hoverFillOpacity: 0,
    labelColor: '#1E3A50',
    labelSelectedColor: '#FFFFFF',
    labelShadow: '0 0 4px rgba(255,255,255,0.9), 0 0 2px rgba(255,255,255,0.9)',
    labelSelectedShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  dark: {
    showOverlay: true,
    showLabels: true,
    showChoropleth: false,
    borderColor: 'rgba(255,255,255,0.25)',
    borderWeight: 1,
    borderOpacity: 1,
    selectedFillColor: 'rgba(59,130,246,0.35)',
    hoverFillOpacity: 0.25,
    labelColor: 'rgba(255,255,255,0.8)',
    labelSelectedColor: '#FFFFFF',
    labelShadow: '0 1px 3px rgba(0,0,0,0.8)',
    labelSelectedShadow: '0 1px 4px rgba(0,0,0,0.9)',
  },
};

// Desktop/tablet settings (more zoomed in to show details)
const DEFAULT_CENTER: L.LatLngExpression = [59.92, 10.76];
const DEFAULT_ZOOM = 11.5;

// Mobile settings (more zoomed out to show all districts)
const MOBILE_CENTER: L.LatLngExpression = [59.91, 10.76];
const MOBILE_ZOOM = 10.6;

function getDefaultView(): { center: L.LatLngExpression; zoom: number } {
  const isMobile = window.innerWidth < 768;
  return isMobile
    ? { center: MOBILE_CENTER, zoom: MOBILE_ZOOM }
    : { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
}

export interface MapComponentHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setTileLayer: (key: TileLayerKey) => void;
}

function getChoroplethColor(priceChange: number): string {
  for (let i = CHOROPLETH_SCALE.length - 1; i >= 0; i--) {
    if (priceChange >= CHOROPLETH_SCALE[i][0]) return CHOROPLETH_SCALE[i][1];
  }
  return CHOROPLETH_SCALE[0][1];
}

function getHoverColor(priceChange: number): string {
  const natural = getChoroplethColor(priceChange);
  const idx = CHOROPLETH_SCALE.findIndex(([, c]) => c === natural);
  if (idx < CHOROPLETH_SCALE.length - 1) return CHOROPLETH_SCALE[idx + 1][1];
  return CHOROPLETH_MAX;
}

interface MapComponentProps {
  properties: Property[];
  districts: DistrictInfo[];
  selectedProperty: Property | null;
  selectedDistrict: DistrictInfo | null;
  onPropertySelect: (p: Property) => void;
  onDistrictSelect: (d: DistrictInfo) => void;
  isDark?: boolean;
}

const MapComponent = forwardRef<MapComponentHandle, MapComponentProps>(({
  properties,
  districts,
  selectedProperty,
  selectedDistrict,
  onPropertySelect,
  onDistrictSelect,
  isDark
}, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const labelMarkersRef = useRef<L.Marker[]>([]);
  const geoJsonDataRef = useRef<any>(null);
  const labelDataRef = useRef<any[]>([]);
  const dataLoadedRef = useRef(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userTileKeyRef = useRef<TileLayerKey>('blue');   // what the user picked in layer menu
  const activeTileKeyRef = useRef<TileLayerKey>('blue'); // actual visual style (may differ in dark mode)

  // Stable refs for callbacks
  const districtsRef = useRef(districts);
  districtsRef.current = districts;
  const selectedDistrictRef = useRef(selectedDistrict);
  selectedDistrictRef.current = selectedDistrict;
  const onDistrictSelectRef = useRef(onDistrictSelect);
  onDistrictSelectRef.current = onDistrictSelect;

  const findDistrictByName = useCallback((name: string): DistrictInfo | undefined => {
    return districtsRef.current.find(d => d.name === name);
  }, []);

  const renderGeoJson = useCallback(() => {
    const map = mapRef.current;
    const geoJsonData = geoJsonDataRef.current;
    if (!map || !geoJsonData) return;

    // Remove previous layer
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    const selected = selectedDistrictRef.current;
    const style = LAYER_STYLES[activeTileKeyRef.current];

    const layer = L.geoJSON(geoJsonData, {
      style: (feature) => {
        const name = feature?.properties?.BYDELSNAVN;
        const district = findDistrictByName(name);

        if (!style.showOverlay) {
          // Snapmap: invisible interaction layer (Mapbox style handles visuals)
          return {
            fillColor: 'transparent',
            fillOpacity: 0,
            weight: 0,
            color: 'transparent',
            opacity: 0,
          };
        } else if (style.showChoropleth) {
          // Blue mode: full choropleth fill
          let fillColor = DEFAULT_COLOR;
          if (district) {
            if (selected && district.name === selected.name) {
              fillColor = style.selectedFillColor;
            } else {
              fillColor = getChoroplethColor(district.priceChange);
            }
          }
          return {
            fillColor,
            fillOpacity: 0.4,
            weight: style.borderWeight,
            color: style.borderColor,
            opacity: style.borderOpacity,
          };
        } else {
          // Dark: transparent fill, borders only
          const isSelected = district && selected && district.name === selected.name;
          return {
            fillColor: isSelected ? style.selectedFillColor : 'transparent',
            fillOpacity: isSelected ? 0.4 : 0,
            weight: style.borderWeight,
            color: style.borderColor,
            opacity: style.borderOpacity,
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const name = feature?.properties?.BYDELSNAVN;
        const district = findDistrictByName(name);

        if (!district) return;

        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const target = e.target;
            const sel = selectedDistrictRef.current;
            const st = LAYER_STYLES[activeTileKeyRef.current];
            if (!sel || district.name !== sel.name) {
              if (st.showOverlay) {
                if (st.showChoropleth) {
                  target.setStyle({
                    fillColor: getHoverColor(district.priceChange),
                    fillOpacity: st.hoverFillOpacity,
                  });
                } else {
                  target.setStyle({
                    fillColor: getChoroplethColor(district.priceChange),
                    fillOpacity: st.hoverFillOpacity,
                  });
                }
              }
              // Snapmap: no hover style, but still need cursor
              target.bringToFront();
            }
            const el = (target as any)._path;
            if (el) el.style.cursor = 'pointer';
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            if (geoJsonLayerRef.current) {
              geoJsonLayerRef.current.resetStyle(e.target);
            }
          },
          click: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onDistrictSelectRef.current(district);
          }
        });
      }
    }).addTo(map);

    geoJsonLayerRef.current = layer;
  }, [findDistrictByName]);

  const renderLabels = useCallback(() => {
    const map = mapRef.current;
    const labels = labelDataRef.current;
    if (!map || labels.length === 0) return;

    // Remove previous labels
    labelMarkersRef.current.forEach(m => m.remove());
    labelMarkersRef.current = [];

    const style = LAYER_STYLES[activeTileKeyRef.current];

    // Skip labels if disabled for this layer
    if (!style.showLabels) return;

    const selected = selectedDistrictRef.current;

    labels.forEach((feature: any) => {
      const name = feature.properties.BYDELSNAVN;
      const district = findDistrictByName(name);
      if (!district) return;

      const coords = feature.geometry.coordinates;
      const isSelected = selected && district.name === selected.name;

      const icon = L.divIcon({
        className: 'district-choropleth-label',
        html: `<div style="
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
          color: ${isSelected ? style.labelSelectedColor : style.labelColor};
          text-shadow: ${isSelected ? style.labelSelectedShadow : style.labelShadow};
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
        ">${district.name === 'Oslo (Totalt)' ? '' : district.name}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([coords[1], coords[0]], {
        icon,
        zIndexOffset: 1000,
        interactive: true,
      })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onDistrictSelectRef.current(district);
        });

      labelMarkersRef.current.push(marker);
    });
  }, [findDistrictByName]);

  // Expose controls to parent
  useImperativeHandle(ref, () => ({
    zoomIn: () => { mapRef.current?.zoomIn(); },
    zoomOut: () => { mapRef.current?.zoomOut(); },
    resetView: () => {
      const view = getDefaultView();
      mapRef.current?.setView(view.center, view.zoom);
    },
    setTileLayer: (key: TileLayerKey) => {
      const map = mapRef.current;
      if (!map) return;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      userTileKeyRef.current = key;
      activeTileKeyRef.current = key;
      const def = TILE_LAYERS[key];
      tileLayerRef.current = L.tileLayer(def.url, def.options).addTo(map);
      // Re-render GeoJSON + labels with new style
      if (dataLoadedRef.current) {
        renderGeoJson();
        renderLabels();
      }
    },
  }));

  // Initialize map and load data
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const view = getDefaultView();
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(view.center, view.zoom);

    // Default tile layer — use dark Mapbox style if isDark, otherwise blue
    if (isDark) {
      tileLayerRef.current = L.tileLayer(MAPBOX_DARK_STYLE_URL, MAPBOX_DARK_STYLE_OPTIONS).addTo(map);
      activeTileKeyRef.current = 'blue'; // still logically 'blue' for the layer menu
    } else {
      const def = TILE_LAYERS.blue;
      tileLayerRef.current = L.tileLayer(def.url, def.options).addTo(map);
    }

    mapRef.current = map;

    let lastIsMobile = window.innerWidth < 768;
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();

        // Check if we crossed the mobile/desktop breakpoint
        const currentIsMobile = window.innerWidth < 768;
        if (currentIsMobile !== lastIsMobile) {
          lastIsMobile = currentIsMobile;
          const newView = getDefaultView();
          mapRef.current.setView(newView.center, newView.zoom);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    // Load GeoJSON data
    const basePath = import.meta.env.BASE_URL || '/';
    Promise.all([
      fetch(`${basePath}oslo_bydeler.geojson`).then(r => r.json()),
      fetch(`${basePath}oslo_label_points.geojson`).then(r => r.json()),
    ]).then(([polygons, labels]) => {
      geoJsonDataRef.current = polygons;
      labelDataRef.current = labels.features;
      dataLoadedRef.current = true;
      renderGeoJson();
      renderLabels();
    }).catch(err => {
      console.error('Failed to load GeoJSON data:', err);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch between custom Mapbox dark/light tiles when isDark changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Only auto-switch when the user has 'blue' selected in the layer menu
    if (userTileKeyRef.current !== 'blue') return;

    // Swap tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    if (isDark) {
      tileLayerRef.current = L.tileLayer(MAPBOX_DARK_STYLE_URL, MAPBOX_DARK_STYLE_OPTIONS).addTo(map);
      activeTileKeyRef.current = 'dark'; // use dark overlay styles (transparent fill, borders only)
    } else {
      const def = TILE_LAYERS.blue;
      tileLayerRef.current = L.tileLayer(def.url, def.options).addTo(map);
      activeTileKeyRef.current = 'blue'; // use blue overlay styles (choropleth fill)
    }

    if (dataLoadedRef.current) {
      renderGeoJson();
      renderLabels();
    }
  }, [isDark, renderGeoJson, renderLabels]);

  // Re-render when selectedDistrict changes
  useEffect(() => {
    if (!dataLoadedRef.current) return;
    renderGeoJson();
    renderLabels();
  }, [selectedDistrict, renderGeoJson, renderLabels]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;
