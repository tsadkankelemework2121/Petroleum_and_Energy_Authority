import { MapPinIcon, CheckCircleIcon, EyeIcon } from '@heroicons/react/24/outline'
import StatusPill from '../ui/StatusPill'
import type { GpsVehicle } from '../../data/types'

export default function DispatchTable({
  filteredTasks,
  vehicles,
  depotsById,
  isDepotAdmin,
  setTrackingTask,
  setConfirmTask,
  setViewConfirmation,
  statusTag,
}: {
  filteredTasks: any[]
  vehicles: GpsVehicle[]
  depotsById: Map<string, any>
  isDepotAdmin: boolean
  setTrackingTask: (t: any) => void
  setConfirmTask: (t: any) => void
  setViewConfirmation: (t: any) => void
  statusTag: (v?: GpsVehicle) => { label: string; color: string } | null
}) {
  const isEtaDayReached = (etaDateTime?: string) => {
    if (!etaDateTime) return true
    const etaDate = new Date(etaDateTime)
    const today = new Date()
    return today.toDateString() >= etaDate.toDateString()
  }

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="min-w-300 w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-text-muted">
          <tr>
            {[
              'PEA Dispatch No.',
              'Oil Company',
              'Transporter',
              'Vehicle Plate',
              'Fuel Type',
              'Liters',
              'Dispatch Location',
              'Destination Depot',
              'Dispatch Date',
              'ETA',
              'Drop-off',
              'Event',
              '',
            ].map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D1D5DB]">
          {filteredTasks.map((t: any) => {
            const gpsVehicle = vehicles.find((v) => v.imei === t.vehicleId || v.name === t.vehicleId)
            const vehicle = gpsVehicle?.name ?? t.vehicleId
            const depot = depotsById.get(t.destinationDepotId)?.name ?? t.destinationDepotId
            const oilCompany = t.oilCompanyId
            const vTag = statusTag(gpsVehicle)
            return (
              <tr key={t.peaDispatchNo} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-4 font-semibold">{t.peaDispatchNo}</td>
                <td className="whitespace-nowrap px-4 py-4">{oilCompany}</td>
                <td className="whitespace-nowrap px-4 py-4">{t.transporterId || '—'}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-slate-800">{vehicle}</span>
                    {vTag && (
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
                        style={{ backgroundColor: `${vTag.color}1A`, color: vTag.color }}
                      >
                        {vTag.label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4">{t.fuelType || '—'}</td>
                <td className="whitespace-nowrap px-4 py-4">{(t.dispatchedLiters || 0).toLocaleString()} L</td>
                <td className="whitespace-nowrap px-4 py-4 text-slate-600">{t.dispatchLocation}</td>
                <td className="whitespace-nowrap px-4 py-4">{depot}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  {t.dispatchDateTime?.replace('T', ' ').replace('Z', '')}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {t.etaDateTime?.replace('T', ' ').replace('Z', '')}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {t.dropOffDateTime ? t.dropOffDateTime.replace('T', ' ').replace('Z', '') : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <StatusPill status={t.status} task={t} />
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right space-x-2">
                  {!isDepotAdmin && (
                    <button
                      type="button"
                      onClick={() => setTrackingTask(t)}
                      title="Follow Map"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                    >
                      <MapPinIcon className="size-3.5" />
                    </button>
                  )}
                  {isDepotAdmin && (
                    <button
                      type="button"
                      onClick={() => setTrackingTask(t)}
                      title="Follow on Map"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                    >
                      <MapPinIcon className="size-3.5" />
                      Follow
                    </button>
                  )}
                  {isDepotAdmin && t.status !== 'Delivered' && (
                    <button
                      type="button"
                      disabled={!isEtaDayReached(t.etaDateTime)}
                      onClick={() => setConfirmTask(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!isEtaDayReached(t.etaDateTime) ? 'Available on ETA date' : 'Confirm delivery'}
                    >
                      <CheckCircleIcon className="size-3.5" />
                      Confirm
                    </button>
                  )}
                  {(t.status === 'Delivered' || t.confirmation) && (
                    <button
                      type="button"
                      onClick={() => setViewConfirmation(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                      title="View Confirmation"
                    >
                      <EyeIcon className="size-3.5" />
                      View Proof
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
          {filteredTasks.length === 0 && (
            <tr>
              <td colSpan={13} className="px-4 py-6 text-text-muted">
                No dispatch records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
