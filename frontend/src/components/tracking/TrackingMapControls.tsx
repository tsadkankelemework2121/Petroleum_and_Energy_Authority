import type { MapStyleKey } from '../map/MapView'

export default function TrackingMapControls({
  isClustered,
  setIsClustered,
  onFitBounds,
  onZoomIn,
  mapStyle = 'voyager',
  setMapStyle,
}: {
  isClustered: boolean
  setIsClustered: (c: boolean) => void
  onFitBounds: () => void
  onZoomIn: () => void
  mapStyle?: MapStyleKey
  setMapStyle?: (s: MapStyleKey) => void
}) {
  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none z-10 px-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl md:rounded-full border border-slate-200 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        {/* Map Layer Switcher */}
        {setMapStyle && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
            <button
              type="button"
              onClick={() => setMapStyle('voyager')}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                mapStyle === 'voyager'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Street Map
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                mapStyle === 'satellite'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Satellite
            </button>
          </div>
        )}

        {/* Cluster Toggle Button */}
        <button
          type="button"
          onClick={() => setIsClustered(!isClustered)}
          className={`rounded-full px-3 py-1 text-[10px] font-bold border transition ${
            isClustered
              ? 'bg-[#1c8547] text-white border-[#1c8547] shadow-sm hover:bg-[#166d3a]'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          CLUSTER {isClustered ? 'ON' : 'OFF'}
        </button>

        {/* Zoom & Fit-Bounds Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onFitBounds}
            className="grid size-8 place-items-center rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm"
            aria-label="Zoom out to see all"
            title="Fit all vehicles in view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="grid size-8 place-items-center rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition font-bold text-sm shadow-sm"
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
