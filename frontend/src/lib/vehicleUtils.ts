import type { GpsVehicle } from '../data/types'

/**
 * Extracts the transporter name from vehicle custom_fields.
 * Returns null if missing or not configured.
 */
export function extractTransporterName(customFields: unknown): string | null {
  if (customFields === null || customFields === undefined) {
    return null
  }

  // If it's a string, check for JSON or plain string
  if (typeof customFields === 'string') {
    const trimmed = customFields.trim()
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return null
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        return extractTransporterName(parsed)
      } catch {
        return trimmed
      }
    }
    return trimmed
  }

  // If it's an array of fields
  if (Array.isArray(customFields)) {
    if (customFields.length === 0) return null

    for (const item of customFields) {
      if (!item) continue
      if (typeof item === 'string') {
        const t = item.trim()
        if (t && t.toLowerCase() !== 'null') return t
      }
      if (typeof item === 'object') {
        const obj = item as Record<string, any>
        const label = String(obj.label || obj.name || obj.title || obj.key || '').toLowerCase()
        if (
          label.includes('trans') ||
          label.includes('carrier') ||
          label.includes('owner') ||
          label.includes('company')
        ) {
          const val = String(obj.value || obj.val || '').trim()
          if (val && val.toLowerCase() !== 'null') return val
        }
      }
    }

    // Fallback to first item value if nothing explicitly matched
    const first = customFields[0]
    if (typeof first === 'string' && first.trim()) return first.trim()
    if (first && typeof first === 'object') {
      const val = String((first as any).value || (first as any).name || '').trim()
      if (val && val.toLowerCase() !== 'null') return val
    }
  }

  // If it's a key-value object
  if (typeof customFields === 'object' && customFields !== null) {
    const obj = customFields as Record<string, any>
    for (const [key, val] of Object.entries(obj)) {
      const k = key.toLowerCase()
      if (k.includes('trans') || k.includes('carrier') || k.includes('owner')) {
        if (val && typeof val === 'string' && val.trim()) return val.trim()
      }
    }

    // Fallback to first valid string value
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'string' && val.trim() && val.toLowerCase() !== 'null') {
        return val.trim()
      }
    }
  }

  return null
}

/**
 * Extracts valid oil company group name from vehicle.
 * Returns null if missing or null.
 */
export function extractOilCompanyGroup(vehicle: GpsVehicle | { group?: string | null }): string | null {
  const g = vehicle.group?.trim()
  if (!g || g.toLowerCase() === 'null' || g.toLowerCase() === 'undefined') {
    return null
  }
  return g
}
