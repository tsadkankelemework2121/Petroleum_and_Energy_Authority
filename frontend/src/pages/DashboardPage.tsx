import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { fetchGpsVehicles } from '../data/gpsApi'
import type { Depot, DispatchTask, GpsVehicle } from '../data/types'
import { mapDepot } from '../data/types'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { parseStatusDurationHours, getStatusCategory } from '../lib/parseGpsDuration'
import {
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  SignalSlashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { Card, CardHeader } from '../components/ui/Card'

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

  // 3. Fetch Depots for Oil Company
  const { data: rawDepots = [] } = useQuery<Depot[]>({
    queryKey: ['depots', companyId],
    queryFn: async () => {
      const res = await api.get('/depots', { params: companyId ? { oil_company_id: companyId } : {} })
      return res.data.map(mapDepot)
    },
    enabled: !!user,
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

    const cards = [
      { label: 'Total Vehicles', value: String(totalVehicles), hint: isOilCompanyUser ? 'Company fleet' : 'All tracked vehicles', icon: TruckIcon },
      { label: 'Vehicles in Djibouti', value: String(djiboutiCount), hint: 'Inside Djibouti border', icon: GlobeAltIcon },
      { label: 'Vehicles on transit', value: String(transit), hint: 'Active dispatches now', icon: TruckIcon },
      { label: 'GPS offline > 24 hrs', value: String(offline), hint: 'Check connectivity', icon: SignalSlashIcon },
      { label: 'Exceeded ETA', value: String(exceeded), hint: 'Needs attention', icon: ExclamationTriangleIcon },
    ]

    if (isOilCompanyUser) {
      cards.push({
        label: 'Company Depots',
        value: String(rawDepots.length),
        hint: 'Active receiving depots',
        icon: BuildingOffice2Icon,
      })
    }

    return cards
  }, [dispatches, relevantVehicles, isOilCompanyUser, rawDepots])

  // 4. Compute Daily Dispatch Summary (current week: Mon-Sun)
  const dailyDispatchSummary = useMemo(() => {
    const now = new Date()
    // Helper for local YYYY-MM-DD
    const toLocalDateStr = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Get Monday of current week
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
        date: toLocalDateStr(d),
        benzineL: 0,
        dieselL: 0,
        jetFuelL: 0,
      }
    })

    dispatches.forEach((d) => {
      // Only show fuel that has been confirmed/delivered by the driver or depot
      const isConfirmed = d.status === 'Delivered' || Boolean((d as any).confirmation)
      if (!isConfirmed) return

      const dt = d.dropOffDateTime || d.dispatchDateTime
      if (!dt) return
      let dispDateStr = ''
      try {
        const parsed = new Date(dt)
        if (!isNaN(parsed.getTime())) {
          dispDateStr = toLocalDateStr(parsed)
        } else {
          dispDateStr = dt.split('T')[0].split(' ')[0]
        }
      } catch {
        dispDateStr = dt.split('T')[0].split(' ')[0]
      }

      const match = days.find((day) => day.date === dispDateStr)
      if (!match) return
      if (d.fuelType === 'Benzine') match.benzineL += Number(d.dispatchedLiters || 0)
      else if (d.fuelType === 'Diesel') match.dieselL += Number(d.dispatchedLiters || 0)
      else if (d.fuelType === 'Jet Fuel') match.jetFuelL += Number(d.dispatchedLiters || 0)
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

        {/* Company Depots Section for Oil Company */}
        {isOilCompanyUser && (
          <div className="md:col-span-12 min-w-0">
            <Card>
              <CardHeader
                title="Company Depots"
                subtitle={`Registered destination depots for ${companyId || 'your company'}`}
                right={
                  <Link
                    to="/entities/depots"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-strong transition"
                  >
                    View & Manage Depots →
                  </Link>
                }
              />
              <div className="p-4 sm:p-6">
                {rawDepots.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    No depots registered yet.{' '}
                    <Link to="/entities/depots" className="text-primary font-semibold hover:underline">
                      Go to Depots section
                    </Link>{' '}
                    to register a new depot.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rawDepots.map((depot) => (
                      <div
                        key={depot.id}
                        className="rounded-xl border border-[#D1D5DB] bg-white p-4 shadow-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-text text-sm truncate">{depot.name}</h4>
                            <p className="text-xs text-text-muted mt-0.5">
                              {depot.location.city}, {depot.location.region}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Active
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-text-muted border-t border-slate-100 pt-2">
                          {depot.contacts.person1 && (
                            <div className="truncate">Contact: <span className="text-text font-medium">{depot.contacts.person1}</span></div>
                          )}
                          {depot.contacts.phone1 && (
                            <div className="truncate">Phone: <span className="text-text font-medium">{depot.contacts.phone1}</span></div>
                          )}
                          {depot.location.address && (
                            <div className="truncate">Address: <span className="text-text font-medium">{depot.location.address}</span></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
