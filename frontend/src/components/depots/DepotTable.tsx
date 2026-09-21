import { useState } from 'react'
import { EnvelopeIcon, MapPinIcon, PhoneIcon, PencilIcon } from '@heroicons/react/24/outline'
import type { Depot } from '../../data/types'

export default function DepotTable({
  items,
  canManage,
  openGoogleMaps,
  handleEdit,
}: {
  items: Depot[]
  canManage: boolean
  openGoogleMaps: (depot: Depot) => void
  handleEdit: (depot: Depot) => void
}) {
  const [expandedMobileRow, setExpandedMobileRow] = useState<string | null>(null)

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border border-[#D1D5DB] bg-white">
        <table className="min-w-[800px] w-full divide-y divide-[#D1D5DB]">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Depot
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Contact Person
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D1D5DB]">
            {items.map((depot, index) => (
              <tr
                key={depot.id}
                className="hover:bg-muted/40 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-text">{depot.name}</div>
                    {depot.oilCompanyId && (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {depot.oilCompanyId}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-1">ID: {depot.id}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-text">{depot.location.address}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {depot.location.city}, {depot.location.region}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-text">{depot.contacts.person1 || '—'}</div>
                  {depot.contacts.person2 && (
                    <div className="text-xs text-text-muted mt-1">{depot.contacts.person2}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {depot.contacts.phone1 ? (
                    <>
                      <div className="flex items-center gap-1 text-sm text-text">
                        <PhoneIcon className="size-3.5 text-text-muted" />
                        {depot.contacts.phone1}
                      </div>
                      {depot.contacts.phone2 && (
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                          <PhoneIcon className="size-3" />
                          {depot.contacts.phone2}
                        </div>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-4">
                  {depot.contacts.email1 ? (
                    <>
                      <div className="flex items-center gap-1 text-sm text-text">
                        <EnvelopeIcon className="size-3.5 text-text-muted" />
                        <span className="truncate max-w-[150px]">{depot.contacts.email1}</span>
                      </div>
                      {(depot as any).password && (
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-1 font-mono">
                          Pass: {(depot as any).password}
                        </div>
                      )}
                      {depot.contacts.email2 && (
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                          <EnvelopeIcon className="size-3" />
                          <span className="truncate max-w-[130px]">{depot.contacts.email2}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openGoogleMaps(depot)}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                      title="Open in Google Maps"
                    >
                      <MapPinIcon className="size-4" />
                      <span>Map</span>
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleEdit(depot)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                        title="Edit Depot"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {items.map((depot, index) => (
          <div
            key={depot.id}
            className="rounded-xl border border-[#D1D5DB] bg-white overflow-hidden animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              onClick={() => setExpandedMobileRow(expandedMobileRow === depot.id ? null : depot.id)}
              className="p-4 cursor-pointer active:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-sm text-text truncate">{depot.name}</div>
                    {depot.oilCompanyId && (
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {depot.oilCompanyId}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {depot.location.city}, {depot.location.region}
                  </div>
                </div>
                <svg
                  className={`size-5 text-text-muted shrink-0 transition-transform duration-200 ${
                    expandedMobileRow === depot.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {expandedMobileRow === depot.id && (
              <div className="px-4 pb-4 border-t border-[#D1D5DB] pt-3 space-y-3 animate-fade-in-up">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Address</div>
                    <div className="font-medium text-text mt-0.5">{depot.location.address}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">ID</div>
                    <div className="font-medium text-text mt-0.5">{depot.id}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Contact</div>
                    <div className="font-medium text-text mt-0.5">{depot.contacts.person1 || '—'}</div>
                    {depot.contacts.person2 && <div className="text-xs text-text-muted">{depot.contacts.person2}</div>}
                  </div>
                  <div>
                    <div className="text-[11px] text-text-muted font-medium">Phone</div>
                    <div className="font-medium text-text mt-0.5">{depot.contacts.phone1 || '—'}</div>
                    {depot.contacts.phone2 && <div className="text-xs text-text-muted">{depot.contacts.phone2}</div>}
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] text-text-muted font-medium">Email</div>
                    <div className="font-medium text-text mt-0.5 break-all">{depot.contacts.email1 || '—'}</div>
                    {(depot as any).password && (
                      <div className="text-xs text-text-muted font-mono">Pass: {(depot as any).password}</div>
                    )}
                    {depot.contacts.email2 && <div className="text-xs text-text-muted break-all">{depot.contacts.email2}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[#D1D5DB]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openGoogleMaps(depot)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                  >
                    <MapPinIcon className="size-4" />
                    <span>Map</span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(depot)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                    >
                      <PencilIcon className="size-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
