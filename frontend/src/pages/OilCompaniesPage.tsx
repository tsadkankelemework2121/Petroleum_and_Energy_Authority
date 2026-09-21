import { fetchGpsVehicles } from '../data/gpsApi'
import { useMemo, useState } from 'react'
import { Skeleton } from '../components/ui/Skeleton'
import PageHeader from '../components/layout/PageHeader'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { OilCompany, Depot, GpsVehicle } from '../data/types'
import { mapDepot } from '../data/types'
import { ModalOverlay } from '../components/ui/ModelOverlay'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  BuildingOffice2Icon,
  TruckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'

interface RegisteredCompanyUser {
  id: number
  name: string
  email: string
  company_id: string
  plain_password?: string
  created_at?: string
}

export interface DetailedOilCompany extends OilCompany {
  plain_password?: string
  db_user_id?: number
}

export default function OilCompaniesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<DetailedOilCompany | null>(null)
  const [expandedMobileRow, setExpandedMobileRow] = useState<string | null>(null)

  const isOilCompanyUser = user?.role?.toUpperCase().includes('OIL_COMPANY')
  const userCompanyId = user?.companyId?.trim()?.toLowerCase()

  const { data: vehicles = [], isLoading: isVehiclesLoading } = useQuery<GpsVehicle[]>({
    queryKey: ['gps-vehicles'],
    queryFn: fetchGpsVehicles,
  })

  const { data: depots = [] } = useQuery<Depot[]>({
    queryKey: ['depots'],
    queryFn: async () => {
      try {
        const res = await api.get('/depots')
        return res.data.map(mapDepot)
      } catch {
        return []
      }
    },
  })

  const { data: registeredUsers = [], isLoading: isUsersLoading } = useQuery<RegisteredCompanyUser[]>({
    queryKey: ['oil-companies'],
    queryFn: async () => {
      try {
        const res = await api.get('/oil-companies')
        return res.data || []
      } catch (err) {
        console.error('Error fetching registered oil companies:', err)
        return []
      }
    },
  })

  // Local state for newly created companies in this session
  const [localCompanies, setLocalCompanies] = useState<DetailedOilCompany[]>([])

  // Extract all detected groups from GPS data
  const detectedGroups = useMemo(() => {
    const set = new Set<string>()
    vehicles.forEach((v) => {
      const g = v.group?.trim()
      if (g && g.toLowerCase() !== 'null' && g.toLowerCase() !== 'undefined') {
        set.add(g)
      }
    })
    return Array.from(set).sort()
  }, [vehicles])

  // Merge GPS groups, backend registered oil company users, and local companies (NO HARDCODED OLA)
  const companies = useMemo(() => {
    const map = new Map<string, DetailedOilCompany>()

    // 1. Groups detected from live GPS fleet data
    detectedGroups.forEach((groupName) => {
      map.set(groupName.toUpperCase(), {
        id: groupName,
        name: groupName,
        contacts: {},
      })
    })

    // 2. Merge registered backend users for oil companies
    registeredUsers.forEach((u) => {
      const companyKey = (u.company_id || u.name || '').trim().toUpperCase()
      if (!companyKey) return

      const existing = map.get(companyKey)
      if (existing) {
        existing.contacts.email1 = u.email
        existing.contacts.person1 = existing.contacts.person1 || u.name
        existing.plain_password = u.plain_password
        existing.db_user_id = u.id
      } else {
        map.set(companyKey, {
          id: u.company_id || u.name,
          name: u.company_id || u.name,
          plain_password: u.plain_password,
          db_user_id: u.id,
          contacts: {
            person1: u.name,
            email1: u.email,
          },
        })
      }
    })

    // 3. Merge local session additions
    localCompanies.forEach((lc) => {
      const key = lc.id.trim().toUpperCase()
      const existing = map.get(key)
      if (existing) {
        existing.contacts = { ...existing.contacts, ...lc.contacts }
        if (lc.plain_password) existing.plain_password = lc.plain_password
        if (lc.db_user_id) existing.db_user_id = lc.db_user_id
      } else {
        map.set(key, lc)
      }
    })

    let list = Array.from(map.values())

    // If logged in as an Oil Company, only show that oil company's entry!
    if (isOilCompanyUser && userCompanyId) {
      list = list.filter((c) => c.id.trim().toLowerCase() === userCompanyId)
    }

    return list
  }, [detectedGroups, registeredUsers, localCompanies, isOilCompanyUser, userCompanyId])

  // Count vehicles per group
  const vehicleCountByGroup = useMemo(() => {
    const counts = new Map<string, number>()
    vehicles.forEach((v) => {
      const g = v.group?.trim()?.toUpperCase()
      if (g) {
        counts.set(g, (counts.get(g) || 0) + 1)
      }
    })
    return counts
  }, [vehicles])

  // Count depots per group
  const depotCountByGroup = useMemo(() => {
    const counts = new Map<string, number>()
    depots.forEach((d) => {
      const g = d.oilCompanyId?.trim()?.toUpperCase()
      if (g) {
        counts.set(g, (counts.get(g) || 0) + 1)
      }
    })
    return counts
  }, [depots])

  const isLoading = isVehiclesLoading || isUsersLoading

  return (
    <div>
      <PageHeader
        title="Oil Companies"
        subtitle={
          isOilCompanyUser
            ? 'Your company profile, fleet affiliation, and depot resources.'
            : 'Manage oil companies, fleet affiliations, and system login credentials. Click any company to view details.'
        }
        right={
          user?.role === 'EPA_ADMIN' ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-strong transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              <PlusIcon className="size-4" />
              Add Oil Company
            </button>
          ) : undefined
        }
      />

      {/* Modal: Create Oil Company */}
      <ModalOverlay
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Oil Company Credentials"
      >
        <NewOilCompanyForm
          detectedGroups={detectedGroups}
          onClose={() => setShowForm(false)}
          onSuccess={(newCompany) => {
            setLocalCompanies((prev) => [...prev, newCompany])
            queryClient.invalidateQueries({ queryKey: ['oil-companies'] })
            setShowForm(false)
          }}
        />
      </ModalOverlay>

      {/* Modal: Oil Company Details (shows password, vehicles, depots) */}
      <ModalOverlay
        isOpen={!!selectedCompanyDetails}
        onClose={() => setSelectedCompanyDetails(null)}
        title={`Oil Company Details: ${selectedCompanyDetails?.name || ''}`}
      >
        {selectedCompanyDetails && (
          <OilCompanyDetailsModal
            company={selectedCompanyDetails}
            vehicles={vehicles.filter(
              (v) => String(v.group ?? '').trim().toLowerCase() === selectedCompanyDetails.id.trim().toLowerCase()
            )}
            depots={depots.filter(
              (d) => (d.oilCompanyId || '').trim().toLowerCase() === selectedCompanyDetails.id.trim().toLowerCase()
            )}
            canManageCredentials={user?.role === 'EPA_ADMIN'}
            onClose={() => setSelectedCompanyDetails(null)}
            onUpdated={(updated) => {
              setLocalCompanies((prev) => {
                const filtered = prev.filter((p) => p.id !== updated.id)
                return [...filtered, updated]
              })
              queryClient.invalidateQueries({ queryKey: ['oil-companies'] })
              setSelectedCompanyDetails(updated)
            }}
          />
        )}
      </ModalOverlay>

      {isLoading ? (
        <>
          {/* Desktop Skeleton */}
          <div className="hidden md:block rounded-xl border border-[#D1D5DB] bg-white">
            <table className="min-w-225 w-full text-left text-sm">
              <thead className="bg-muted text-xs text-text-muted border-b border-[#D1D5DB]">
                <tr>
                  {['Company (Group)', 'Fleet Size', 'Depots', 'Contact Person', 'Login Email', 'Phone', 'Credential Status'].map(
                    (h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-wider">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB]">
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4 text-left">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Skeleton */}
          <div className="md:hidden space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-[#D1D5DB] bg-white p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
            ))}
          </div>
        </>
      ) : companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
          <p className="text-sm font-medium text-text">No oil companies found.</p>
          <p className="mt-1 text-xs text-text-muted">
            No active vehicle groups detected in the GPS feed yet. Click &quot;Add Oil Company&quot; to provision new credentials.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-[#D1D5DB] bg-white shadow-sm overflow-hidden">
            <table className="min-w-225 w-full text-left text-sm">
              <thead className="bg-muted text-xs text-text-muted border-b border-[#D1D5DB]">
                <tr>
                  {['Company (Group)', 'Fleet Vehicles', 'Depots', 'Contact Person', 'Login Email', 'Phone', 'Credential Status'].map(
                    (h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1D5DB]">
                {companies.map((c) => {
                  const fleetCount = vehicleCountByGroup.get(c.id.toUpperCase()) || 0
                  const depotCount = depotCountByGroup.get(c.id.toUpperCase()) || 0
                  const hasLogin = Boolean(c.contacts.email1)

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompanyDetails(c)}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                      title="Click to view full company details, credentials, fleet and depots"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-text font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-primary group-hover:scale-125 transition-transform" />
                          <span className="group-hover:text-primary transition-colors">{c.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-text">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-text">
                          {fleetCount} vehicles
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-text">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-text">
                          {depotCount} depots
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-text">
                        {c.contacts.person1 ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-text">
                        {c.contacts.email1 ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-text">
                        {c.contacts.phone1 ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-text">
                        {hasLogin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active Login
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            Pending Credential
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {companies.map((c) => {
              const fleetCount = vehicleCountByGroup.get(c.id.toUpperCase()) || 0
              const depotCount = depotCountByGroup.get(c.id.toUpperCase()) || 0
              const hasLogin = Boolean(c.contacts.email1)

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#D1D5DB] bg-white p-4 cursor-pointer active:bg-muted/50 transition-colors shadow-sm"
                  onClick={() => setSelectedCompanyDetails(c)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm text-text">{c.name}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {fleetCount} vehicles • {depotCount} depots
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasLogin ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                      <span className="text-xs text-primary font-medium">View details &rarr;</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Details Modal showing oil company credentials (including password), fleet list, and depots.
 */
function OilCompanyDetailsModal({
  company,
  vehicles,
  depots,
  canManageCredentials,
  onClose,
  onUpdated,
}: {
  company: DetailedOilCompany
  vehicles: GpsVehicle[]
  depots: Depot[]
  canManageCredentials: boolean
  onClose: () => void
  onUpdated: (updated: DetailedOilCompany) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  const handleCopyPassword = () => {
    if (company.plain_password) {
      navigator.clipboard.writeText(company.plain_password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setUpdateMsg('Password must be at least 6 characters.')
      return
    }

    if (!company.db_user_id) {
      setUpdateMsg('Cannot update password: No backend user account associated yet.')
      return
    }

    setUpdating(true)
    setUpdateMsg(null)

    try {
      const res = await api.put(`/oil-companies/${company.db_user_id}`, {
        password: newPassword,
      })

      const updatedCompany: DetailedOilCompany = {
        ...company,
        plain_password: newPassword,
      }
      onUpdated(updatedCompany)
      setIsEditingPassword(false)
      setNewPassword('')
      setUpdateMsg('Password updated successfully!')
      setTimeout(() => setUpdateMsg(null), 3000)
    } catch (err: any) {
      console.error('Error updating password:', err)
      setUpdateMsg(err?.response?.data?.message || 'Failed to update password.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
      {/* Company Header Card */}
      <div className="rounded-xl bg-slate-50 p-4 border border-[#D1D5DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-text flex items-center gap-2">
            <BuildingOffice2Icon className="size-5 text-primary" />
            <span>{company.name}</span>
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Group Identifier: <span className="font-semibold text-text">{company.id}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-[#D1D5DB]">
            <div className="text-xs text-text-muted font-medium">Fleet Size</div>
            <div className="text-base font-bold text-text">{vehicles.length}</div>
          </div>
          <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-[#D1D5DB]">
            <div className="text-xs text-text-muted font-medium">Depots</div>
            <div className="text-base font-bold text-text">{depots.length}</div>
          </div>
        </div>
      </div>

      {/* Login Credentials Section */}
      <div className="rounded-xl border border-[#D1D5DB] p-4 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-3">
          <div className="text-sm font-bold text-text flex items-center gap-2">
            <KeyIcon className="size-4 text-primary" />
            <span>System Login Credentials</span>
          </div>
          {company.contacts.email1 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active Account
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Credentials Not Set
            </span>
          )}
        </div>

        {updateMsg && (
          <div className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 border border-blue-200">
            {updateMsg}
          </div>
        )}

        {company.contacts.email1 ? (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-text-muted font-medium">Login Email</div>
              <div className="font-semibold text-text mt-0.5">{company.contacts.email1}</div>
            </div>

            <div>
              <div className="text-xs text-text-muted font-medium">Password</div>
              <div className="flex items-center gap-2 mt-0.5">
                {company.plain_password ? (
                  <span className="font-mono font-semibold text-text">
                    {showPassword ? company.plain_password : '••••••••••••'}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 italic">Encrypted in system</span>
                )}

                {company.plain_password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-text-muted hover:text-text cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                )}

                {company.plain_password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 text-text-muted hover:text-text cursor-pointer"
                    title="Copy password"
                  >
                    {copied ? (
                      <ClipboardDocumentCheckIcon className="size-4 text-emerald-600" />
                    ) : (
                      <ClipboardIcon className="size-4" />
                    )}
                  </button>
                )}

                {canManageCredentials && company.db_user_id && !isEditingPassword && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(true)}
                    className="ml-auto text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Reset Password
                  </button>
                )}
              </div>
            </div>

            {isEditingPassword && (
              <form onSubmit={handleUpdatePassword} className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 rounded-lg border border-[#D1D5DB] px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-strong transition disabled:opacity-50 cursor-pointer"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPassword(false)
                    setNewPassword('')
                  }}
                  className="rounded-lg border border-[#D1D5DB] px-3 py-1.5 text-xs font-semibold text-text hover:bg-muted/60 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-muted">
            This company is active in the GPS fleet but does not have portal login credentials configured yet.
          </div>
        )}
      </div>

      {/* Associated Fleet Vehicles */}
      <div className="rounded-xl border border-[#D1D5DB] p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-2">
          <div className="text-sm font-bold text-text flex items-center gap-2">
            <TruckIcon className="size-4 text-primary" />
            <span>Assigned Fleet Vehicles ({vehicles.length})</span>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <p className="text-xs text-text-muted py-2">No vehicles currently reporting under this group.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto divide-y divide-[#D1D5DB]">
            {vehicles.map((v) => (
              <div key={v.imei} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">{v.name}</span>
                  <span className="text-[10px] text-text-muted">IMEI: {v.imei}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      v.engine === 'on' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Engine {v.engine}
                  </span>
                  <span className="text-text-muted">{v.speed} km/h</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Associated Depots */}
      <div className="rounded-xl border border-[#D1D5DB] p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b border-[#D1D5DB] pb-2">
          <div className="text-sm font-bold text-text flex items-center gap-2">
            <BuildingOffice2Icon className="size-4 text-primary" />
            <span>Company Depots ({depots.length})</span>
          </div>
        </div>

        {depots.length === 0 ? (
          <p className="text-xs text-text-muted py-2">No depots registered under this oil company yet.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto divide-y divide-[#D1D5DB]">
            {depots.map((d) => (
              <div key={d.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-text">{d.name}</div>
                  <div className="text-[10px] text-text-muted">
                    {d.location.city}, {d.location.region}
                  </div>
                </div>
                <div className="text-text-muted">{d.contacts.phone1 || d.contacts.person1 || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-semibold text-text hover:bg-muted/60 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function NewOilCompanyForm({
  detectedGroups,
  onClose,
  onSuccess,
}: {
  detectedGroups: string[]
  onClose: () => void
  onSuccess: (company: DetailedOilCompany) => void
}) {
  const [mode, setMode] = useState<'select' | 'custom'>(detectedGroups.length > 0 ? 'select' : 'custom')
  const [selectedGroup, setSelectedGroup] = useState(detectedGroups[0] || '')
  const [customGroup, setCustomGroup] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone1, setPhone1] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeGroup = mode === 'select' ? selectedGroup : customGroup

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const finalGroup = activeGroup.trim()
    if (!finalGroup) {
      setErrorMsg('Please select or specify an Oil Company (Group) name.')
      return
    }

    setSubmitting(true)

    try {
      const res = await api.post('/oil-companies', {
        company_id: finalGroup,
        name: contactName.trim() || `${finalGroup} Admin`,
        email: email.trim(),
        password: password,
      })

      const newCompany: DetailedOilCompany = {
        id: finalGroup,
        name: finalGroup,
        plain_password: password,
        db_user_id: res.data?.user?.id,
        contacts: {
          person1: contactName || undefined,
          phone1: phone1 || undefined,
          email1: email || undefined,
        },
      }

      onSuccess(newCompany)
    } catch (err: any) {
      console.error('Failed to create oil company credentials:', err)
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        'Failed to save credentials. Please verify your input.'
      setErrorMsg(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-text mb-1">
          Oil Company (Group Field) *
        </label>
        {detectedGroups.length > 0 && (
          <div className="mb-2 flex items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="groupMode"
                checked={mode === 'select'}
                onChange={() => setMode('select')}
                className="text-primary focus:ring-primary/40"
              />
              <span>Select Detected GPS Group</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="groupMode"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="text-primary focus:ring-primary/40"
              />
              <span>Enter New Group Name</span>
            </label>
          </div>
        )}

        {mode === 'select' && detectedGroups.length > 0 ? (
          <select
            required
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          >
            {detectedGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            required
            placeholder="e.g. TOTAL, OLA, NOC"
            value={customGroup}
            onChange={(e) => setCustomGroup(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}
        <p className="mt-1 text-[11px] text-text-muted">
          This matches the &quot;group&quot; field on GPS vehicles so this company only accesses their own fleet and depots.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-text mb-1">Contact / Admin Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Operations Manager"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text mb-1">Contact Phone</label>
          <input
            type="tel"
            placeholder="e.g. +251 911 234 567"
            value={phone1}
            onChange={(e) => setPhone1(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-text mb-1">Login Email *</label>
          <input
            type="email"
            required
            placeholder="e.g. admin@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="mt-1 text-[11px] text-text-muted">
            The Oil Company administrator will use this email to log in to the PEA portal.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-text mb-1">Login Password *</label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#D1D5DB]">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-semibold text-text hover:bg-muted/60 disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-strong transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Creating Credentials...' : 'Create Oil Company Credentials'}
        </button>
      </div>
    </form>
  )
}
