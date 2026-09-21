import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, ArrowUpTrayIcon, UserGroupIcon, TruckIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import api from '../api/axios'
import type { Driver } from '../data/types'
import { fetchGpsVehicles } from '../data/gpsApi'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import DriverTable from '../components/drivers/DriverTable'
import DriverFormModal from '../components/drivers/DriverFormModal'
import DriverImportModal from '../components/drivers/DriverImportModal'

export default function DriversPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTransporterFilter, setSelectedTransporterFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)

  // Fetch Drivers from backend
  const { data: drivers = [], isLoading: isDriversLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get('/drivers')
      return res.data
    },
  })

  // Fetch GPS vehicles to link vehicles & transporters
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useQuery({
    queryKey: ['gps-vehicles'],
    queryFn: fetchGpsVehicles,
  })

  // Create or update driver mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Driver> & { password?: string }) => {
      if (editingDriver) {
        return api.put(`/drivers/${editingDriver.id}`, payload)
      } else {
        return api.post('/drivers', payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      setIsFormOpen(false)
      setEditingDriver(null)
    },
  })

  // Delete driver mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/drivers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })

  // Import drivers mutation
  const importMutation = useMutation({
    mutationFn: async (driversList: any[]) => {
      const res = await api.post('/drivers/import', { drivers: driversList })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })

  // Handlers
  const handleOpenCreate = () => {
    setEditingDriver(null)
    setIsFormOpen(true)
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setIsFormOpen(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      deleteMutation.mutate(id)
    }
  }

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.vehicle_plate_number && d.vehicle_plate_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.phone_number && d.phone_number.includes(searchTerm))

      if (!matchesSearch) return false

      if (selectedTransporterFilter === 'all') return true
      if (selectedTransporterFilter === 'none') return !d.transporter_name || d.transporter_name === 'null'
      return d.transporter_name === selectedTransporterFilter
    })
  }, [drivers, searchTerm, selectedTransporterFilter])

  // Unique transporter options for filter
  const filterTransporters = useMemo(() => {
    const list = drivers
      .map((d) => d.transporter_name)
      .filter((t): t is string => !!t && t !== 'null')
    return Array.from(new Set(list)).sort()
  }, [drivers])

  const totalAssigned = drivers.filter((d) => !!d.vehicle_plate_number).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers Management"
        subtitle="Manage fleet drivers, assign vehicles, provision credentials, and import transporter driver lists."
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-text shadow-sm hover:bg-muted/60 transition-colors"
            >
              <ArrowUpTrayIcon className="size-4 text-text-muted" />
              Import CSV
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="size-4" />
              Add Driver
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total Registered Drivers</p>
              <p className="mt-1 text-2xl font-bold text-text">{drivers.length}</p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserGroupIcon className="size-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Assigned to Vehicles</p>
              <p className="mt-1 text-2xl font-bold text-text">{totalAssigned}</p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TruckIcon className="size-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Transporter Companies</p>
              <p className="mt-1 text-2xl font-bold text-text">{filterTransporters.length}</p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BuildingOffice2Icon className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1">
          <input
            type="text"
            placeholder="Search by driver name, email, vehicle plate, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
          />
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={selectedTransporterFilter}
            onChange={(e) => setSelectedTransporterFilter(e.target.value)}
            className="w-full sm:w-60 rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
          >
            <option value="all">All Transporters</option>
            <option value="none">Private Fleet / None (null)</option>
            {filterTransporters.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Table or Loading/Empty */}
      {isDriversLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'No drivers found' : 'No drivers registered yet'}
          description={
            searchTerm
              ? 'Try adjusting your search criteria.'
              : 'Add drivers individually or import a batch CSV from your transporter deals.'
          }
          action={
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="size-4" />
              Add Driver
            </button>
          }
        />
      ) : (
        <DriverTable
          drivers={filteredDrivers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Driver Form Modal */}
      <DriverFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingDriver(null)
        }}
        onSubmit={async (data) => {
          await saveMutation.mutateAsync(data)
        }}
        initialData={editingDriver}
        vehicles={vehicles}
        isSubmitting={saveMutation.isPending}
      />

      {/* Driver Import Modal */}
      <DriverImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={async (driversList) => {
          return await importMutation.mutateAsync(driversList)
        }}
      />
    </div>
  )
}
