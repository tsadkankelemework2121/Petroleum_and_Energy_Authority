import { useState } from 'react'
import { MapPinIcon, CheckCircleIcon, EyeIcon } from '@heroicons/react/24/outline'
import StatusPill from '../ui/StatusPill'
import type { GpsVehicle } from '../../data/types'

export default function DispatchMobileCards({
  filteredTasks,
  vehicles,
  depotsById,
  isDepotAdmin,
  setTrackingTask,
  setConfirmTask,
  setViewConfirmation,
}: {
  filteredTasks: any[]
  vehicles: GpsVehicle[]
  depotsById: Map<string, any>
  isDepotAdmin: boolean
  setTrackingTask: (t: any) => void
  setConfirmTask: (t: any) => void
  setViewConfirmation: (t: any) => void
}) {
  const [expandedDispatchRow, setExpandedDispatchRow] = useState<string | null>(null)

  const isEtaDayReached = (etaDateTime?: string) => {
    if (!etaDateTime) return true
    const etaDate = new Date(etaDateTime)
    const today = new Date()
    return today.toDateString() >= etaDate.toDateString()
  }

  return (
    <div className="md:hidden divide-y divide-[#D1D5DB]">
      {filteredTasks.map((t: any) => {
        const gpsVehicle = vehicles.find((v) => v.imei === t.vehicleId || v.name === t.vehicleId)
        const vehicle = gpsVehicle?.name ?? t.vehicleId
        const depot = depotsById.get(t.destinationDepotId)?.name ?? t.destinationDepotId
        const oilCompany = t.oilCompanyId
        return (
          <div key={t.peaDispatchNo} className="overflow-hidden">
            <div
              onClick={() => setExpandedDispatchRow(expandedDispatchRow === t.peaDispatchNo ? null : t.peaDispatchNo)}
              className="p-4 cursor-pointer active:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-text truncate">{t.peaDispatchNo}</div>
                  <div className="text-xs text-text-muted mt-0.5 truncate">{vehicle}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={t.status} task={t} />
                  <svg className={`size-4 text-text-muted transition-transform duration-200 ${expandedDispatchRow === t.peaDispatchNo ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedDispatchRow === t.peaDispatchNo && (
                <div className="mt-3 pt-3 border-t border-[#D1D5DB] grid grid-cols-2 gap-3 text-sm animate-fade-in-up">
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Oil Company</div>
                    <div className="font-medium text-text mt-0.5">{oilCompany}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Transporter</div>
                    <div className="font-medium text-text mt-0.5">{t.transporterId || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Fuel Type</div>
                    <div className="font-medium text-text mt-0.5">{t.fuelType || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Liters</div>
                    <div className="font-medium text-text mt-0.5">{(t.dispatchedLiters || 0).toLocaleString()} L</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Dispatch Location</div>
                    <div className="font-medium text-text mt-0.5">{t.dispatchLocation}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Destination Depot</div>
                    <div className="font-medium text-text mt-0.5">{depot}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Dispatch Date</div>
                    <div className="font-medium text-text mt-0.5">{t.dispatchDateTime?.replace('T',' ').replace('Z','')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">ETA</div>
                    <div className="font-medium text-text mt-0.5">{t.etaDateTime?.replace('T',' ').replace('Z','')}</div>
                  </div>
                  {t.dropOffDateTime && (
                    <div>
                      <div className="text-[11px] text-text-muted font-medium">Drop-off</div>
                      <div className="font-medium text-text mt-0.5">{t.dropOffDateTime.replace('T',' ').replace('Z','')}</div>
                    </div>
                  )}
                  <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
                    {!isDepotAdmin && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTrackingTask(t); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <MapPinIcon className="size-3.5" /> Track
                      </button>
                    )}
                    {isDepotAdmin && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTrackingTask(t); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <MapPinIcon className="size-3.5" /> Follow Map
                      </button>
                    )}
                    {isDepotAdmin && t.status !== 'Delivered' && (
                      <button
                        type="button"
                        disabled={!isEtaDayReached(t.etaDateTime)}
                        onClick={(e) => { e.stopPropagation(); setConfirmTask(t); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition disabled:opacity-40"
                      >
                        <CheckCircleIcon className="size-3.5" /> Confirm Receipt
                      </button>
                    )}
                    {(t.status === 'Delivered' || t.confirmation) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewConfirmation(t); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                      >
                        <EyeIcon className="size-3.5" /> View Proof
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
      {filteredTasks.length === 0 && (
        <div className="p-6 text-sm text-text-muted text-center">No dispatch records found.</div>
      )}
    </div>
  )
}
