import type { DispatchStatus, DispatchTask } from '../../data/types'
import { cn } from '../../lib/cn'
import { getStatusDetails } from '../../lib/statusDetails'

const tones: Record<DispatchStatus, string> = {
  'On transit': 'bg-slate-500/15 text-slate-700',
  Delivered: 'bg-[#1c8547]/15 text-[#1c8547]',
  'Exceeded ETA': 'bg-[#f59e0b]/15 text-[#f59e0b]',
  'GPS Offline >24h': 'bg-[#f59e0b]/15 text-[#f59e0b]',
  'Stopped >5h': 'bg-[#f59e0b]/15 text-[#f59e0b]',
}

export default function StatusPill({
  status,
  task,
  className,
  showDetails = true,
}: {
  status: DispatchStatus
  task?: DispatchTask
  className?: string
  showDetails?: boolean
}) {
  const details = task && showDetails ? getStatusDetails(task) : null
  const isConfirmed = status === 'Delivered' || Boolean((task as any)?.confirmation)

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
          isConfirmed
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : tones[status] || 'bg-slate-500/15 text-slate-700',
        )}
      >
        {isConfirmed ? (
          <>
            <svg className="size-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span>Confirmed</span>
          </>
        ) : (
          status
        )}
      </span>
      {isConfirmed ? (
        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
          ✓ Delivery Verified
        </span>
      ) : details ? (
        <span className="text-[10px] font-medium text-text-muted">{details}</span>
      ) : null}
    </div>
  )
}

