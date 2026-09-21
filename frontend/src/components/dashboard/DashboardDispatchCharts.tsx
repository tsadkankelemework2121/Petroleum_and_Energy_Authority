import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { SkeletonChart } from '../ui/Skeleton'

export default function DashboardDispatchCharts({
  dailyDispatchSummary,
  statusPie,
  dispatchesCount,
  isLoading,
  chartColors,
  pieColors,
}: {
  dailyDispatchSummary: any[]
  statusPie: any[]
  dispatchesCount: number
  isLoading: boolean
  chartColors: { blue: string; gold: string; gray: string }
  pieColors: Record<string, string>
}) {
  return (
    <>
      {/* Daily dispatch Bar Chart */}
      <div className="md:col-span-12 lg:col-span-8 min-w-0">
        <Card>
          <CardHeader
            title="Daily fuel dispatch — This week"
            subtitle="Confirmed dispatched volume (liters) — Benzine / Diesel / Jet Fuel"
            right={
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <MapPinIcon className="size-4" />
                Mon – Sun (Confirmed)
              </span>
            }
          />
          <CardBody className="overflow-x-auto p-4 md:p-6">
            {isLoading ? (
              <div className="h-[360px] min-w-[500px]">
                <SkeletonChart className="h-full" />
              </div>
            ) : (
              <div className="h-[360px] min-w-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyDispatchSummary} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="4 6" stroke="rgba(15, 23, 42, 0.08)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'rgba(71,85,105,0.9)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      label={{ value: 'Liters', angle: -90, position: 'insideLeft', offset: 10 }}
                      tick={{ fill: 'rgba(71,85,105,0.9)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                      contentStyle={{
                        borderRadius: 14,
                        border: '1px solid rgba(203,213,225,0.9)',
                        background: 'rgba(255,255,255,0.95)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Bar dataKey="benzineL" name="Benzine" fill={chartColors.blue} radius={[8, 8, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="dieselL" name="Diesel" fill={chartColors.gold} radius={[8, 8, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="jetFuelL" name="Jet Fuel" fill={chartColors.gray} radius={[8, 8, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Pie Chart of Status Counts */}
      <div className="md:col-span-12 lg:col-span-4 min-w-0">
        <Card>
          <CardBody className="h-80">
            {isLoading ? (
              <SkeletonChart className="h-full" />
            ) : (
              <div className="grid h-full grid-rows-[1fr_auto] gap-3">
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: '1px solid rgba(203,213,225,0.9)',
                          background: 'rgba(255,255,255,0.95)',
                        }}
                      />
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-text text-2xl font-bold"
                      >
                        {dispatchesCount.toLocaleString()}
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-text-muted text-[10px] font-semibold tracking-wide"
                      >
                        TOTAL DISPATCHES
                      </text>
                      <Pie
                        data={statusPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={96}
                        paddingAngle={2}
                      >
                        {statusPie.map((entry) => (
                          <Cell key={entry.name} fill={pieColors[entry.name as keyof typeof pieColors]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-2">
                  {statusPie.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: pieColors[s.name as keyof typeof pieColors] }}
                        />
                        <div className="text-xs font-medium text-text-muted">{s.name}</div>
                      </div>
                      <div className="text-xs font-semibold text-text">{s.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
