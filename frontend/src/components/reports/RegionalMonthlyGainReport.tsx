import { useState, useMemo } from 'react'
import {
  MapPinIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PrinterIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Depot, DispatchTask } from '../../data/types'

interface RegionalMonthlyGainReportProps {
  dispatches: DispatchTask[]
  depots: Depot[]
  depotsById: Map<string, Depot>
}

export default function RegionalMonthlyGainReport({
  dispatches,
  depots,
  depotsById,
}: RegionalMonthlyGainReportProps) {
  // Current date for default month
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()) // 0-indexed: 0=Jan, 8=Sep
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({})

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const toggleRegionExpand = (region: string) => {
    setExpandedRegions((prev) => ({ ...prev, [region]: !prev[region] }))
  }

  // Filter dispatches for the selected month
  const monthlyDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      const dateStr = d.dropOffDateTime || d.dispatchDateTime
      if (!dateStr) return false
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return false
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
      } catch {
        return false
      }
    })
  }, [dispatches, selectedYear, selectedMonth])

  // Aggregate monthly gains per region and per depot
  const regionalData = useMemo(() => {
    // Map region -> { region, benzineL, dieselL, jetFuelL, totalL, dispatchesCount, depots: Map<depotId, { depot, benzineL, dieselL, jetFuelL, totalL, count }> }
    const regionMap = new Map<string, {
      region: string
      benzineL: number
      dieselL: number
      jetFuelL: number
      totalL: number
      dispatchesCount: number
      depotsMap: Map<string, {
        id: string
        name: string
        city: string
        benzineL: number
        dieselL: number
        jetFuelL: number
        totalL: number
        dispatchesCount: number
      }>
    }>()

    // Initialize with all known regions from registered depots so even zero-inflow regions are represented
    depots.forEach((depot) => {
      const reg = depot.location?.region?.trim() || 'Central / Unassigned'
      if (!regionMap.has(reg)) {
        regionMap.set(reg, {
          region: reg,
          benzineL: 0,
          dieselL: 0,
          jetFuelL: 0,
          totalL: 0,
          dispatchesCount: 0,
          depotsMap: new Map(),
        })
      }
      const rObj = regionMap.get(reg)!
      if (!rObj.depotsMap.has(depot.id)) {
        rObj.depotsMap.set(depot.id, {
          id: depot.id,
          name: depot.name,
          city: depot.location?.city || '—',
          benzineL: 0,
          dieselL: 0,
          jetFuelL: 0,
          totalL: 0,
          dispatchesCount: 0,
        })
      }
    })

    // Sum monthly dispatches
    monthlyDispatches.forEach((d) => {
      const depot = depotsById.get(d.destinationDepotId)
      const reg = depot?.location?.region?.trim() || 'Central / Unassigned'
      const depotId = d.destinationDepotId || 'unknown'
      const depotName = depot?.name || `Depot #${depotId}`
      const city = depot?.location?.city || '—'

      if (!regionMap.has(reg)) {
        regionMap.set(reg, {
          region: reg,
          benzineL: 0,
          dieselL: 0,
          jetFuelL: 0,
          totalL: 0,
          dispatchesCount: 0,
          depotsMap: new Map(),
        })
      }

      const rObj = regionMap.get(reg)!
      if (!rObj.depotsMap.has(depotId)) {
        rObj.depotsMap.set(depotId, {
          id: depotId,
          name: depotName,
          city: city,
          benzineL: 0,
          dieselL: 0,
          jetFuelL: 0,
          totalL: 0,
          dispatchesCount: 0,
        })
      }

      const dObj = rObj.depotsMap.get(depotId)!
      const liters = Number(d.dispatchedLiters || 0)

      rObj.totalL += liters
      rObj.dispatchesCount += 1
      dObj.totalL += liters
      dObj.dispatchesCount += 1

      if (d.fuelType === 'Benzine') {
        rObj.benzineL += liters
        dObj.benzineL += liters
      } else if (d.fuelType === 'Diesel') {
        rObj.dieselL += liters
        dObj.dieselL += liters
      } else if (d.fuelType === 'Jet Fuel') {
        rObj.jetFuelL += liters
        dObj.jetFuelL += liters
      }
    })

    const regionsList = Array.from(regionMap.values()).map((r) => ({
      ...r,
      depotsList: Array.from(r.depotsMap.values()).sort((a, b) => b.totalL - a.totalL),
    }))

    // Sort by highest fuel gain first
    return regionsList.sort((a, b) => b.totalL - a.totalL)
  }, [depots, depotsById, monthlyDispatches])

  // Overall monthly totals
  const overallTotals = useMemo(() => {
    return regionalData.reduce(
      (acc, r) => {
        acc.totalL += r.totalL
        acc.benzineL += r.benzineL
        acc.dieselL += r.dieselL
        acc.jetFuelL += r.jetFuelL
        acc.dispatchesCount += r.dispatchesCount
        if (r.totalL > 0) acc.activeRegionsCount += 1
        return acc
      },
      {
        totalL: 0,
        benzineL: 0,
        dieselL: 0,
        jetFuelL: 0,
        dispatchesCount: 0,
        activeRegionsCount: 0,
      }
    )
  }, [regionalData])

  // Top gaining region
  const topRegion = regionalData.length > 0 && regionalData[0].totalL > 0 ? regionalData[0] : null

  // Chart data for active regions
  const chartData = useMemo(() => {
    return regionalData
      .filter((r) => r.totalL > 0)
      .map((r) => ({
        region: r.region,
        Benzine: r.benzineL,
        Diesel: r.dieselL,
        'Jet Fuel': r.jetFuelL,
        Total: r.totalL,
      }))
  }, [regionalData])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Month Navigation & Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-xl border border-[#D1D5DB] p-2 text-text hover:bg-muted transition-colors"
            title="Previous Month"
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-sm">
            <CalendarDaysIcon className="size-5" />
            <span>
              {monthNames[selectedMonth]} {selectedYear}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-xl border border-[#D1D5DB] p-2 text-text hover:bg-muted transition-colors"
            title="Next Month"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-xl border border-[#D1D5DB] px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            {monthNames.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-[#D1D5DB] px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 transition-colors"
          >
            <PrinterIcon className="size-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Formal Printable Header */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PETROLEUM AND ENERGY AUTHORITY</h1>
            <h2 className="text-base font-bold text-slate-700 mt-1">
              Monthly Regional Fuel Distribution & Depot Gain Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: {monthNames[selectedMonth]} 1, {selectedYear} – {monthNames[selectedMonth]} {new Date(selectedYear, selectedMonth + 1, 0).getDate()}, {selectedYear}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Printed: {new Date().toLocaleDateString()}</div>
            <div className="font-semibold text-slate-700">Official Operational Audit</div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Total Monthly Fuel Gain
          </span>
          <div className="mt-2 text-2xl font-bold text-text">
            {overallTotals.totalL.toLocaleString()} <span className="text-sm font-normal text-text-muted">L</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {(overallTotals.totalL / 1000).toFixed(1)} m³ delivered nationally
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Total Delivered Dispatches
          </span>
          <div className="mt-2 text-2xl font-bold text-primary">
            {overallTotals.dispatchesCount}{' '}
            <span className="text-sm font-normal text-text-muted">trips</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            To {depots.length} registered strategic depots
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Active Receiving Regions
          </span>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {overallTotals.activeRegionsCount}{' '}
            <span className="text-sm font-normal text-text-muted">/ {regionalData.length}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">Regions with fuel inflows this month</p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Top Gaining Region
          </span>
          <div className="mt-2 text-lg font-bold text-text truncate">
            {topRegion ? topRegion.region : 'None'}
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {topRegion ? `${topRegion.totalL.toLocaleString()} L (${overallTotals.totalL > 0 ? Math.round((topRegion.totalL / overallTotals.totalL) * 100) : 0}%)` : '—'}
          </p>
        </div>
      </div>

      {/* Visual Regional Comparison Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm no-print">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <ChartBarIcon className="size-5 text-primary" />
                Regional Fuel Volume Comparison — {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <p className="text-xs text-text-muted">
                Breakdown of fuel gained per region by product (Benzine, Diesel, Jet Fuel)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#4B5563' }} />
                <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} L`, '']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend />
                <Bar dataKey="Benzine" fill="#1c8547" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Diesel" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Jet Fuel" fill="#6366f1" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Regional Breakdown Table */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text">
              Regional Inflows & Depot Gains ({monthNames[selectedMonth]} {selectedYear})
            </h3>
            <p className="text-xs text-text-muted">
              Click on any region row to expand depots situated within that region
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F9FAFB] text-xs font-semibold text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Region & Depots</th>
                <th className="px-6 py-4 text-right">Benzine (L)</th>
                <th className="px-6 py-4 text-right">Diesel (L)</th>
                <th className="px-6 py-4 text-right">Jet Fuel (L)</th>
                <th className="px-6 py-4 text-right">Total Gain (L)</th>
                <th className="px-6 py-4 text-right">Total Gain (m³)</th>
                <th className="px-6 py-4 text-center">National Share</th>
                <th className="px-6 py-4 text-center no-print">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white">
              {regionalData.map((reg) => {
                const sharePercent =
                  overallTotals.totalL > 0
                    ? ((reg.totalL / overallTotals.totalL) * 100).toFixed(1)
                    : '0'
                const isExpanded = !!expandedRegions[reg.region]

                return (
                  <>
                    <tr
                      key={reg.region}
                      onClick={() => toggleRegionExpand(reg.region)}
                      className={`hover:bg-[#F9FAFB] cursor-pointer transition-colors ${
                        isExpanded ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="size-4 text-primary shrink-0" />
                          <span className="font-bold text-text text-sm">{reg.region}</span>
                          <span className="text-xs text-text-muted">
                            ({reg.depotsList.length} depot{reg.depotsList.length === 1 ? '' : 's'})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {reg.benzineL.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {reg.dieselL.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {reg.jetFuelL.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-text">
                        {reg.totalL.toLocaleString()} L
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-600">
                        {(reg.totalL / 1000).toFixed(1)} m³
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                          {sharePercent}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center no-print">
                        <button
                          type="button"
                          className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="size-4 text-primary" />
                          ) : (
                            <ChevronDownIcon className="size-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Sub-table of Depots in this region */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={8} className="px-8 py-3">
                          <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs">
                            <div className="px-4 py-2 bg-slate-100/60 border-b border-[#E5E7EB] text-xs font-bold text-text-muted uppercase">
                              Depots in {reg.region} Region
                            </div>
                            <table className="min-w-full divide-y divide-[#E5E7EB] text-xs">
                              <thead className="bg-[#F9FAFB] text-text-muted">
                                <tr>
                                  <th className="px-4 py-2.5 text-left">Depot Name & City</th>
                                  <th className="px-4 py-2.5 text-right">Benzine</th>
                                  <th className="px-4 py-2.5 text-right">Diesel</th>
                                  <th className="px-4 py-2.5 text-right">Jet Fuel</th>
                                  <th className="px-4 py-2.5 text-right">Total Gain</th>
                                  <th className="px-4 py-2.5 text-center">Deliveries</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E7EB]">
                                {reg.depotsList.map((dep) => (
                                  <tr key={dep.id} className="hover:bg-[#F9FAFB]">
                                    <td className="px-4 py-2.5">
                                      <div className="flex items-center gap-2">
                                        <BuildingOffice2Icon className="size-3.5 text-slate-400" />
                                        <span className="font-semibold text-text">{dep.name}</span>
                                        <span className="text-text-muted">({dep.city})</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      {dep.benzineL.toLocaleString()} L
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      {dep.dieselL.toLocaleString()} L
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      {dep.jetFuelL.toLocaleString()} L
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-text">
                                      {dep.totalL.toLocaleString()} L
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-medium">
                                      {dep.dispatchesCount}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="px-6 py-4">Total Fuel Gained Across All Regions</td>
                <td className="px-6 py-4 text-right">{overallTotals.benzineL.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">{overallTotals.dieselL.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">{overallTotals.jetFuelL.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-primary font-black">
                  {overallTotals.totalL.toLocaleString()} L
                </td>
                <td className="px-6 py-4 text-right">
                  {(overallTotals.totalL / 1000).toFixed(1)} m³
                </td>
                <td className="px-6 py-4 text-center">100%</td>
                <td className="px-6 py-4 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
