import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon,
  CameraIcon,
  ArrowPathIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  XMarkIcon,
  GlobeAltIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { fetchGpsVehicles } from '../data/gpsApi'
import type { GpsVehicle } from '../data/types'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'

export default function DriverPortalPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [confirmModalDispatch, setConfirmModalDispatch] = useState<any | null>(null)
  const [deliveryImage, setDeliveryImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [vehicleNotes, setVehicleNotes] = useState('All seals intact, fuel safely offloaded.')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Fetch driver dispatches from backend
  const { data: rawDispatches = [], isLoading: isDispatchesLoading } = useQuery<any[]>({
    queryKey: ['driver-dispatches', user?.vehiclePlateNumber],
    queryFn: async () => {
      const res = await api.get('/dispatches')
      return res.data
    },
    enabled: !!user,
  })

  // Fetch GPS Vehicles to find live tracking for driver's vehicle
  const { data: gpsVehicles = [], isLoading: isGpsLoading } = useQuery<GpsVehicle[]>({
    queryKey: ['gps-vehicles'],
    queryFn: fetchGpsVehicles,
    refetchInterval: 30000, // refresh every 30s
  })

  // Match driver's vehicle
  const myVehicle = useMemo(() => {
    if (!user?.vehiclePlateNumber) return null
    const plate = user.vehiclePlateNumber.trim().toLowerCase()
    return gpsVehicles.find((v) => v.name.toLowerCase() === plate) || null
  }, [gpsVehicles, user?.vehiclePlateNumber])

  // Get current browser location when opening delivery confirmation
  const handleOpenConfirm = (dispatch: any) => {
    setConfirmModalDispatch(dispatch)
    setDeliveryImage(null)
    setImagePreview(null)
    setConfirmError(null)

    // Try browser geolocation first, fallback to vehicle GPS
    if (navigator.geolocation) {
      setIsLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          setIsLocating(false)
        },
        () => {
          // If browser geo fails, fallback to vehicle GPS lat/lng if available
          if (myVehicle && myVehicle.lat && myVehicle.lng) {
            setLocationCoords({
              lat: Number(myVehicle.lat),
              lng: Number(myVehicle.lng),
            })
          }
          setIsLocating(false)
        }
      )
    } else if (myVehicle && myVehicle.lat && myVehicle.lng) {
      setLocationCoords({
        lat: Number(myVehicle.lat),
        lng: Number(myVehicle.lng),
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDeliveryImage(file)
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Confirm delivery mutation
  const deliverMutation = useMutation({
    mutationFn: async ({ dispatchId, formData }: { dispatchId: number; formData: FormData }) => {
      const res = await api.post(`/dispatches/${dispatchId}/deliver`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-dispatches'] })
      queryClient.invalidateQueries({ queryKey: ['dispatches'] })
      setConfirmModalDispatch(null)
      setDeliveryImage(null)
      setImagePreview(null)
    },
    onError: (err: any) => {
      setConfirmError(err?.response?.data?.message || err?.message || 'Failed to confirm delivery')
    },
  })

  const handleSubmitConfirmation = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmError(null)

    if (!deliveryImage) {
      setConfirmError('Please take or upload a photo of the delivery receipt / offload confirmation.')
      return
    }

    if (!confirmModalDispatch) return

    const formData = new FormData()
    formData.append('image', deliveryImage)
    if (locationCoords) {
      formData.append('latitude', String(locationCoords.lat))
      formData.append('longitude', String(locationCoords.lng))
    }
    formData.append('vehicle_status', vehicleNotes)

    deliverMutation.mutate({
      dispatchId: confirmModalDispatch.id,
      formData,
    })
  }

  const activeDispatches = rawDispatches.filter((d) => d.status !== 'Delivered')
  const completedDispatches = rawDispatches.filter((d) => d.status === 'Delivered')

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Driver Portal — ${user?.name || 'Driver'}`}
        subtitle={`Vehicle: ${user?.vehiclePlateNumber || 'Not assigned'} | Transporter: ${user?.transporterName || 'Private Fleet'}`}
        right={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        }
      />

      {/* Driver Vehicle Tracking Card */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TruckIcon className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                {user?.vehiclePlateNumber ? `Vehicle ${user.vehiclePlateNumber}` : 'No Vehicle Assigned'}
              </h2>
              <p className="text-xs text-text-muted">
                {myVehicle ? `Source: ${myVehicle.source?.toUpperCase()} GPS | IMEI: ${myVehicle.imei}` : 'GPS Telemetry Link'}
              </p>
            </div>
          </div>

          {myVehicle && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${myVehicle.lat},${myVehicle.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <GlobeAltIcon className="size-4" />
              Open Live Location in Google Maps
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-text-muted block">Current Status</span>
            <div className="mt-1 font-semibold text-text text-sm flex items-center gap-1.5">
              <span
                className={`size-2.5 rounded-full ${
                  myVehicle?.status?.toLowerCase().includes('online') || myVehicle?.status?.toLowerCase().includes('moving')
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
              {myVehicle?.status || 'Active'}
            </div>
          </div>

          <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-text-muted block">Speed</span>
            <div className="mt-1 font-semibold text-text text-sm">
              {myVehicle ? `${myVehicle.speed || 0} km/h` : '—'}
            </div>
          </div>

          <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-text-muted block">Fuel Level</span>
            <div className="mt-1 font-semibold text-text text-sm">
              {myVehicle?.fuel_1 || 'Normal'}
            </div>
          </div>

          <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-text-muted block">GPS Coordinates</span>
            <div className="mt-1 font-mono font-medium text-text text-xs truncate">
              {myVehicle ? `${Number(myVehicle.lat).toFixed(4)}, ${Number(myVehicle.lng).toFixed(4)}` : 'Location syncing'}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatches Awaiting Confirmation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text">Dispatches Awaiting Confirmation</h3>
            <p className="text-xs text-text-muted">Confirm delivery with offload receipt photo once arrived at destination depot</p>
          </div>
          <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-0.5 text-xs font-semibold border border-amber-200">
            {activeDispatches.length} Pending
          </span>
        </div>

        {isDispatchesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : activeDispatches.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center">
            <CheckCircleIcon className="mx-auto size-12 text-emerald-500" />
            <h4 className="mt-2 text-sm font-semibold text-text">No Pending Dispatches</h4>
            <p className="text-xs text-text-muted mt-1">
              You do not have any pending fuel dispatches awaiting confirmation at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDispatches.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm space-y-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {d.pea_dispatch_no || `DISP-#${d.id}`}
                    </span>
                    <h4 className="mt-2 text-base font-bold text-text">
                      {d.dispatched_liters?.toLocaleString() || d.dispatchedLiters?.toLocaleString()} L of {d.fuel_type || d.fuelType}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                    <ClockIcon className="size-3.5" />
                    {d.status || 'On transit'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <span className="text-text-muted text-[11px] block">Destination Depot</span>
                    <span className="font-semibold text-text flex items-center gap-1 mt-0.5">
                      <MapPinIcon className="size-3.5 text-text-muted" />
                      {d.depot?.name || `Depot #${d.destination_depot_id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px] block">Oil Company</span>
                    <span className="font-semibold text-text flex items-center gap-1 mt-0.5">
                      <BuildingOfficeIcon className="size-3.5 text-text-muted" />
                      {d.oil_company_id || 'EPA'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-text-muted">
                    ETA: {d.eta_datetime?.replace('T', ' ') || d.etaDateTime?.replace('T', ' ') || 'In Transit'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenConfirm(d)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition-colors"
                  >
                    <CheckCircleIcon className="size-4" />
                    Confirm Delivery
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Dispatches History */}
      {completedDispatches.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-base font-bold text-text">Delivered Dispatches History</h3>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-[#E5E7EB]">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-muted uppercase">
                    Dispatch #
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-muted uppercase">
                    Fuel & Volume
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-muted uppercase">
                    Destination
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-muted uppercase">
                    Delivered Date
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-text-muted uppercase">
                    Proof Photo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {completedDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F9FAFB]/80">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-text">
                      {d.pea_dispatch_no || `DISP-#${d.id}`}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-text">
                      <span className="font-semibold">
                        {d.dispatched_liters?.toLocaleString() || d.dispatchedLiters?.toLocaleString()} L
                      </span>{' '}
                      ({d.fuel_type || d.fuelType})
                    </td>
                    <td className="px-6 py-3.5 text-xs text-text">
                      {d.depot?.name || `Depot #${d.destination_depot_id}`}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-text-muted">
                      {d.drop_off_datetime?.replace('T', ' ') || 'Confirmed'}
                    </td>
                    <td className="px-6 py-3.5">
                      {d.confirmation?.image_path ? (
                        <a
                          href={`http://localhost:8000/storage/${d.confirmation.image_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <EyeIcon className="size-3.5" />
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-xs text-text-muted italic">Confirmed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      {confirmModalDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E7EB] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircleIcon className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text">Confirm Fuel Delivery</h2>
                  <p className="text-xs text-text-muted font-mono">{confirmModalDispatch.pea_dispatch_no}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmModalDispatch(null)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text transition-colors"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            {confirmError && (
              <div className="mt-4 rounded-xl bg-danger/10 p-3 text-xs font-medium text-danger border border-danger/20">
                {confirmError}
              </div>
            )}

            <form onSubmit={handleSubmitConfirmation} className="mt-4 space-y-4">
              <div className="rounded-xl bg-[#F9FAFB] p-3.5 border border-[#E5E7EB] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Fuel Type:</span>
                  <span className="font-semibold text-text">{confirmModalDispatch.fuel_type || confirmModalDispatch.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Dispatched Volume:</span>
                  <span className="font-semibold text-text">
                    {(confirmModalDispatch.dispatched_liters || confirmModalDispatch.dispatchedLiters)?.toLocaleString()} Liters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Destination Depot:</span>
                  <span className="font-semibold text-text">{confirmModalDispatch.depot?.name || `Depot #${confirmModalDispatch.destination_depot_id}`}</span>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Delivery Receipt / Offload Confirmation Photo <span className="text-danger">*</span>
                </label>

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#E5E7EB] bg-black/5 aspect-video flex items-center justify-center">
                    <img src={imagePreview} alt="Receipt Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryImage(null)
                        setImagePreview(null)
                      }}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#D1D5DB] hover:border-primary rounded-2xl p-6 cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20 text-center">
                    <CameraIcon className="size-8 text-primary mb-2" />
                    <span className="text-xs font-semibold text-text">Take Photo or Upload Image</span>
                    <span className="text-[11px] text-text-muted mt-0.5">Supports JPG, PNG (Max 10MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                      required
                    />
                  </label>
                )}
              </div>

              {/* Location Tag */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                  GPS Dropoff Location
                </label>
                <div className="flex items-center gap-2 text-xs rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
                  <MapPinIcon className="size-4 text-primary" />
                  <span className="font-mono text-text">
                    {isLocating
                      ? 'Acquiring GPS coordinates...'
                      : locationCoords
                      ? `${locationCoords.lat.toFixed(5)}, ${locationCoords.lng.toFixed(5)}`
                      : 'Coordinates recorded upon submission'}
                  </span>
                </div>
              </div>

              {/* Status Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Confirmation Notes
                </label>
                <input
                  type="text"
                  value={vehicleNotes}
                  onChange={(e) => setVehicleNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2 text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. All compartments sealed and checked"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setConfirmModalDispatch(null)}
                  className="rounded-xl border border-[#D1D5DB] px-4 py-2 text-xs font-medium text-text hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deliverMutation.isPending || !deliveryImage}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <CheckCircleIcon className="size-4" />
                  {deliverMutation.isPending ? 'Confirming...' : 'Submit Confirmation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
