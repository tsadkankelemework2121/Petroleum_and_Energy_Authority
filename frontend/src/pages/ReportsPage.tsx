import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { fetchGpsVehicles } from '../data/gpsApi'
import type { Depot, DispatchTask, GpsVehicle } from '../data/types'
import { mapDepot } from '../data/types'
import PageHeader from '../components/layout/PageHeader'
import { useAuth } from '../context/AuthContext'
import { parseStatusDurationHours, getStatusCategory } from '../lib/parseGpsDuration'
import { isVehicleInDjibouti } from '../lib/geofence'

// Child components
import OperationalAuditReport from '../components/reports/OperationalAuditReport'
import DjiboutiGeofenceReport from '../components/reports/DjiboutiGeofenceReport'
import FormalReportSection from '../components/reports/FormalReportSection'
import RegionalMonthlyGainReport from '../components/reports/RegionalMonthlyGainReport'

type FilterType = 'dispatch' | 'vehicle' | 'depot'

function parseYmd(input: string): Date | null {
  const v = input.trim()
  if (!v) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDurationMs(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin - days * 60 * 24) / 60)
  const mins = totalMin - days * 60 * 24 - hours * 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  parts.push(`${mins}m`)
  return parts.join(' ')
}

export default function ReportsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId

  const [activeTab, setActiveTab] = useState<'audit' | 'regional' | 'geofence' | 'registry'>('regional')
  const [filterType, setFilterType] = useState<FilterType>('dispatch')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [expandedReportRow, setExpandedReportRow] = useState<number | null>(null)

  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState<{ query: string; from: string; to: string }>({
    query: '',
    from: '',
    to: '',
  })

  // 1. Fetch Dispatches
  const { data: dispatches = [], isLoading: dispatchesLoading } = useQuery<DispatchTask[]>({
    queryKey: ['dispatches'],
    queryFn: () =>
      api
        .get('/dispatches', { params: companyId ? { oil_company_id: companyId } : {} })
        .then((res) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          res.data.map((d: any) => ({
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
          }))
        ),
  })

  // 2. Fetch Depots
  const { data: depots = [], isLoading: depotsLoading } = useQuery<Depot[]>({
    queryKey: ['depots'],
    queryFn: () =>
      api.get('/depots').then((res) => res.data.map(mapDepot)),
  })


  // 3. Fetch GPS Vehicles
  const { data: gpsVehicles = [], isLoading: gpsLoading } = useQuery<GpsVehicle[]>({
    queryKey: ['gps-vehicles'],
    queryFn: async () => {
      return await fetchGpsVehicles()
    },
  })

  const isLoading = dispatchesLoading || depotsLoading || gpsLoading

  const depotsById = useMemo(() => new Map(depots.map((d) => [d.id, d] as const)), [depots])

  const vehiclesByImeiOrName = useMemo(() => {
    const map = new Map<string, GpsVehicle>()
    gpsVehicles.forEach((v) => {
      map.set(v.imei, v)
      map.set(v.name, v)
    })
    return map
  }, [gpsVehicles])

  const title = useMemo(() => {
    switch (filterType) {
      case 'dispatch':
        return 'Search by PEA Dispatch No. & Period'
      case 'vehicle':
        return 'Search by Vehicle Plate Reg. No. & Period'
      case 'depot':
        return 'Search by Depot'
    }
  }, [filterType])

  const getSearchPlaceholder = () => {
    switch (filterType) {
      case 'dispatch':
        return 'Dispatch No. (e.g., PEA001)'
      case 'vehicle':
        return 'Vehicle Plate (e.g., 3-11111 ET)'
      case 'depot':
        return 'Depot Name/ID (e.g., ID8548)'
    }
  }

  const result = useMemo(() => {
    if (isLoading) return { columns: [], rows: [] }

    const getVehicleName = (vid: string) => {
      return vehiclesByImeiOrName.get(vid)?.name || vid
    }

    const q = applied.query.trim().toLowerCase()
    const fromDate = parseYmd(applied.from)
    const toDate = parseYmd(applied.to)

    const inRange = (iso: string) => {
      if (!iso) return true
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return true
      if (fromDate && d < fromDate) return false
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        if (d > end) return false
      }
      return true
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = dispatches.filter((t: any) => inRange(t.dispatchDateTime))

    if (filterType === 'dispatch') {
      const rows = filtered
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any) => t.peaDispatchNo.toLowerCase().includes(q))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => {
          const plate = getVehicleName(t.vehicleId)
          const dispatchDt = t.dispatchDateTime?.replace('T', ' ').replace('Z', '') || '—'
          const dropDt = t.dropOffDateTime ? t.dropOffDateTime.replace('T', ' ').replace('Z', '') : '—'
          const duration = t.dropOffDateTime
            ? formatDurationMs(new Date(t.dropOffDateTime).getTime() - new Date(t.dispatchDateTime).getTime())
            : '—'

          return {
            task: t,
            cells: [t.peaDispatchNo, plate, t.oilCompanyId, t.transporterId || '—', dispatchDt, dropDt, duration],
          }
        })

      return {
        columns: ['Dispatch No.', 'Plate', 'Oil Company', 'Transporter', 'Dispatch Date/Time', 'Drop Off Date/Time', 'Duration', 'Event'],
        rows,
      }
    }

    if (filterType === 'vehicle') {
      const rows = filtered
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any) => {
          if (!q) return true
          const plate = getVehicleName(t.vehicleId)
          return plate.toLowerCase().includes(q)
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => {
          const plate = getVehicleName(t.vehicleId)
          const dispatchDt = t.dispatchDateTime?.replace('T', ' ').replace('Z', '') || '—'
          const dropDt = t.dropOffDateTime ? t.dropOffDateTime.replace('T', ' ').replace('Z', '') : '—'
          const duration = t.dropOffDateTime
            ? formatDurationMs(new Date(t.dropOffDateTime).getTime() - new Date(t.dispatchDateTime).getTime())
            : '—'

          return {
            task: t,
            cells: [
              plate,
              t.transporterId || '—',
              t.oilCompanyId,
              t.peaDispatchNo,
              dispatchDt,
              t.dispatchLocation,
              depotsById.get(t.destinationDepotId)?.name || t.destinationDepotId,
              dropDt,
              duration,
            ],
          }
        })

      return {
        columns: [
          'Vehicle Plate',
          'Transporter',
          'Oil Company',
          'Dispatch ID',
          'Dispatch Date/Time',
          'Dispatch Location',
          'Depot Name',
          'Drop Off Date/Time',
          'Duration',
          'Event',
        ],
        rows,
      }
    }

    // depot
    const rows = filtered
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((t: any) => {
        const depot = depotsById.get(t.destinationDepotId)
        const name = depot?.name || t.destinationDepotId
        if (!q) return true
        return name.toLowerCase().includes(q) || t.destinationDepotId.toLowerCase().includes(q)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => {
        const depot = depotsById.get(t.destinationDepotId)
        const depotName = depot?.name ?? '—'
        const plate = getVehicleName(t.vehicleId)
        const dropDt = t.dropOffDateTime ? t.dropOffDateTime.replace('T', ' ').replace('Z', '') : '—'
        const duration = t.dropOffDateTime
          ? formatDurationMs(new Date(t.dropOffDateTime).getTime() - new Date(t.dispatchDateTime).getTime())
          : '—'

        return {
          task: t,
          cells: [t.destinationDepotId, depotName, dropDt, plate, t.oilCompanyId, t.transporterId || '—', duration],
        }
      })

    return {
      columns: ['Depot ID', 'Depot Name', 'Drop Off Date/Time', 'Vehicle', 'Oil Company', 'Transporter', 'Duration', 'Event'],
      rows,
    }
  }, [applied, filterType, dispatches, depotsById, vehiclesByImeiOrName, isLoading])


  // Dashboard Summary Data
  const [showDashboardReport, setShowDashboardReport] = useState(true)

  const dashboardKpis = useMemo(() => {
    const now = new Date()
    const totalVehicles = gpsVehicles.length
    const djiboutiCount = gpsVehicles.filter((v) => isVehicleInDjibouti(v.lat, v.lng)).length
    const transit = dispatches.filter((d) => d.status === 'On transit').length
    const offline = gpsVehicles.filter((v) => {
      const cat = getStatusCategory(v.status)
      if (cat !== 'offline') return false
      return parseStatusDurationHours(v.status) > 24
    }).length
    const exceeded = dispatches.filter(
      (d) => d.status !== 'Delivered' && d.etaDateTime && new Date(d.etaDateTime) < now
    ).length
    return [
      { label: 'Total Vehicles', value: totalVehicles },
      { label: 'Vehicles in Djibouti', value: djiboutiCount },
      { label: 'On Transit', value: transit },
      { label: 'GPS Offline >24h', value: offline },
      { label: 'Exceeded ETA', value: exceeded },
    ]
  }, [dispatches, gpsVehicles])

  const fuelSummary = useMemo(() => {
    let benzine = 0,
      diesel = 0,
      jetFuel = 0
    dispatches.forEach((d) => {
      if (d.status === 'Delivered') {
        if (d.fuelType === 'Benzine') benzine += d.dispatchedLiters
        else if (d.fuelType === 'Diesel') diesel += d.dispatchedLiters
        else if (d.fuelType === 'Jet Fuel') jetFuel += d.dispatchedLiters
      }
    })
    return { benzine, diesel, jetFuel, total: benzine + diesel + jetFuel }
  }, [dispatches])

  const dailyDispatch = useMemo(() => {
    const now = new Date()
    const dow = now.getDay()
    const mondayOff = dow === 0 ? -6 : 1 - dow
    const mon = new Date(now)
    mon.setDate(now.getDate() + mondayOff)
    mon.setHours(0, 0, 0, 0)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const days = dayNames.map((name, i) => {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      return { day: name, date: d.toISOString().split('T')[0], benzine: 0, diesel: 0, jetFuel: 0 }
    })
    dispatches.forEach((d) => {
      if (!d.dispatchDateTime) return
      const dt = d.dispatchDateTime.split('T')[0]
      const m = days.find((day) => day.date === dt)
      if (!m) return
      if (d.fuelType === 'Benzine') m.benzine += d.dispatchedLiters
      else if (d.fuelType === 'Diesel') m.diesel += d.dispatchedLiters
      else if (d.fuelType === 'Jet Fuel') m.jetFuel += d.dispatchedLiters
    })
    return days
  }, [dispatches])



  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader title="National Logistics Reports" subtitle="Analyze fleet positions, geofences, and petroleum dispatch cycles." />
      </div>

      {/* Tabs Menu - hidden on print */}
      <div className="flex border-b border-[#D1D5DB] gap-6 mb-6 no-print overflow-x-auto">
        <button
          onClick={() => setActiveTab('regional')}
          className={`pb-3 font-semibold text-sm transition-all relative whitespace-nowrap ${
            activeTab === 'regional' ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Regional Monthly Gain
          {activeTab === 'regional' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 font-semibold text-sm transition-all relative whitespace-nowrap ${
            activeTab === 'audit' ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Operational Audit
          {activeTab === 'audit' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('geofence')}
          className={`pb-3 font-semibold text-sm transition-all relative whitespace-nowrap ${
            activeTab === 'geofence' ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Port Geofence (Djibouti)
          {activeTab === 'geofence' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('registry')}
          className={`pb-3 font-semibold text-sm transition-all relative whitespace-nowrap ${
            activeTab === 'registry' ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Formal Registry Search
          {activeTab === 'registry' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'regional' && (
        <RegionalMonthlyGainReport
          dispatches={dispatches}
          depots={depots}
          depotsById={depotsById}
        />
      )}

      {activeTab === 'audit' && (
        <OperationalAuditReport
          dispatches={dispatches}
          dashboardKpis={dashboardKpis}
          fuelSummary={fuelSummary}
          dailyDispatch={dailyDispatch}
          dispatchesLength={dispatches.length}
          showDashboardReport={showDashboardReport}
          setShowDashboardReport={setShowDashboardReport}
        />
      )}

      {activeTab === 'geofence' && (
        <div className="no-print">
          <DjiboutiGeofenceReport
            gpsVehicles={gpsVehicles}
            dispatches={dispatches}
            depotsById={depotsById}
          />
        </div>
      )}

      {activeTab === 'registry' && (
        <div className="no-print">
          <FormalReportSection
            filterType={filterType}
            setFilterType={setFilterType}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            expandedReportRow={expandedReportRow}
            setExpandedReportRow={setExpandedReportRow}
            query={query}
            setQuery={setQuery}
            from={from}
            setFrom={setFrom}
            to={to}
            setTo={setTo}
            setApplied={setApplied}
            title={title}
            getSearchPlaceholder={getSearchPlaceholder}
            result={result}
            isLoading={isLoading}
          />
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide normal UI wrapper components for clean printable sheet */
          header, aside, nav, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          /* Clean up the printable report area */
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  )
}