import { useState } from 'react'
import type { Transporter } from '../../data/types'

export default function TransporterCard({
  t,
}: {
  t: Transporter
}) {
  const [search, setSearch] = useState('')
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null)

  const filteredVehicles = t.vehicles.filter(
    (v) =>
      v.plateRegNo.toLowerCase().includes(search.toLowerCase()) ||
      v.driverName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col rounded-xl border border-[#D1D5DB] bg-white shadow-card max-h-[600px]">
      <div className="border-b border-[#D1D5DB] p-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text break-words">{t.name}</div>
            <div className="mt-1 text-xs text-text-muted">
              {t.location.city} • {t.location.region}
            </div>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-strong self-start sm:self-auto">
            {t.vehicles.length} vehicles
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[t.contacts.person1, t.contacts.person2, t.contacts.phone1, t.contacts.email1]
            .filter(Boolean)
            .map((c) => (
              <span key={c} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-muted">
                {c}
              </span>
            ))}
        </div>
      </div>

      <div className="p-4 shrink-0 border-b border-[#D1D5DB]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-text-muted">Vehicle Fleet</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search plate or driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-md border border-[#D1D5DB] bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-slate-50/30 rounded-b-xl">
        {/* Desktop Table */}
        <table className="hidden md:table w-full text-left text-sm relative">
          <thead className="bg-muted text-xs text-text-muted sticky top-0 z-10 shadow-sm border-b border-[#D1D5DB]">
            <tr>
              {['Plate', 'Oil Company', 'Trailer', 'Side', 'Driver'].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold text-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D1D5DB]">
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-xs">
                  No vehicles found.
                </td>
              </tr>
            ) : (
              filteredVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-white transition-colors">
                  <td className="whitespace-nowrap px-4 py-2.5 text-text font-medium flex items-center gap-1.5">
                    <span>{v.plateRegNo}</span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider leading-none border ${
                      v.id.startsWith('ztrack_')
                        ? 'bg-indigo-50/60 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/40'
                        : 'bg-primary/15 text-primary-strong border-primary/20 dark:bg-primary/10 dark:text-primary dark:border-primary/30'
                    }`}>
                      {v.id.startsWith('ztrack_') ? 'ztrack' : 'mella'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-text font-medium">
                    {v.oilCompany ?? 'null'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-text">{v.trailerRegNo}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-text">{v.sideNo}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-text">{v.driverName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-[#D1D5DB]">
          {filteredVehicles.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted text-xs">No vehicles found.</div>
          ) : (
            filteredVehicles.map((v) => (
              <div
                key={v.id}
                onClick={() => setExpandedVehicle(expandedVehicle === v.id ? null : v.id)}
                className="p-3 cursor-pointer active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text truncate flex items-center gap-1.5">
                      <span>{v.plateRegNo}</span>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider leading-none border ${
                        v.id.startsWith('ztrack_')
                          ? 'bg-indigo-50/60 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/40'
                          : 'bg-primary/15 text-primary-strong border-primary/20 dark:bg-primary/10 dark:text-primary dark:border-primary/30'
                      }`}>
                        {v.id.startsWith('ztrack_') ? 'ztrack' : 'mella'}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Oil Company: <span className="font-medium text-text">{v.oilCompany ?? 'null'}</span>
                    </div>
                  </div>
                  <svg
                    className={`size-4 text-text-muted shrink-0 transition-transform duration-200 ${
                      expandedVehicle === v.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedVehicle === v.id && (
                  <div className="mt-2 pt-2 border-t border-[#D1D5DB] grid grid-cols-2 gap-2 text-xs animate-fade-in-up">
                    <div>
                      <span className="text-text-muted">Driver:</span>{' '}
                      <span className="font-medium text-text">{v.driverName}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Trailer:</span>{' '}
                      <span className="font-medium text-text">{v.trailerRegNo}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Side:</span>{' '}
                      <span className="font-medium text-text">{v.sideNo}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
