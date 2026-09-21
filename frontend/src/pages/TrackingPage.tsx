import { useEffect, useLayoutEffect, useMemo, useRef, useState, useDeferredValue, useCallback } from 'react'
import { fetchGpsVehicles } from '../data/gpsApi'
import type { GpsVehicle } from '../data/types'
import MapView, { type MapStyleKey } from '../components/map/MapView'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import type { Depot } from '../data/types'
import { mapDepot } from '../data/types'
import { isVehicleInDjibouti } from '../lib/geofence'
import { useSearchParams } from 'react-router-dom'

// Child components
import FleetListSidebar from '../components/tracking/FleetListSidebar'
import TrackingMapControls from '../components/tracking/TrackingMapControls'

const COLORS = {
  blue: '#1c8547',
  gold: '#f59f0a',
  gray: '#cbd5e1',
  bg: '#f3f4f6',
} as const

const ETHIOPIA_BOUNDS = { minLat: 3.0, maxLat: 15.0, minLng: 33.0, maxLng: 48.0 }

export default function TrackingPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const vehicleParam = searchParams.get('vehicle')

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState('All')
  const [assignmentFilter, setAssignmentFilter] = useState('All')
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('voyager')

  const deferredSearch = useDeferredValue(search)
  const deferredStatus = useDeferredValue(statusFilter)
  const deferredAssignment = useDeferredValue(assignmentFilter)

  const isPendingFilter =
    search !== deferredSearch || statusFilter !== deferredStatus || assignmentFilter !== deferredAssignment

  // Fetch GPS Vehicles
  const { data: items = [], isLoading: itemsLoading, error: queryError } = useQuery<GpsVehicle[]>({
    queryKey: ['gps-vehicles'],
    queryFn: async () => {
      return await fetchGpsVehicles()
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })

  // Auto-select vehicle from query parameter if provided
  useEffect(() => {
    if (vehicleParam && items.length > 0) {
      const matched = items.find(v => v.imei === vehicleParam || v.name === vehicleParam)
      if (matched) {
        setSelectedId(matched.imei)
        const lat = Number(matched.lat)
        const lng = Number(matched.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setTimeout(() => {
            mapApiRef.current?.flyTo({ lat, lng }, 18)
          }, 600)
        }
      }
    }
  }, [vehicleParam, items])

  // Fetch Dispatches
  const { data: dispatches = [], isLoading: dispatchesLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: async () => {
      const res = await api.get('/dispatches', {
        params: user?.role?.toUpperCase() === 'OIL_COMPANY' ? { oil_company_id: user?.companyId } : {},
      })
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.data?.map((d: any) => ({

          peaDispatchNo: d.pea_dispatch_no,
          oilCompanyId: d.oil_company_id,
          transporterId: d.transporter_id,
          vehicleId: d.vehicle_id,
          dispatchDateTime: d.dispatch_datetime?.replace(' ', 'T'),
          dispatchLocation: d.dispatch_location,
          destinationDepotId: d.destination_depot_id?.toString() || '',
          etaDateTime: d.eta_datetime?.replace(' ', 'T'),
          dropOffDateTime: d.drop_off_datetime?.replace(' ', 'T'),
          fuelType: d.fuel_type,
          dispatchedLiters: Number(d.dispatched_liters || 0),
          status: d.status,
          confirmation: d.confirmation || null,
        })) || []
      )
    },
    refetchInterval: 3 * 60 * 1000,
  })

  // Fetch Depots
  const { data: depots = [] } = useQuery<Depot[]>({
    queryKey: ['depots'],
    queryFn: async () => {
      const res = await api.get('/depots')
      return res.data.map(mapDepot)
    },
  })

  const depotsById = useMemo(() => {
    const map = new Map<string, Depot>()
    depots.forEach((d) => map.set(d.id.toString(), d))
    return map
  }, [depots])

  const isOilCompanyUser = user?.role?.toUpperCase().includes('OIL_COMPANY')
  const userCompanyId = user?.companyId?.trim()?.toLowerCase()

  const combinedItems = useMemo(() => {
    const baseItems = isOilCompanyUser && userCompanyId
      ? items.filter((v) => String(v.group ?? '').trim().toLowerCase() === userCompanyId)
      : items

    const allItems = [...baseItems]
    const itemNames = new Set(allItems.map((v) => String(v.name).trim()))
    const itemImeis = new Set(allItems.map((v) => String(v.imei).trim()))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatches.forEach((d: any) => {
      if (d.status && d.status.toLowerCase() !== 'delivered') {
        // If oil company user, only include dispatches for their company
        if (isOilCompanyUser && userCompanyId) {
          if (String(d.oilCompanyId ?? '').trim().toLowerCase() !== userCompanyId) {
            return
          }
        }

        const dVehicleId = String(d.vehicleId).trim()
        const isExisting = allItems.find(
          (v) => String(v.imei).trim() === dVehicleId || String(v.name).trim() === dVehicleId
        )

        if (!isExisting && !itemNames.has(dVehicleId) && !itemImeis.has(dVehicleId)) {
          allItems.push({
            imei: dVehicleId,
            name: dVehicleId,
            group: d.oilCompanyId,
            status: 'Offline',
            engine: 'off',
            speed: '0',
            lat: '',
            lng: '',
            angle: '0',
            dt_tracker: 'N/A',
            dt_server: 'N/A',
            fuel_1: '0',
            odometer: '0',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          itemNames.add(dVehicleId)
        }
      }
    })
    return allItems
  }, [items, dispatches, isOilCompanyUser, userCompanyId])

  const activeDispatchesByVehicle = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>()
    const sorted = [...dispatches].sort((a, b) => {
      const timeA = a.dispatchDateTime ? new Date(a.dispatchDateTime).getTime() : 0
      const timeB = b.dispatchDateTime ? new Date(b.dispatchDateTime).getTime() : 0
      return timeB - timeA
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sorted.forEach((d: any) => {
      if (d.status && d.status.toLowerCase() !== 'delivered') {
        const dVehicleId = String(d.vehicleId).trim()
        const match = combinedItems.find(
          (v) => String(v.imei).trim() === dVehicleId || String(v.name).trim() === dVehicleId
        )
        if (match && !map.has(match.imei)) {
          map.set(match.imei, d)
        }
      }
    })
    return map
  }, [dispatches, combinedItems])

  const [isClustered, setIsClustered] = useState(false)
  const [hasFitBounds, setHasFitBounds] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false)
  const mapApiRef = useRef<import('../components/map/MapView').MapApi | null>(null)

  const defaultCenter = useMemo(() => ({ lat: 9.0, lng: 39.5 }), [])

  // react-window sizing
  const listHostRef = useRef<HTMLDivElement | null>(null)
  const [listSize, setListSize] = useState({ width: 0, height: 0 })

  const isListLoading = itemsLoading || dispatchesLoading

  const getItemSize = (index: number) => {
    const v = fleetListItems[index]
    if (!v) return 52
    const hasDispatch = activeDispatchesByVehicle.has(v.imei)
    const isSelected = v.imei === selectedId

    if (isSelected) {
      return hasDispatch ? 360 : 250
    }
    return hasDispatch ? 68 : 52
  }

  const statusTag = useCallback((v: GpsVehicle): { label: string; color: string } => {
    const status = String(v.status || '').toLowerCase()
    if (status.includes('offline') || status.includes('signal')) return { label: 'OFFLINE', color: COLORS.gray }
    if (status.includes('alert')) return { label: 'ALERT', color: '#ef4444' }
    if (status.includes('idle') || (Number.isFinite(Number(v.speed)) && Number(v.speed) === 0 && v.engine === 'on')) {
      return { label: 'IDLE', color: COLORS.gold }
    }
    if (status.includes('moving') || (Number.isFinite(Number(v.speed)) && Number(v.speed) > 0)) {
      return { label: 'MOVING', color: '#22c55e' }
    }
    return { label: 'STOPPED', color: '#ef4444' }
  }, [])

  const plateFromName = (name: string) => name.trim().split(/\s+/)[0] ?? name

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()

    return combinedItems.filter((t) => {
      // If logged in as Oil Company, only show vehicles belonging to that company's group
      if (isOilCompanyUser && userCompanyId) {
        const vehicleGroup = String(t.group ?? '').trim().toLowerCase()
        if (vehicleGroup !== userCompanyId) return false
      }

      const searchHay = [t.name, t.imei, t.group ?? '', t.status, t.engine].join(' ').toLowerCase()
      const searchMatch = !q || searchHay.includes(q)

      const tag = statusTag(t)
      const isInsideDjibouti = isVehicleInDjibouti(t.lat, t.lng)
      const statusMatch =
        deferredStatus === 'All'
          ? true
          : deferredStatus.toUpperCase() === 'DJIBOUTI'
            ? isInsideDjibouti
            : tag.label.toUpperCase() === deferredStatus.toUpperCase()

      const isAssigned = activeDispatchesByVehicle.has(t.imei)
      const assignmentMatch =
        deferredAssignment === 'All'
          ? true
          : deferredAssignment === 'Assigned'
            ? isAssigned
            : !isAssigned

      return searchMatch && statusMatch && assignmentMatch
    })
  }, [combinedItems, isOilCompanyUser, userCompanyId, deferredSearch, deferredStatus, deferredAssignment, activeDispatchesByVehicle, statusTag])

  const fleetListItems = filtered

  const markers = useMemo(() => {
    const validFleets = fleetListItems.filter((t) => t.lat && t.lng)

    return validFleets
      .map((t) => {
        const lat = Number(t.lat)
        const lng = Number(t.lng)
        const angle = Number(t.angle) || 0
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

        const tag = statusTag(t)
        const dispatch = activeDispatchesByVehicle.get(t.imei)
        const inDjibouti = isVehicleInDjibouti(t.lat, t.lng)

        let markerColor =
          tag.label === 'MOVING'
            ? '#22c55e'
            : tag.label === 'IDLE'
              ? COLORS.gold
              : tag.label === 'OFFLINE'
                ? COLORS.gray
                : '#ef4444'

        let statusLabel = dispatch ? `Dispatch: ${dispatch.status}` : t.status
        if (dispatch && dispatch.status === 'On transit') markerColor = '#1c8547'

        if (inDjibouti) {
          statusLabel = `${statusLabel} (Inside Djibouti)`
        }

        return {
          id: t.imei,
          position: { lat, lng },
          label: t.name,
          subtitle: statusLabel,
          status: statusLabel,
          angle,
          color: markerColor,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  }, [fleetListItems, statusTag, activeDispatchesByVehicle])

  const mapBounds = useMemo(() => {
    const validItems = combinedItems.filter((t) => {
      if (!t.lat || !t.lng) return false
      const lat = Number(t.lat)
      const lng = Number(t.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
      return (
        lat >= ETHIOPIA_BOUNDS.minLat &&
        lat <= ETHIOPIA_BOUNDS.maxLat &&
        lng >= ETHIOPIA_BOUNDS.minLng &&
        lng <= ETHIOPIA_BOUNDS.maxLng
      )
    })

    if (validItems.length === 0) {
      return [
        [ETHIOPIA_BOUNDS.minLat, ETHIOPIA_BOUNDS.minLng],
        [ETHIOPIA_BOUNDS.maxLat, ETHIOPIA_BOUNDS.maxLng],
      ] as [[number, number], [number, number]]
    }

    let minLat = 90,
      maxLat = -90,
      minLng = 180,
      maxLng = -180
    validItems.forEach((v) => {
      const lat = Number(v.lat)
      const lng = Number(v.lng)
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    })

    if (minLat === maxLat) {
      minLat -= 0.01
      maxLat += 0.01
    }
    if (minLng === maxLng) {
      minLng -= 0.01
      maxLng += 0.01
    }

    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ] as [[number, number], [number, number]]
  }, [combinedItems])

  useEffect(() => {
    if (mapBounds && mapApiRef.current && !hasFitBounds) {
      mapApiRef.current.fitBounds(mapBounds)
      setTimeout(() => setHasFitBounds(true), 0)
    }
  }, [mapBounds, hasFitBounds])

  const handleSelectVehicle = (vehicle: GpsVehicle) => {
    setSelectedId(vehicle.imei)

    const lat = Number(vehicle.lat)
    const lng = Number(vehicle.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      mapApiRef.current?.flyTo({ lat, lng }, 18)
    }

    if (window.innerWidth < 768) {
      setIsListOpen(false)
    }
  }

  useLayoutEffect(() => {
    const el = listHostRef.current
    if (!el) return

    const updateSize = () => {
      setListSize({
        width: el.clientWidth,
        height: el.clientHeight,
      })
    }

    updateSize()

    const ro = new ResizeObserver(() => updateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative h-full w-full bg-slate-100 overflow-hidden">
      {/* Map background */}
      <MapView
        className="absolute inset-0 h-full w-full"
        center={defaultCenter}
        zoom={6}
        markers={markers}
        isClustered={isClustered}
        styleKey={mapStyle}
        selectedMarkerId={selectedId}
        onMarkerSelect={(id) => {
          setSelectedId(id)
          const v = combinedItems.find((x) => x.imei === id)
          if (v) handleSelectVehicle(v)
        }}
        onMapReady={(api) => {
          mapApiRef.current = api
          if (mapBounds && !hasFitBounds) {
            api.fitBounds(mapBounds)
            setHasFitBounds(true)
          }
        }}
      />

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden absolute top-4 left-4 z-20 p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-[#D1D5DB] text-slate-700 hover:bg-slate-50 transition"
        onClick={() => setIsListOpen(!isListOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Fleet Sidebar */}
      <FleetListSidebar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        assignmentFilter={assignmentFilter}
        setAssignmentFilter={setAssignmentFilter}
        isPendingFilter={isPendingFilter}
        isListLoading={isListLoading}
        queryError={queryError}
        fleetListItems={fleetListItems}
        combinedItems={combinedItems}
        selectedId={selectedId}
        onSelect={handleSelectVehicle}
        isListOpen={isListOpen}
        setIsListOpen={setIsListOpen}
        activeDispatchesByVehicle={activeDispatchesByVehicle}
        depotsById={depotsById}
        listHostRef={listHostRef}
        listSize={listSize}
        statusTag={statusTag}
        plateFromName={plateFromName}
        getItemSize={getItemSize}
        COLORS={COLORS}
      />

      {/* Floating Map Controls */}
      <TrackingMapControls
        isClustered={isClustered}
        setIsClustered={setIsClustered}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        onFitBounds={() => {
          if (mapBounds) mapApiRef.current?.fitBounds(mapBounds)
        }}
        onZoomIn={() => mapApiRef.current?.zoomIn()}
      />
    </div>
  )
}
