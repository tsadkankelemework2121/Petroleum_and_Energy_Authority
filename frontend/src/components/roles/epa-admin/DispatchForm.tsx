import { useEffect, useMemo, useState, useRef } from 'react'
import api from '../../../api/axios'
import type { Depot, DispatchTask, FuelType, OilCompany, GpsVehicle } from '../../../data/types'
import { useAuth } from '../../../context/AuthContext'
import { extractTransporterName } from '../../../lib/vehicleUtils'

export default function DispatchForm({
  oilCompanies,
  vehicles,
  depots,
  dispatches,
  editingTask,
  onClose,
  onSubmit,
}: {
  oilCompanies: OilCompany[]
  vehicles: GpsVehicle[]
  depots: Depot[]
  dispatches: any[]
  editingTask?: any
  onClose: () => void
  onSubmit: (task: DispatchTask) => void
}) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    oilCompanyId: editingTask?.oilCompanyId || '',
    transporterId: editingTask?.transporterId || '',
    vehicleId: editingTask?.vehicleId || '',
    dispatchDateTime: (editingTask?.dispatchDateTime || '').split('.')[0],
    dispatchLocation: editingTask?.dispatchLocation || 'Djibouti',
    destinationDepotId: editingTask?.destinationDepotId || '',
    etaDateTime: (editingTask?.etaDateTime || '').split('.')[0],
    fuelType: (editingTask?.fuelType || 'Benzine') as FuelType,
    dispatchedLiters: editingTask?.dispatchedLiters || '',
    status: editingTask?.status || 'On transit'
  })

  // Set default company if user is Oil Company
  useEffect(() => {
    if (!editingTask && (user?.role?.toUpperCase() === 'OIL_COMPANY' || user?.role?.toUpperCase() === 'OIL_COMPANY_ADMIN')) {
      setFormData(prev => ({ ...prev, oilCompanyId: user.companyId || '' }));
    }
  }, [user, editingTask]);

  const [vehicleSearch, setVehicleSearch] = useState('')
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVehicleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initialization: if editing, set the search text to the plate number
  useEffect(() => {
    if (editingTask?.vehicleId) {
       const v = vehicles.find(veh => veh.imei === editingTask.vehicleId);
       if (v) setVehicleSearch(v.name);
    }
  }, [editingTask, vehicles]);

  // Filter valid vehicles for this company
  const availableVehicles = useMemo(() => {
    if (!formData.oilCompanyId) return []
    
    // Identify vehicles already on an active dispatch (EXCLUDING current one if editing)
    const occupiedVehicleIds = new Set(
      dispatches
        .filter(d => d.status !== 'Delivered' && d.peaDispatchNo !== editingTask?.peaDispatchNo)
        .map(d => d.vehicleId)
    )

    return vehicles.filter(v => 
      !occupiedVehicleIds.has(v.imei)
    )
  }, [formData.oilCompanyId, vehicles, dispatches, editingTask])

  // Apply search filter locally
  const searchedVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase()
    return availableVehicles.filter(v => 
      v.name.toLowerCase().includes(q) || 
      v.imei.includes(q)
    )
  }, [availableVehicles, vehicleSearch])

  // Update available depots dynamically 
  const availableDepots = useMemo(() => {
    if (!formData.oilCompanyId) return []
    const targetId = formData.oilCompanyId.trim().toLowerCase()
    return depots.filter(d => {
      const depotCompanyId = d.oilCompanyId || (d as any).oil_company_id
      return depotCompanyId?.trim().toLowerCase() === targetId
    })
  }, [formData.oilCompanyId, depots])

  // Auto-fill transporter when vehicle changes using custom_fields (not group)
  const handleVehicleSelect = (v: GpsVehicle) => {
    const transporterName = extractTransporterName(v.custom_fields) || ''
    setFormData(prev => ({
      ...prev,
      vehicleId: v.name,
      transporterId: transporterName
    }))
    setVehicleSearch(v.name);
    setShowVehicleDropdown(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      oil_company_id: formData.oilCompanyId,
      transporter_id: formData.transporterId || null,
      vehicle_id: formData.vehicleId,
      dispatch_datetime: formData.dispatchDateTime,
      dispatch_location: formData.dispatchLocation,
      destination_depot_id: formData.destinationDepotId,
      eta_datetime: formData.etaDateTime,
      fuel_type: formData.fuelType,
      dispatched_liters: Number(formData.dispatchedLiters),
      status: formData.status
    }

    const request = editingTask 
        ? api.post(`/dispatches/${editingTask.peaDispatchNo}`, { ...payload, _method: 'PUT' })
        : api.post('/dispatches', payload);

    request.then((res) => {
         onSubmit({
          peaDispatchNo: res.data.pea_dispatch_no,
          oilCompanyId: formData.oilCompanyId,
          transporterId: formData.transporterId,
          vehicleId: formData.vehicleId,
          dispatchDateTime: formData.dispatchDateTime,
          dispatchLocation: formData.dispatchLocation,
          destinationDepotId: formData.destinationDepotId,
          etaDateTime: formData.etaDateTime,
          fuelType: formData.fuelType,
          dispatchedLiters: Number(formData.dispatchedLiters),
          status: (formData.status || 'On transit') as any,
        })
    }).catch(err => {
         console.error('Failed to save dispatch:', err)
         alert('Error saving dispatch. Please check your data.')
    }).finally(() => setSaving(false))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">

        <div>
           <label className="block text-sm font-semibold mb-1 text-slate-700">Oil Company *</label>
          <select
            required
            disabled={user?.role?.toUpperCase() === 'OIL_COMPANY' || user?.role?.toUpperCase() === 'OIL_COMPANY_ADMIN'}
            value={formData.oilCompanyId}
            onChange={(e) => {
                setFormData({ ...formData, oilCompanyId: e.target.value, destinationDepotId: '', transporterId: '', vehicleId: '' });
                setVehicleSearch('');
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select Company...</option>
            {oilCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
           <label className="block text-sm font-semibold mb-1 text-slate-700">Fuel Type</label>
          <select
            required
            value={formData.fuelType}
            onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as FuelType })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          >
            <option value="Benzine">Benzine</option>
            <option value="Diesel">Diesel</option>
            <option value="Jet Fuel">Jet Fuel</option>
          </select>
        </div>

        <div className="sm:col-span-2 relative">
          <label className="block text-sm font-semibold mb-1 text-slate-700">Vehicle (Plate Registration) *</label>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder={formData.oilCompanyId ? "Search plate number..." : "Select company first..."}
              disabled={!formData.oilCompanyId}
              value={vehicleSearch}
              onFocus={() => setShowVehicleDropdown(true)}
              onChange={(e) => {
                  setVehicleSearch(e.target.value);
                  setShowVehicleDropdown(true);
                  if (formData.vehicleId) setFormData({...formData, vehicleId: '', transporterId: ''});
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
            {showVehicleDropdown && formData.oilCompanyId && (
                <div className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                    {searchedVehicles.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 italic">No available vehicles match your search.</div>
                    ) : (
                        searchedVehicles.map((v) => (
                            <div 
                                key={v.imei}
                                onClick={() => handleVehicleSelect(v)}
                                className="cursor-pointer px-4 py-2 text-sm hover:bg-slate-100 transition-colors flex justify-between items-center"
                            >
                                <span className="font-semibold text-slate-700">{v.name}</span>
                                <span className="text-[10px] text-slate-400">{v.imei}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
          </div>
        </div>

        <div>
           <label className="block text-sm font-semibold mb-1 text-slate-700">Destination Depot *</label>
          <select
            required
            disabled={!formData.oilCompanyId}
            value={formData.destinationDepotId}
            onChange={(e) => setFormData({ ...formData, destinationDepotId: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select Depot...</option>
            {availableDepots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.location.city})
              </option>
             ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">Dispatched Liters *</label>
          <input
            type="number"
            required
            min="1"
            placeholder="e.g. 45000"
            value={formData.dispatchedLiters}
            onChange={(e) => setFormData({ ...formData, dispatchedLiters: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">Dispatch Date & Time *</label>
          <input
            type="datetime-local"
            required
            value={formData.dispatchDateTime}
            onChange={(e) => setFormData({ ...formData, dispatchDateTime: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">Dispatch Location *</label>
          <input
            type="text"
            required
            placeholder="e.g. Sululta"
            value={formData.dispatchLocation}
            onChange={(e) => setFormData({ ...formData, dispatchLocation: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-700">ETA Date & Time *</label>
          <input
            type="datetime-local"
            required
            value={formData.etaDateTime}
            onChange={(e) => setFormData({ ...formData, etaDateTime: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {editingTask && (
             <div>
               <label className="block text-sm font-semibold mb-1 text-slate-700">Status</label>
               <select
                 value={formData.status}
                 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                 className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
               >
                 <option value="On transit">On transit</option>
                 <option value="Delivered">Delivered</option>
                 <option value="Exceeded ETA">Exceeded ETA</option>
                 <option value="Stopped >5h">Stopped &gt;5h</option>
                 <option value="GPS Offline >24h">GPS Offline &gt;24h</option>
               </select>
             </div>
        )}

      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving || !formData.vehicleId}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-strong transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
              <>
                <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
          ) : editingTask ? 'Update Dispatch' : 'Create Dispatch'}
        </button>
      </div>
    </form>
  )
}
