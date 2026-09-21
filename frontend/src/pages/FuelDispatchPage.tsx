import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { fetchGpsVehicles } from '../data/gpsApi'
import type { Depot, DispatchTask, GpsVehicle } from '../data/types'
import { mapDepot } from '../data/types'
import { useAuth } from '../context/AuthContext'

import PageHeader from '../components/layout/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { PlusIcon } from '@heroicons/react/24/outline'
import {ModalOverlay} from '../components/ui/ModelOverlay'

// Existing role components
import NewDispatchForm from '../components/roles/epa-admin/DispatchForm'
import ConfirmReceiptForm from '../components/roles/depot/ConfirmReceiptForm'

// New page sub-components
import DispatchTable from '../components/fuel-dispatch/DispatchTable'
import DispatchMobileCards from '../components/fuel-dispatch/DispatchMobileCards'
import DispatchTrackingModal from '../components/fuel-dispatch/DispatchTrackingModal'

export default function FuelDispatchPage() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const queryClient = useQueryClient()

  const isDepotAdmin = user?.role?.toUpperCase() === 'DEPOT_ADMIN'
  const isEpaAdmin = user?.role?.toUpperCase() === 'EPA_ADMIN'
  const isOilCompany = user?.role?.toUpperCase() === 'OIL_COMPANY' || user?.role?.toUpperCase() === 'OIL_COMPANY_ADMIN'

  const canAddDispatch = isEpaAdmin || isOilCompany

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modals state
  const [showDispatchForm, setShowDispatchForm] = useState(false)
  const [confirmTask, setConfirmTask] = useState<DispatchTask | null>(null)
  const [trackingTask, setTrackingTask] = useState<DispatchTask | null>(null)
  const [viewConfirmation, setViewConfirmation] = useState<DispatchTask | null>(null)

  // 1. Fetch Dispatches
  const {
    data: rawTasks = [],
    isLoading: isDispatchesLoading,
  } = useQuery<DispatchTask[]>({
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
  })

  // 2. Fetch Depots
  const { data: depots = [], isLoading: isDepotsLoading } = useQuery<Depot[]>({
    queryKey: ['depots'],
    queryFn: () =>
      api.get('/depots').then((res) => res.data.map(mapDepot)),
  })

  // 3. Fetch GPS Vehicles
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useQuery<GpsVehicle[]>({
    queryKey: ['gps-vehicles'],
    queryFn: async () => {
      return await fetchGpsVehicles()
    },
  })

  const { data: registeredCompanies = [] } = useQuery({
    queryKey: ['oil-companies'],
    queryFn: async () => {
      try {
        const res = await api.get('/oil-companies')
        return res.data || []
      } catch {
        return []
      }
    },
  })

  const isInitialLoading = isDispatchesLoading || isDepotsLoading || isVehiclesLoading

  // Derived Mappings (Dynamic from GPS vehicle groups and registered accounts, no hardcoded OLA)
  const oilCompanies = useMemo(() => {
    const set = new Set<string>()
    vehicles.forEach((v) => {
      const g = v.group?.trim()
      if (g && g.toLowerCase() !== 'null' && g.toLowerCase() !== 'undefined') {
        set.add(g)
      }
    })
    registeredCompanies.forEach((rc: any) => {
      const name = (rc.company_id || rc.name || '').trim()
      if (name && name.toLowerCase() !== 'null') {
        set.add(name)
      }
    })
    if (user?.companyId) {
      set.add(user.companyId.trim())
    }
    return Array.from(set)
      .sort()
      .map((name) => ({
        id: name,
        name: name,
        contacts: {},
      }))
  }, [vehicles, registeredCompanies, user?.companyId])

  const depotsById = useMemo(() => new Map(depots.map((d) => [d.id, d] as const)), [depots])

  const statusTag = (v?: GpsVehicle) => {
    if (!v) return null
    const status = v.status.toLowerCase()
    if (status.includes('offline') || status.includes('signal')) return { label: 'OFFLINE', color: '#cbd5e1' }
    if (status.includes('alert')) return { label: 'ALERT', color: '#ef4444' }
    if (
      status.includes('idle') ||
      (Number.isFinite(Number(v.speed)) && Number(v.speed) === 0 && v.engine === 'on')
    ) {
      return { label: 'IDLE', color: '#f59f0a' }
    }
    if (status.includes('moving') || (Number.isFinite(Number(v.speed)) && Number(v.speed) > 0)) {
      return { label: 'MOVING', color: '#22c55e' }
    }
    return { label: 'STOPPED', color: '#ef4444' }
  }

  const filteredTasks = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawTasks.filter((t: any) => {

      // If depot admin is logged in, show only tasks assigned to their destination depot
      if (isDepotAdmin && user?.depotId) {
        if (t.destinationDepotId?.toString() !== user.depotId.toString()) {
          return false
        }
      }

      const matchesStatus = statusFilter === 'All' ? true : t.status === statusFilter

      const transporter = t.transporterId || '—'
      const vehicle =
        vehicles.find((v) => v.imei === t.vehicleId || v.name === t.vehicleId)?.name ?? t.vehicleId
      const depot = depotsById.get(t.destinationDepotId)?.name ?? t.destinationDepotId
      const oilCompany = t.oilCompanyId

      const text = `${t.peaDispatchNo} ${transporter} ${vehicle} ${depot} ${oilCompany} ${t.fuelType}`.toLowerCase()

      const matchesSearch = text.includes(search.toLowerCase())

      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, vehicles, depotsById, rawTasks, isDepotAdmin, user])

  if (isInitialLoading && rawTasks.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader title="Fuel Dispatches" subtitle="Loading dispatch records..." />
          <div className="p-8 flex items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Fuel Dispatches" subtitle="Track and manage fuel dispatches across all routes." />

      <Card>
        <CardHeader title="Dispatch Records" subtitle="Overview of all active and completed dispatches." />
        <div className="p-4 md:p-6 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                type="search"
                placeholder="Search dispatches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-72 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-56 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="All">All Events</option>
                <option value="On transit">On transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Exceeded ETA">Exceeded ETA</option>
                <option value="GPS Offline >24h">GPS Offline &gt;24h</option>
                <option value="Stopped >5h">Stopped &gt;5h</option>
              </select>
              <div>
                {canAddDispatch && (
                  <button
                    type="button"
                    onClick={() => setShowDispatchForm(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-strong transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 whitespace-nowrap"
                  >
                    <PlusIcon className="size-4" />
                    New Dispatch
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <DispatchTable
            filteredTasks={filteredTasks}
            vehicles={vehicles}
            depotsById={depotsById}
            isDepotAdmin={isDepotAdmin}
            setTrackingTask={setTrackingTask}
            setConfirmTask={setConfirmTask}
            setViewConfirmation={setViewConfirmation}
            statusTag={statusTag}
          />

          {/* Mobile Accordion Cards View */}
          <DispatchMobileCards
            filteredTasks={filteredTasks}
            vehicles={vehicles}
            depotsById={depotsById}
            isDepotAdmin={isDepotAdmin}
            setTrackingTask={setTrackingTask}
            setConfirmTask={setConfirmTask}
            setViewConfirmation={setViewConfirmation}
          />
        </div>
      </Card>

      {/* Real-time Tracking Modal Overlay */}
      {trackingTask && (
        <DispatchTrackingModal
          trackingTask={trackingTask}
          vehicles={vehicles}
          onClose={() => setTrackingTask(null)}
        />
      )}

      {/* EPA Admin New Dispatch Form Dialog */}
      <ModalOverlay
        isOpen={showDispatchForm}
        onClose={() => setShowDispatchForm(false)}
        title="Add New Dispatch Record"
      >
        <NewDispatchForm
          oilCompanies={oilCompanies}
          vehicles={vehicles}
          depots={depots}
          dispatches={rawTasks}
          onClose={() => setShowDispatchForm(false)}
          onSubmit={() => {
            setShowDispatchForm(false)
            queryClient.invalidateQueries({ queryKey: ['dispatches'] })
          }}
        />
      </ModalOverlay>

      {/* Depot Admin Confirm Delivery Form Dialog */}
      <ModalOverlay
        isOpen={!!confirmTask}
        onClose={() => setConfirmTask(null)}
        title="Confirm Delivery"
      >
        {confirmTask && (
          <ConfirmReceiptForm
            peaDispatchNo={confirmTask.peaDispatchNo}
            vehicleId={confirmTask.vehicleId}
            vehicles={vehicles}
            onClose={() => setConfirmTask(null)}
            onSuccess={() => {
              setConfirmTask(null)
              queryClient.invalidateQueries({ queryKey: ['dispatches'] })
            }}
          />
        )}
      </ModalOverlay>


      {/* View Delivery Confirmation Details Dialog */}
      {viewConfirmation && (
        <ModalOverlay
          isOpen={!!viewConfirmation}
          onClose={() => setViewConfirmation(null)}
          title={`Delivery Confirmation — ${viewConfirmation.peaDispatchNo}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-semibold text-slate-500">Confirmed By</span>
                <span className="font-bold text-slate-800">{viewConfirmation.confirmation?.confirmed_by || 'Depot Manager'}</span>
              </div>
              <div>
                <span className="block font-semibold text-slate-500">Delivery Date</span>
                <span className="font-bold text-slate-800">
                  {viewConfirmation.dropOffDateTime?.replace('T', ' ').replace('Z', '') || '—'}
                </span>
              </div>
            </div>
            <div>
              <span className="block font-semibold text-slate-500 mb-2">Confirmation Image / Document</span>
              {viewConfirmation.confirmation?.image_path ? (
                <div className="rounded-lg overflow-hidden border border-[#D1D5DB] max-h-80 bg-slate-50 flex items-center justify-center">
                  <img
                    src={`${api.defaults.baseURL?.replace('/api', '')}/storage/${viewConfirmation.confirmation.image_path}`}
                    alt="Delivery Confirmation"
                    className="max-h-80 object-contain w-full"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement
                      target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600'
                    }}
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-text-muted border border-dashed rounded-lg bg-slate-50">
                  No image provided.
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
