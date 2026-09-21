import type { GpsVehicle } from './types'
// import api from '../api/axios'

const GPS_API_URL =
  'https://mellatech.et/et/api/api.php?api=user&ver=1.0&key=4DC7C4EDCF88C5B3F8B03A72631DBF8&cmd=USER_GET_OBJECTS'

export async function fetchGpsVehicles(): Promise<GpsVehicle[]> {
  // Start Mellatech and ZTrack fetches in parallel
  const mellaPromise = (async (): Promise<GpsVehicle[]> => {
    let mellaVehicles: GpsVehicle[] = []
    let cachedMella: GpsVehicle[] = []

    try {
      const stored = localStorage.getItem('pea_cached_mella_vehicles')
      if (stored) {
        cachedMella = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error parsing cached Mella vehicles:', e)
    }

    try {
      const res = await fetch(GPS_API_URL)
      if (res.ok) {
        const data = (await res.json()) as any[]
        if (Array.isArray(data) && data.length > 0) {
          mellaVehicles = data.map((v) => ({
            ...v,
            source: 'mella' as const,
          }))
          localStorage.setItem('pea_cached_mella_vehicles', JSON.stringify(mellaVehicles))
        }
      }
    } catch (err) {
      console.error('Error fetching Mella GPS vehicles:', err)
    }

    if (mellaVehicles.length === 0 && cachedMella.length > 0) {
      mellaVehicles = cachedMella
    }
    return mellaVehicles
  })()

  // =====================================================================
  // ZTRACK TEMPORARILY DISABLED — uncomment when ZTrack server is fixed
  // =====================================================================
  // const ztrackPromise = (async (): Promise<GpsVehicle[]> => {
  //   let ztrackVehicles: GpsVehicle[] = []
  //   let cachedZtrack: GpsVehicle[] = []
  //
  //   // 1. Load cached ZTrack data from localStorage
  //   try {
  //     const stored = localStorage.getItem('pea_cached_ztrack_vehicles')
  //     if (stored) {
  //       cachedZtrack = JSON.parse(stored)
  //     }
  //   } catch (e) {
  //     console.error('Error parsing cached ZTrack vehicles:', e)
  //   }
  //
  //   // 2. Try to fetch fresh data from backend
  //   console.log('[ZTRACK DIAGNOSTIC] Starting ZTrack status fetch from backend...')
  //   const startTime = performance.now()
  //   try {
  //     const statusRes = await api.get('/ztrack/vehicles/status')
  //     const totalDuration = (performance.now() - startTime) / 1000
  //     const statusList = Array.isArray(statusRes.data?.data) ? statusRes.data.data : []
  //
  //     console.warn('[ZTRACK DIAGNOSTIC] Fetch finished successfully!', {
  //       frontendTotalTime: totalDuration.toFixed(2) + 's',
  //       backendZTrackTime: statusRes.data?.debug_duration_seconds ? statusRes.data.debug_duration_seconds + 's' : 'unknown',
  //       backendMessage: statusRes.data?.msg,
  //       count: statusList.length,
  //       source: statusRes.data?.debug_source || 'ZTrack Server'
  //     })
  //
  //     if (statusList.length > 0) {
  //       ztrackVehicles = statusList.map((statusInfo: any) => {
  //         return {
  //           imei: statusInfo.imei || `ztrack_${statusInfo.unitId}`,
  //           name: statusInfo.plateNo || `ZTrack ${statusInfo.unitId}`,
  //           group: statusInfo.group || 'OLA',
  //           odometer: String(statusInfo.odometer || '0'),
  //           engine: statusInfo.engine === 'on' ? 'on' : 'off',
  //           status: statusInfo.status || 'Offline',
  //           dt_server: statusInfo.dt_server || new Date().toISOString(),
  //           dt_tracker: statusInfo.dt_tracker || new Date().toISOString(),
  //           lat: String(statusInfo.lat || ''),
  //           lng: String(statusInfo.lng || ''),
  //           altitude: String(statusInfo.altitude || '0'),
  //           angle: String(statusInfo.angle || '0'),
  //           speed: String(statusInfo.speed || '0'),
  //           fuel_1: String(statusInfo.fuel_1 || '0 L'),
  //           fuel_2: String(statusInfo.fuel_2 || '0 L'),
  //           fuel_can_level_percent: statusInfo.fuel_can_level_percent !== undefined ? statusInfo.fuel_can_level_percent : null,
  //           fuel_can_level_value: statusInfo.fuel_can_level_value !== undefined ? statusInfo.fuel_can_level_value : null,
  //           custom_fields: statusInfo.custom_fields || 'ZTrack Vehicle',
  //           source: 'ztrack' as const,
  //         }
  //       })
  //       // Save fresh data to localStorage
  //       localStorage.setItem('pea_cached_ztrack_vehicles', JSON.stringify(ztrackVehicles))
  //     }
  //   } catch (err: any) {
  //     const totalDuration = (performance.now() - startTime) / 1000
  //     console.error('[ZTRACK DIAGNOSTIC] Failed to fetch ZTrack status!', {
  //       frontendTimeElapsed: totalDuration.toFixed(2) + 's',
  //       httpStatus: err?.response?.status,
  //       statusText: err?.response?.statusText,
  //       errorMessage: err?.message,
  //       errorData: err?.response?.data,
  //       isBackendDown: !err?.response,
  //     })
  //     console.error('Error fetching ZTrack GPS vehicles:', err)
  //   }
  //
  //   // 3. If fresh data failed or was empty, fall back to cached
  //   if (ztrackVehicles.length === 0 && cachedZtrack.length > 0) {
  //     ztrackVehicles = cachedZtrack
  //   }
  //   return ztrackVehicles
  // })()

  // Wait for Mella only (ZTrack disabled)
  const mellaVehicles = await mellaPromise

  return mellaVehicles
}
