import { useMemo } from 'react'
import api from '../api/axios'
import { fetchGpsVehicles } from '../data/gpsApi'
import type { DispatchTask, GpsVehicle } from '../data/types'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { parseStatusDurationHours, getStatusCategory } from '../lib/parseGpsDuration'
import {
  ExclamationTriangleIcon,
  GlobeAltIcon,
  SignalSlashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

// Child components
import DashboardStatsCards from '../components/dashboard/DashboardStatsCards'
import DashboardDispatchCharts from '../components/dashboard/DashboardDispatchCharts'
import FuelTypeSummary from '../components/dashboard/FuelTypeSummary'
import RecentDispatches from '../components/dashboard/RecentDispatches'

export default function DashboardPage() {
  const { user } = useAuth()
  const companyId = user?.companyId

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
            confirmation: d.confirmation || null,
          }))
        ),
    refetchInterval: 5 * 60 * 1000,
  })

  // 2. Fetch GPS Vehicles
  const { data: gpsVehicles = [], isLoading: gpsLoading } = useQuery<GpsVehicle[]>({
    queryKey: ['gps-vehicles'],
    queryFn: async () => {
      return await fetchGpsVehicles()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  const isLoading = dispatchesLoading || gpsLoading

  const chartColors = {
    blue: '#1c8547',
    gray: '#cbd5e1',
    gold: '#f59e0b',
  }

  const isOilCompanyUser = user?.role?.toUpperCase().includes('OIL_COMPANY')
  const userCompanyId = companyId?.trim()?.toLowerCase()

  const relevantVehicles = useMemo(() => {
    if (isOilCompanyUser && userCompanyId) {
      return gpsVehicles.filter((v) => String(v.group ?? '').trim().toLowerCase() === userCompanyId)
    }
    return gpsVehicles
  }, [gpsVehicles, isOilCompanyUser, userCompanyId])

  // 3. Compute KPIs
  const kpiCards = useMemo(() => {
    const now = new Date()

    // Total vehicles count
    const totalVehicles = relevantVehicles.length

    // Vehicles in Djibouti: lat 10.9-12.7, lng 41.7-43.5
    const djiboutiCount = relevantVehicles.filter((v) => {
      const lat = Number(v.lat)
      const lng = Number(v.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
      return lat >= 10.9 && lat <= 12.7 && lng >= 41.7 && lng <= 43.5
    }).length

    const transit = dispatches.filter((d) => d.status === 'On transit').length

    // GPS offline > 24 hrs: parse duration from the status field
    const offline = relevantVehicles.filter((v) => {
      const cat = getStatusCategory(v.status)
      if (cat !== 'offline') return false
      return parseStatusDurationHours(v.status) > 24
    }).length

    const exceeded = dispatches.filter(
      (d) => d.status !== 'Delivered' && d.etaDateTime && new Date(d.etaDateTime) < now
    ).length

    return [
      { label: 'Total Vehicles', value: String(totalVehicles), hint: isOilCompanyUser ? 'Company fleet' : 'All tracked vehicles', icon: TruckIcon },
      { label: 'Vehicles in Djibouti', value: String(djiboutiCount), hint: 'Inside Djibouti border', icon: GlobeAltIcon },
      { label: 'Vehicles on transit', value: String(transit), hint: 'Active dispatches now', icon: TruckIcon },
      { label: 'GPS offline > 24 hrs', value: String(offline), hint: 'Check connectivity', icon: SignalSlashIcon },
      { label: 'Exceeded ETA', value: String(exceeded), hint: 'Needs attention', icon: ExclamationTriangleIcon },
    ] as const
  }, [dispatches, relevantVehicles, isOilCompanyUser])

  // 4. Compute Daily Dispatch Summary (current week: Mon-Sun)
  const dailyDispatchSummary = useMemo(() => {
    const now = new Date()
    // Get Monday of the current week
    const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const days = dayNames.map((name, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return {
        day: name,
        date: d.toISOString().split('T')[0],
        benzineL: 0,
        dieselL: 0,
        jetFuelL: 0,
      }
    })

    dispatches.forEach((d) => {
      if (!d.dispatchDateTime) return
      const dispDate = d.dispatchDateTime.split('T')[0]
      const match = days.find((day) => day.date === dispDate)
      if (!match) return
      if (d.fuelType === 'Benzine') match.benzineL += d.dispatchedLiters
      else if (d.fuelType === 'Diesel') match.dieselL += d.dispatchedLiters
      else if (d.fuelType === 'Jet Fuel') match.jetFuelL += d.dispatchedLiters
    })

    return days
  }, [dispatches])

  // Compute Delivered Fuel Summary
  const deliveredSummary = useMemo(() => {
    let benzineM3 = 0
    let dieselM3 = 0
    let jetFuelM3 = 0

    dispatches.forEach((d) => {
      // Only show delivered dispatches
      if (d.status === 'Delivered') {
        if (d.fuelType === 'Benzine') benzineM3 += d.dispatchedLiters
        else if (d.fuelType === 'Diesel') dieselM3 += d.dispatchedLiters
        else if (d.fuelType === 'Jet Fuel') jetFuelM3 += d.dispatchedLiters
      }
    })

    return { benzineM3, dieselM3, jetFuelM3 }
  }, [dispatches])

  // 5. Compute Pie Chart (Status Counts)
  const statusPie = useMemo(() => {
    const counts = dispatches.reduce(
      (acc, d) => {
        const s = d.status || 'On transit'
        if (s === 'Delivered') acc.Delivered = (acc.Delivered || 0) + 1
        else if (s === 'On transit') acc['In Transit'] = (acc['In Transit'] || 0) + 1
        else acc.Alerts = (acc.Alerts || 0) + 1
        return acc
      },
      { Delivered: 0, 'In Transit': 0, Alerts: 0 } as Record<string, number>
    )

    return [
      { name: 'Delivered', value: counts.Delivered },
      { name: 'In Transit', value: counts['In Transit'] },
      { name: 'Alerts', value: counts.Alerts },
    ].filter((s) => s.value > 0)
  }, [dispatches])

  // 6. Recent Dispatches
  const recentDispatches = useMemo(() => {
    return [...dispatches]
      .sort((a, b) => new Date(b.dispatchDateTime).getTime() - new Date(a.dispatchDateTime).getTime())
      .slice(0, 6)
      .map((d) => {
        const vehicle = gpsVehicles.find(
          (v) =>
            v.name?.toLowerCase() === d.vehicleId?.toLowerCase() ||
            v.imei === d.vehicleId
        )
        return {
          ...d,
          oilCompany: d.oilCompanyId,
          transporter: vehicle?.group || d.transporterId || '—',
          eta: d.etaDateTime?.replace('T', ' ').replace('Z', '') || '—',
        }
      })
  }, [dispatches, gpsVehicles])

  const pieColors: Record<string, string> = {
    Delivered: chartColors.blue,
    'In Transit': chartColors.gray,
    Alerts: chartColors.gold,
  }

  return (
    <div className="pb-12">
      <div className="grid gap-4 md:grid-cols-12">
        {/* Stats Cards */}
        <div className="md:col-span-12 min-w-0">
          <DashboardStatsCards kpiCards={kpiCards} isLoading={isLoading} />
        </div>

        {/* Charts Row */}
        <DashboardDispatchCharts
          dailyDispatchSummary={dailyDispatchSummary}
          statusPie={statusPie}
          dispatchesCount={dispatches.length}
          isLoading={isLoading}
          chartColors={chartColors}
          pieColors={pieColors}
        />

        {/* Fuel Type Dispatch Summary */}
        <FuelTypeSummary deliveredSummary={deliveredSummary} isLoading={isLoading} chartColors={chartColors} />

        {/* Recent Dispatches */}
        <RecentDispatches recentDispatches={recentDispatches} />
      </div>
    </div>
  )
}
