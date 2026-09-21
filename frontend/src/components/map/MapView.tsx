import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useSupercluster from 'use-supercluster'
import { cn } from '../../lib/cn'
import { DJIBOUTI_ZONE } from '../../lib/geofence'

type Position = {
  lat: number
  lng: number
}

type MarkerType = {
  id: string
  position: Position
  label?: string
  subtitle?: string
  status?: string
  angle?: number
  color?: string
  isCluster?: boolean
  clusterCount?: number
  clusterVehicles?: { plate: string, statusColor: string }[]
}

export type MapApi = {
  zoomIn: () => void
  zoomOut: () => void
  flyTo: (pos: Position, zoom?: number) => void
  fitBounds: (bounds: [[number, number], [number, number]], padding?: number) => void
}


// MapController exposes the imperative API and syncs bounds for supercluster
type MapControllerProps = {
  apiRef: MutableRefObject<MapApi | null>
  onMapReady?: (api: MapApi) => void
  center: Position
  zoomProp: number
  setBounds: (bounds: [number, number, number, number] | undefined) => void
  setZoom: (z: number) => void
}

function MapController({ 
  apiRef, 
  onMapReady, 
  center, 
  zoomProp, 
  setBounds, 
  setZoom 
}: MapControllerProps) {
  const map = useMap()

  useEffect(() => {
    const api: MapApi = {
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      flyTo: (pos, zoom) => map.flyTo([pos.lat, pos.lng], zoom ?? map.getZoom(), { animate: true }),
      fitBounds: (bounds, padding = 40) => map.fitBounds(bounds, { padding: [padding, padding], maxZoom: 15, animate: true }),
    }
    if (apiRef) apiRef.current = api
    onMapReady?.(api)
  }, [map, apiRef, onMapReady])

  useEffect(() => {
    if (center && center.lat && center.lng) {
      if (!map.getCenter() || map.getCenter().lat !== center.lat || map.getCenter().lng !== center.lng) {
         map.setView([center.lat, center.lng], zoomProp ?? map.getZoom())
      }
    }
  }, [center.lat, center.lng, zoomProp, map])

  useEffect(() => {
    function update() {
      const b = map.getBounds()
      setBounds([
        b.getSouthWest().lng,
        b.getSouthWest().lat,
        b.getNorthEast().lng,
        b.getNorthEast().lat
      ])
      setZoom(map.getZoom())
    }
    map.on('moveend', update)
    map.on('zoomend', update)
    update()
    return () => {
      map.off('moveend', update)
      map.off('zoomend', update)
    }
  }, [map, setBounds, setZoom])

  return null
}

const getDirectionArrow = (deg: number) => {
  const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
  const index = Math.round((deg % 360) / 45) % 8
  return directions[index]
}

const vehicleIconCache = new Map<string, L.DivIcon>()

const getVehicleIcon = (m: MarkerType, isSelected: boolean) => {
  // Fuel tanker proportions (typically ~1:3.2 width-to-length ratio)
  const baseW = isSelected ? 22 : 16
  const baseH = isSelected ? 48 : 36
  const angle = m.angle ?? 0
  const plateName = m.label?.split(' ')[0] ?? ''
  const color = m.color ?? '#94a3b8'
  
  const cacheKey = `${m.id}-${baseW}-${baseH}-${angle}-${color}-${plateName}-${isSelected}`
  const cached = vehicleIconCache.get(cacheKey)
  if (cached) return cached
  
  const directionArrow = getDirectionArrow(angle)

  // Top-down precision SVG of a heavy commercial fuel tanker truck
  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: ${baseW}px; height: ${baseH}px;">
      ${isSelected && m.label ? `
        <div style="position: absolute; bottom: 100%; margin-bottom: 8px; background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(4px); padding: 4px 9px; border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); font-size: 11px; font-weight: 700; white-space: nowrap; color: #ffffff; border: 1.5px solid ${color}; z-index: 50; display: flex; align-items: center; gap: 5px; left: 50%; transform: translateX(-50%); pointer-events: none;">
          <span style="letter-spacing: 0.5px;">${plateName}</span>
          <span style="color: ${color}; font-size: 13px;">${directionArrow}</span>
        </div>` : ''}
      <div style="width: ${baseW}px; height: ${baseH}px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.38)); transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1); transform: rotate(${angle}deg); transform-origin: center center;">
        <svg viewBox="0 0 32 72" width="${baseW}" height="${baseH}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Tank cylindrical gradient -->
            <linearGradient id="tankGrad-${m.id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#334155" />
              <stop offset="18%" stop-color="#cbd5e1" />
              <stop offset="50%" stop-color="#ffffff" />
              <stop offset="82%" stop-color="#cbd5e1" />
              <stop offset="100%" stop-color="#475569" />
            </linearGradient>
            <!-- Cabin metallic hood gradient -->
            <linearGradient id="cabGrad-${m.id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0f172a" stop-opacity="0.3" />
              <stop offset="50%" stop-color="#ffffff" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#0f172a" stop-opacity="0.3" />
            </linearGradient>
            <!-- Status glow -->
            <filter id="glow-${m.id}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="${color}" flood-opacity="0.8" />
            </filter>
          </defs>

          <!-- ====== HEAVY DUTY WHEELS & CHASSIS AXLES ====== -->
          <!-- Front steer wheels (Cab) -->
          <rect x="2" y="9" width="3.5" height="7.5" rx="1.5" fill="#0f172a" />
          <rect x="26.5" y="9" width="3.5" height="7.5" rx="1.5" fill="#0f172a" />

          <!-- Drive axle duals (Tractor rear) -->
          <rect x="3" y="27" width="3" height="7" rx="1.2" fill="#0f172a" />
          <rect x="26" y="27" width="3" height="7" rx="1.2" fill="#0f172a" />

          <!-- Tanker trailer dual bogie wheels (Rear Axle 1) -->
          <rect x="2.5" y="52" width="3.2" height="7" rx="1.2" fill="#0f172a" />
          <rect x="26.3" y="52" width="3.2" height="7" rx="1.2" fill="#0f172a" />

          <!-- Tanker trailer dual bogie wheels (Rear Axle 2) -->
          <rect x="2.5" y="61" width="3.2" height="7" rx="1.2" fill="#0f172a" />
          <rect x="26.3" y="61" width="3.2" height="7" rx="1.2" fill="#0f172a" />

          <!-- Fifth wheel / hitch turntable coupling -->
          <rect x="13.5" y="25" width="5" height="5" rx="1" fill="#1e293b" />
          <circle cx="16" cy="27.5" r="1.5" fill="#64748b" />

          <!-- ====== TRACTOR CABIN (Front) ====== -->
          <!-- Main cab body -->
          <path d="M 6.5 7 Q 6.5 2 16 2 Q 25.5 2 25.5 7 L 25 24 L 7 24 Z" fill="${color}" />
          <path d="M 6.5 7 Q 6.5 2 16 2 Q 25.5 2 25.5 7 L 25 24 L 7 24 Z" fill="url(#cabGrad-${m.id})" />

          <!-- Aerodynamic side mirrors -->
          <rect x="2" y="10" width="4" height="2" rx="0.8" fill="#1e293b" />
          <rect x="26" y="10" width="4" height="2" rx="0.8" fill="#1e293b" />

          <!-- Front Windshield & curved glass -->
          <path d="M 8.5 8 Q 16 5.5 23.5 8 L 22.5 13 Q 16 11 9.5 13 Z" fill="#0284c7" opacity="0.95" />
          <!-- Windshield wiper/reflection -->
          <path d="M 11 8.5 Q 16 7 21 8.5" stroke="#bae6fd" stroke-width="0.8" stroke-linecap="round" opacity="0.9" />

          <!-- Cabin Roof Panel / Air Deflector -->
          <rect x="10" y="14" width="12" height="8" rx="1.5" fill="${color}" stroke="#0f172a" stroke-width="0.5" />
          <!-- Amber marker lights on roof -->
          <circle cx="11.5" cy="4" r="0.8" fill="#f59e0b" />
          <circle cx="16" cy="3.5" r="0.8" fill="#f59e0b" />
          <circle cx="20.5" cy="4" r="0.8" fill="#f59e0b" />

          <!-- ====== CYLINDRICAL FUEL TANKER TRAILER ====== -->
          <!-- Heavy tanker outer shell -->
          <rect x="5.5" y="27" width="21" height="42" rx="6.5" fill="url(#tankGrad-${m.id})" stroke="#334155" stroke-width="1" />

          <!-- Front dome cap curvature -->
          <path d="M 7 32 Q 16 28 25 32" stroke="#475569" stroke-width="0.8" fill="none" opacity="0.7" />
          <!-- Rear dome cap curvature -->
          <path d="M 7 64 Q 16 68 25 64" stroke="#475569" stroke-width="0.8" fill="none" opacity="0.7" />

          <!-- Tank top catwalk / safety walkway -->
          <rect x="13" y="31" width="6" height="34" rx="1" fill="#475569" opacity="0.85" />

          <!-- Fuel Tank Manholes / Fill Hatches (Compartments 1, 2, 3) -->
          <circle cx="16" cy="36" r="2.4" fill="#1e293b" stroke="#94a3b8" stroke-width="0.7" />
          <circle cx="16" cy="36" r="1.1" fill="${color}" />

          <circle cx="16" cy="48" r="2.4" fill="#1e293b" stroke="#94a3b8" stroke-width="0.7" />
          <circle cx="16" cy="48" r="1.1" fill="${color}" />

          <circle cx="16" cy="60" r="2.4" fill="#1e293b" stroke="#94a3b8" stroke-width="0.7" />
          <circle cx="16" cy="60" r="1.1" fill="${color}" />

          <!-- Side discharge pipe / hose tubes -->
          <line x1="6.8" y1="33" x2="6.8" y2="63" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />
          <line x1="25.2" y1="33" x2="25.2" y2="63" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />

          <!-- Rear Hazchem / Flammable Liquid Diamond Placard -->
          <rect x="14" y="65.5" width="4" height="4" rx="0.5" fill="#dc2626" transform="rotate(45 16 67.5)" stroke="#ffffff" stroke-width="0.5" />

          <!-- Dynamic Status Beacon / GPS Telemetry LED (Active Pulse Indicator) -->
          <circle cx="16" cy="18" r="2" fill="${color}" filter="url(#glow-${m.id})" stroke="#ffffff" stroke-width="0.7" />
        </svg>
      </div>
    </div>
  `
  const icon = L.divIcon({
    html,
    className: '', 
    iconSize: [baseW, baseH],
    iconAnchor: [baseW / 2, baseH / 2]
  })
  
  vehicleIconCache.set(cacheKey, icon)
  return icon
}

const clusterIconCache = new Map<string, L.DivIcon>()

const getClusterIcon = (cluster: unknown, supercluster: unknown) => {
  const clusterTyped = cluster as {
    id: number
    properties: { point_count: number }
  }
  const superclusterTyped = supercluster as {
    getLeaves: (clusterId: number, limit: number) => { properties: { marker: MarkerType } }[]
  } | null

  const count = clusterTyped.properties.point_count
  const cacheKey = `cluster-${clusterTyped.id}-${count}`
  const cached = clusterIconCache.get(cacheKey)
  if (cached) return cached

  // Show leaves on hover for clusters (all vehicles)
  const maxLeavesToShow = count
  const leaves =
    superclusterTyped
      ? superclusterTyped.getLeaves(clusterTyped.id, maxLeavesToShow)
      : []
  
  // Dynamic size based on count
  const size = count < 10 ? 36 : count < 50 ? 42 : count < 200 ? 50 : 58
  const fontSize = count < 10 ? 13 : count < 50 ? 14 : count < 200 ? 15 : 16

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;" class="group">
      <div class="absolute bottom-full hidden group-hover:flex flex-col pb-2 z-50">
        <div class="flex flex-col bg-white p-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 min-w-[160px] max-h-[280px] overflow-y-auto cursor-default pointer-events-auto">
          <div class="text-[10px] font-bold text-slate-400 mb-2 border-b border-slate-100 pb-2 uppercase tracking-wider">${count} Vehicles</div>
          ${leaves.length > 0 ? `
            <div class="flex flex-col gap-1.5">
              ${leaves.map((l) => {
                const m = (l as { properties: { marker: MarkerType } }).properties.marker
                return `
                  <div class="flex items-center justify-between bg-slate-50/50 px-2 py-1.5 rounded-md">
                    <span class="text-[11px] font-bold text-slate-700">${m.label?.split(' ')[0] ?? ''}</span>
                    <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${m.color ?? '#cbd5e1'};"></div>
                  </div>
                `
              }).join('')}
            </div>
          ` : `
             <div class="text-xs text-slate-500">Click to zoom in and view individual vehicles.</div>
          `}
        </div>
      </div>

      <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center;" class="hover:scale-110">
        <div style="background: #1c8547; color: white; border-radius: 999px; min-width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; padding: 0 8px; font-size: ${fontSize}px; font-weight: bold; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
          ${count}
        </div>
      </div>
    </div>
  `
  const iconSize = size + 8
  const icon = L.divIcon({
    html,
    className: '',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2]
  })
  clusterIconCache.set(cacheKey, icon)
  return icon
}

export const MAP_STYLES = {
  voyager: {
    name: 'Logistics (HD)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abc',
    maxZoom: 19
  },
  dark: {
    name: 'Night Ops',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }
} as const

export type MapStyleKey = keyof typeof MAP_STYLES

type Props = {
  center: Position
  zoom?: number
  markers?: MarkerType[]
  selectedMarkerId?: string
  onMarkerSelect?: (id: string) => void
  onMapReady?: (api: MapApi) => void
  styleUrl?: string
  styleKey?: MapStyleKey
  className?: string
  isClustered?: boolean
}

export default function MapView({
  center,
  zoom = 9,
  markers = [],
  selectedMarkerId,
  onMarkerSelect,
  onMapReady,
  styleUrl,
  styleKey = 'voyager',
  className,
  isClustered = false
}: Props) {
  const activeStyle = MAP_STYLES[styleKey] || MAP_STYLES.voyager
  const tileUrl = styleUrl || activeStyle.url
  const tileAttribution = activeStyle.attribution
  const tileSubdomains = activeStyle.subdomains
  const apiRef = useRef<MapApi | null>(null)

  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>(undefined)
  const [currentZoom, setCurrentZoom] = useState(zoom)

  const selectedMarker = useMemo(() => {
    if (!selectedMarkerId) return undefined
    return markers.find(m => m.id === selectedMarkerId)
  }, [markers, selectedMarkerId])

  // Pre-create the selected icon once per selection to avoid rework on every marker render.
  const selectedIcon = useMemo(() => {
    if (!selectedMarker) return undefined
    return getVehicleIcon(selectedMarker, true)
  }, [selectedMarker])

  const points = useMemo(() => {
    return markers.map(m => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        markerId: m.id,
        marker: m
      },
      geometry: {
        type: "Point" as const,
        coordinates: [m.position.lng, m.position.lat] as [number, number]
      }
    }))
  }, [markers])

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: currentZoom,
    options: { radius: 75, maxZoom: 20 }
  })

  // When clustering is OFF, we still extremely aggressively cull points outside the map bounds
  // so we don't render 3000 markers at once, causing extreme lag.
  const renderFeatures = useMemo(() => {
    if (isClustered) return clusters
    if (!bounds) return []
    
    const [minLng, minLat, maxLng, maxLat] = bounds
    return points.filter(p => {
      const [lng, lat] = p.geometry.coordinates
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
    })
  }, [isClustered, clusters, points, bounds])

  // Memoize unselected marker elements so selection changes don't force rebuilding their icons.
  const renderedUnselectedVehicleMarkers = useMemo(() => {
    if (isClustered) return null
    if (!renderFeatures || renderFeatures.length === 0) return null

    return renderFeatures.map((feature) => {
      const m = (feature as { properties: { marker: MarkerType } }).properties.marker
      if (m.id === selectedMarkerId) return null

      return (
        <Marker
          key={m.id}
          position={[m.position.lat, m.position.lng]}
          icon={getVehicleIcon(m, false)}
          eventHandlers={{
            click: () => onMarkerSelect?.(m.id)
          }}
          zIndexOffset={0}
        />
      )
    })
  }, [isClustered, renderFeatures, selectedMarkerId, onMarkerSelect])

  const renderedSelectedVehicleMarker = useMemo(() => {
    if (!selectedMarkerId || !selectedMarker || isClustered) return null
    const lat = selectedMarker.position.lat
    const lng = selectedMarker.position.lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return (
      <Marker
        key={`selected-${selectedMarker.id}`}
        position={[lat, lng]}
        icon={selectedIcon}
        eventHandlers={{
          click: () => onMarkerSelect?.(selectedMarker.id)
        }}
        zIndexOffset={1000}
      />
    )
  }, [selectedMarkerId, selectedMarker, isClustered, selectedIcon, onMarkerSelect])

  return (
    <div className={cn('w-full h-full min-h-[100px] overflow-hidden relative z-0', className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          key={tileUrl}
          url={tileUrl}
          attribution={tileAttribution}
          subdomains={tileSubdomains}
          maxZoom={activeStyle.maxZoom}
        />
        <Polygon
          positions={DJIBOUTI_ZONE}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '5, 5'
          }}
        >
          <Tooltip sticky direction="top" opacity={0.9}>
            <span className="font-bold text-red-600">Djibouti Geofence Zone</span>
          </Tooltip>
        </Polygon>
        <MapController 
          apiRef={apiRef} 
          onMapReady={onMapReady} 
          center={center} 
          zoomProp={zoom} 
          setBounds={setBounds}
          setZoom={setCurrentZoom}
        />

        {/* Clustered rendering (keeps previous behavior) */}
        {isClustered &&
          renderFeatures.map((feature) => {
            const [lng, lat] = (feature as { geometry: { coordinates: [number, number] } }).geometry.coordinates
            const { cluster: isCluster } = (feature as { properties: { cluster: boolean } }).properties
            const featureId = (feature as { id: number }).id

            if (isCluster) {
              return (
                <Marker
                  key={`cluster-${featureId}`}
                  position={[lat, lng]}
                  icon={getClusterIcon(feature, supercluster)}
                  eventHandlers={{
                    click: () => {
                      if (!supercluster) return
                      const expansionZoom = Math.min(
                        supercluster.getClusterExpansionZoom(featureId),
                        20
                      )
                      apiRef.current?.flyTo({ lat, lng }, expansionZoom)
                    }
                  }}
                />
              )
            }

            const m = (feature as { properties: { marker: MarkerType } }).properties.marker
            const isSelected = m.id === selectedMarkerId

            return (
              <Marker
                key={m.id}
                position={[m.position.lat, m.position.lng]}
                icon={getVehicleIcon(m, isSelected)}
                eventHandlers={{
                  click: () => onMarkerSelect?.(m.id)
                }}
                zIndexOffset={isSelected ? 1000 : 0}
              />
            )
          })}

        {/* Non-clustered rendering */}
        {!isClustered && renderedUnselectedVehicleMarkers}
        {!isClustered && renderedSelectedVehicleMarker}
      </MapContainer>
    </div>
  )
}
