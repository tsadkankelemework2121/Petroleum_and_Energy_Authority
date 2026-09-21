import { useState, useEffect, useMemo } from 'react'
import { XMarkIcon, KeyIcon } from '@heroicons/react/24/outline'
import type { Driver, GpsVehicle } from '../../data/types'
import { extractTransporterName } from '../../lib/vehicleUtils'

interface DriverFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<Driver> & { password?: string }) => Promise<void>
  initialData?: Driver | null
  vehicles: GpsVehicle[]
  isSubmitting?: boolean
}

export default function DriverFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  vehicles,
  isSubmitting = false,
}: DriverFormModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState('')
  const [transporterName, setTransporterName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Extract unique transporter list from vehicles
  const transporterList = useMemo(() => {
    const set = new Set<string>()
    vehicles.forEach((v) => {
      const t = extractTransporterName(v.custom_fields)
      if (t && t !== 'null' && t.trim() !== '') {
        set.add(t.trim())
      }
    })
    return Array.from(set).sort()
  }, [vehicles])

  // Extract unique vehicle plates
  const vehiclePlates = useMemo(() => {
    const list = vehicles.map((v) => v.name).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [vehicles])

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setEmail(initialData.email || '')
      setPhoneNumber(initialData.phone_number || '')
      setVehiclePlateNumber(initialData.vehicle_plate_number || '')
      setTransporterName(initialData.transporter_name || '')
      setPassword('')
    } else {
      setName('')
      setEmail('')
      setPhoneNumber('')
      setVehiclePlateNumber('')
      setTransporterName('')
      setPassword('driver123')
    }
    setError(null)
  }, [initialData, isOpen])

  // Auto-detect transporter if a known vehicle is selected
  const handleVehicleChange = (plate: string) => {
    setVehiclePlateNumber(plate)
    const match = vehicles.find((v) => v.name.toLowerCase() === plate.toLowerCase())
    if (match) {
      const t = extractTransporterName(match.custom_fields)
      if (t) {
        setTransporterName(t)
      }
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.')
      return
    }

    if (!initialData && (!password || password.length < 4)) {
      setError('Password must be at least 4 characters.')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phoneNumber.trim() || null,
        vehicle_plate_number: vehiclePlateNumber.trim() || null,
        transporter_name: transporterName.trim() === 'null' || !transporterName.trim() ? null : transporterName.trim(),
        ...(password ? { password } : {}),
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save driver')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all border border-[#E5E7EB]">
        <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
          <h2 className="text-xl font-bold text-text">
            {initialData ? 'Edit Driver' : 'Register New Driver'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text transition-colors"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-danger/10 p-3 text-xs font-medium text-danger border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Abebe Kebede"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="driver@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+251 91 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Assigned Vehicle Plate
              </label>
              <input
                list="vehicle-plate-options"
                type="text"
                placeholder="e.g. ET-3-12345"
                value={vehiclePlateNumber}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <datalist id="vehicle-plate-options">
                {vehiclePlates.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Transporter Company
              </label>
              <select
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
              >
                <option value="">-- Select Transporter --</option>
                <option value="null">None / Private Firm (null)</option>
                {transporterList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
              {initialData ? 'New Password (leave empty to keep unchanged)' : 'Login Password *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required={!initialData}
                placeholder={initialData ? 'Unchanged' : 'e.g. driver123'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {!initialData && (
                <button
                  type="button"
                  onClick={() => setPassword(`drv${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:underline flex items-center gap-1 bg-white px-1"
                >
                  <KeyIcon className="size-3.5" />
                  Generate
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-text-muted">
              Credentials can be shared with the driver to log in on the Driver Portal.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3F4F6]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-text hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Driver' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
