import { useState } from 'react'
import { XMarkIcon, ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DriverImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (drivers: any[]) => Promise<{ count: number; errors?: string[] }>
}

export default function DriverImportModal({
  isOpen,
  onClose,
  onImport,
}: DriverImportModalProps) {
  const [csvContent, setCsvContent] = useState('')
  const [defaultPassword, setDefaultPassword] = useState('driver123')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null)

  if (!isOpen) return null

  const sampleCsv = `name,email,password,vehicle_plate_number,phone_number,transporter_name
Abebe Bikila,abebe@fleet.et,pass1234,3-45678,+251911223344,Total Transporters
Dawit Tadesse,dawit@fleet.et,pass5678,3-98765,+251922334455,null
Solomon Haile,solomon@fleet.et,,3-11223,+251933445566,NOC Logistics`

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const drivers: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim())
      if (parts.length === 0 || !parts.some(Boolean)) continue

      const row: Record<string, string> = {}
      header.forEach((key, idx) => {
        row[key] = parts[idx] || ''
      })

      const name = row['name'] || row['driver_name'] || row['fullname'] || ''
      const email = row['email'] || row['driver_email'] || ''
      const password = row['password'] || defaultPassword
      const vehicle_plate_number = row['vehicle_plate_number'] || row['plate'] || row['vehicle'] || ''
      const phone_number = row['phone_number'] || row['phone'] || ''
      const transporter_name = row['transporter_name'] || row['transporter'] || ''

      if (name && email) {
        drivers.push({
          name,
          email,
          password: password || defaultPassword,
          vehicle_plate_number: vehicle_plate_number || null,
          phone_number: phone_number || null,
          transporter_name: transporter_name.toLowerCase() === 'null' || !transporter_name ? null : transporter_name,
        })
      }
    }

    return drivers
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvContent(String(event.target?.result || ''))
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    setResult(null)
    const parsed = parseCsv(csvContent)
    if (parsed.length === 0) {
      setResult({
        success: false,
        message: 'No valid driver records found. Ensure CSV has header with at least name and email.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await onImport(parsed)
      setResult({
        success: true,
        message: `Successfully imported ${res.count} driver(s)!`,
        errors: res.errors,
      })
      setTimeout(() => {
        if (!res.errors || res.errors.length === 0) {
          onClose()
        }
      }, 1500)
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.response?.data?.message || err?.message || 'Import failed',
        errors: err?.response?.data?.errors,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const parsedPreview = parseCsv(csvContent)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all border border-[#E5E7EB] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpTrayIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Import Drivers Fleet</h2>
              <p className="text-xs text-text-muted">Import multiple drivers from transport deals via CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text transition-colors"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {result && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-medium border ${
              result.success
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-danger/10 text-danger border-danger/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? <CheckCircleIcon className="size-4" /> : <ExclamationTriangleIcon className="size-4" />}
              <span>{result.message}</span>
            </div>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-0.5 text-[11px]">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Upload CSV File or Paste Data
            </label>
            <button
              type="button"
              onClick={() => setCsvContent(sampleCsv)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <DocumentTextIcon className="size-3.5" />
              Load Sample CSV
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#D1D5DB] hover:border-primary rounded-xl p-4 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40 text-center">
              <ArrowUpTrayIcon className="size-6 text-text-muted mb-1" />
              <span className="text-xs font-semibold text-text">Select CSV File</span>
              <span className="text-[11px] text-text-muted">.csv or text files</span>
              <input type="file" accept=".csv,text/plain" onChange={handleFileUpload} className="hidden" />
            </label>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                Default Password (if empty in CSV)
              </label>
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="w-full rounded-xl border border-[#D1D5DB] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="driver123"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Applied to rows without an explicit password.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
              CSV Content
            </label>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="name,email,password,vehicle_plate_number,phone_number,transporter_name"
              className="w-full font-mono text-xs rounded-xl border border-[#D1D5DB] p-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {parsedPreview.length > 0 && (
            <div className="rounded-xl border border-[#E5E7EB] bg-muted/20 p-3">
              <div className="text-xs font-semibold text-text mb-2 flex items-center justify-between">
                <span>Preview: {parsedPreview.length} driver(s) ready to import</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {parsedPreview.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-muted/50 last:border-0">
                    <span className="font-medium text-text">{p.name} ({p.email})</span>
                    <span className="text-text-muted text-[11px]">
                      {p.vehicle_plate_number || 'No plate'} | {p.transporter_name || 'Private'}
                    </span>
                  </div>
                ))}
                {parsedPreview.length > 5 && (
                  <div className="text-[11px] text-text-muted text-center pt-1">
                    +{parsedPreview.length - 5} more drivers...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3F4F6]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-text hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || parsedPreview.length === 0}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="size-4" />
              {isSubmitting ? 'Importing...' : `Import ${parsedPreview.length > 0 ? `(${parsedPreview.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
