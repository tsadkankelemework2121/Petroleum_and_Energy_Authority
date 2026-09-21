import { useState, useMemo } from 'react'
import api from '../api/axios'
import type { Depot } from '../data/types'
import { mapDepot } from '../data/types'
import PageHeader from '../components/layout/PageHeader'
import { ModalOverlay } from '../components/ui/ModelOverlay'
import { MapPinIcon, PlusIcon } from '@heroicons/react/24/outline'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Child components
import DepotForm from '../components/depots/DepotForm'
import DepotTable from '../components/depots/DepotTable'

export default function DepotsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingDepot, setEditingDepot] = useState<Depot | null>(null)
  const isOilCompany = user?.role === 'OIL_COMPANY_ADMIN' || user?.role?.toUpperCase() === 'OIL_COMPANY'
  const effectiveCompanyId = user?.companyId || (isOilCompany ? (user?.email?.split('@')[0]?.toUpperCase() || '') : undefined)
  const canAdd = isOilCompany // PEA admin shouldn't create depots
  const canManage = isOilCompany || user?.role === 'EPA_ADMIN'

  const { data: rawDepots = [], isLoading } = useQuery<Depot[]>({
    queryKey: ['depots', user?.companyId],
    queryFn: async () => {
      const res = await api.get('/depots', { params: user?.companyId ? { oil_company_id: user.companyId } : {} })
      return res.data.map(mapDepot)
    },
    enabled: !!user,
  })

  // Fetch available oil companies for PEA Admin creating depots
  const { data: registeredOilCompanies = [] } = useQuery({
    queryKey: ['oil-companies'],
    queryFn: async () => {
      try {
        const res = await api.get('/oil-companies')
        return res.data || []
      } catch {
        return []
      }
    },
    enabled: user?.role === 'EPA_ADMIN',
  })

  // Isolation: if Oil Company user is logged in, show their depots (backend also filters this)
  const items = useMemo(() => {
    if (isOilCompany) {
      if (user?.companyId) {
        const target = user.companyId.trim().toLowerCase()
        return rawDepots.filter((d) => {
          const comp = (d.oilCompanyId || (d as any).oil_company_id || '').trim().toLowerCase()
          return !comp || comp === target
        })
      }
      return rawDepots
    }
    return rawDepots
  }, [rawDepots, isOilCompany, user?.companyId])

  const openGoogleMaps = (depot: Depot) => {
    if (depot.mapLink) {
      window.open(depot.mapLink, '_blank')
    } else if (depot.mapLocation) {
      const { lat, lng } = depot.mapLocation
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
    } else {
      const query = encodeURIComponent(`${depot.location.address}, ${depot.location.city}, ${depot.location.region}`)
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }
  }

  const handleEdit = (depot: Depot) => {
    setEditingDepot(depot)
    setShowForm(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = async (payload: any) => {
    try {
      if (editingDepot) {

        await api.post(`/depots/${editingDepot.id}`, { ...payload, _method: 'PUT' })
      } else {
        await api.post('/depots', payload)
      }
      setShowForm(false)
      setEditingDepot(null)
      queryClient.invalidateQueries({ queryKey: ['depots'] })
    } catch (err) {
      console.error(err)
      alert('Error saving depot. Please check your data.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Depots"
        subtitle="Depots with contact details and map location."
        right={
          canAdd && (
            <button
              type="button"
              onClick={() => {
                setEditingDepot(null)
                setShowForm(!showForm)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-strong transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <PlusIcon className="size-4" />
              New Depot
            </button>
          )
        }
      />

      <ModalOverlay
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingDepot(null)
        }}
        title={editingDepot ? `Edit Depot: ${editingDepot.name}` : 'Add New Depot'}
      >
        <DepotForm
          companyId={effectiveCompanyId}
          editingDepot={editingDepot}
          oilCompanies={registeredOilCompanies}
          onClose={() => {
            setShowForm(false)
            setEditingDepot(null)
          }}
          onSubmit={handleFormSubmit}
        />
      </ModalOverlay>

      {isLoading ? (
        <>
          <div className="hidden md:block rounded-xl border border-[#D1D5DB] bg-white">
            <table className="min-w-[800px] w-full divide-y divide-[#D1D5DB]">
              <thead className="bg-muted/50">
                <tr>
                  {['Depot', 'Location', 'Contact Person', 'Phone', 'Email', 'Actions'].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32 mt-2" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-[#D1D5DB] bg-white p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32 mt-2" />
              </div>
            ))}
          </div>
        </>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MapPinIcon className="size-8" />}
          title="No depots yet"
          description="Add your first depot to get started with contact details and map locations."
          action={
            canAdd ? (
              <button
                type="button"
                onClick={() => {
                  setEditingDepot(null)
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-strong transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <PlusIcon className="size-4" />
                Add your first depot
              </button>
            ) : undefined
          }
        />
      ) : (
        <DepotTable
          items={items}
          canManage={canManage}
          openGoogleMaps={openGoogleMaps}
          handleEdit={handleEdit}
        />
      )}

      {/* Add custom animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}