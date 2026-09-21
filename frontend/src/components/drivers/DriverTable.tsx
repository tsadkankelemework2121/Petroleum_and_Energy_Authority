import { useState } from 'react'
import {
  PencilIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import type { Driver } from '../../data/types'

interface DriverTableProps {
  drivers: Driver[]
  onEdit: (driver: Driver) => void
  onDelete: (id: number) => void
}

export default function DriverTable({ drivers, onEdit, onDelete }: DriverTableProps) {
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({})
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const togglePassword = (id: number) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyCredentials = (driver: Driver) => {
    const text = `Driver: ${driver.name}\nEmail: ${driver.email}\nPassword: ${driver.plain_password || 'driver123'}\nVehicle: ${driver.vehicle_plate_number || 'N/A'}`
    navigator.clipboard.writeText(text)
    setCopiedId(driver.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-[#E5E7EB]">
          <thead className="bg-[#F9FAFB]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Driver
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Assigned Vehicle
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Transporter
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Credentials
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] bg-white">
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-[#F9FAFB]/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {driver.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-text text-sm">{driver.name}</div>
                      <div className="text-xs text-text-muted flex items-center gap-1">
                        <EnvelopeIcon className="size-3" />
                        {driver.email}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  {driver.vehicle_plate_number ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                      <TruckIcon className="size-3.5" />
                      {driver.vehicle_plate_number}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted italic">Unassigned</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {driver.transporter_name && driver.transporter_name !== 'null' ? (
                    <span className="inline-flex items-center rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                      {driver.transporter_name}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted italic">Private Fleet (null)</span>
                  )}
                </td>

                <td className="px-6 py-4 text-xs text-text">
                  {driver.phone_number ? (
                    <div className="flex items-center gap-1.5">
                      <PhoneIcon className="size-3.5 text-text-muted" />
                      {driver.phone_number}
                    </div>
                  ) : (
                    <span className="text-text-muted italic">—</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted/40 px-2 py-1 rounded border border-[#E5E7EB]">
                      {revealedPasswords[driver.id]
                        ? driver.plain_password || 'driver123'
                        : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePassword(driver.id)}
                      className="p-1 text-text-muted hover:text-text rounded transition-colors"
                      title={revealedPasswords[driver.id] ? 'Hide password' : 'Show password'}
                    >
                      {revealedPasswords[driver.id] ? (
                        <EyeSlashIcon className="size-4" />
                      ) : (
                        <EyeIcon className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyCredentials(driver)}
                      className="p-1 text-primary hover:text-primary/80 rounded transition-colors"
                      title="Copy full credentials"
                    >
                      {copiedId === driver.id ? (
                        <ClipboardDocumentCheckIcon className="size-4 text-emerald-600" />
                      ) : (
                        <ClipboardDocumentIcon className="size-4" />
                      )}
                    </button>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(driver)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text transition-colors"
                      title="Edit driver"
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(driver.id)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Delete driver"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-text text-sm">{driver.name}</div>
                <div className="text-xs text-text-muted">{driver.email}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(driver)}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(driver.id)}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#F3F4F6]">
              <div>
                <span className="text-[11px] text-text-muted block">Vehicle Plate:</span>
                <span className="font-medium text-text">
                  {driver.vehicle_plate_number || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-muted block">Transporter:</span>
                <span className="font-medium text-text">
                  {driver.transporter_name && driver.transporter_name !== 'null'
                    ? driver.transporter_name
                    : 'Private Fleet'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] text-xs">
              <span className="text-text-muted">Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-muted/40 px-2 py-0.5 rounded text-[11px]">
                  {revealedPasswords[driver.id]
                    ? driver.plain_password || 'driver123'
                    : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => togglePassword(driver.id)}
                  className="text-text-muted hover:text-text"
                >
                  {revealedPasswords[driver.id] ? (
                    <EyeSlashIcon className="size-3.5" />
                  ) : (
                    <EyeIcon className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyCredentials(driver)}
                  className="text-primary hover:text-primary/80"
                >
                  {copiedId === driver.id ? (
                    <ClipboardDocumentCheckIcon className="size-3.5 text-emerald-600" />
                  ) : (
                    <ClipboardDocumentIcon className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
