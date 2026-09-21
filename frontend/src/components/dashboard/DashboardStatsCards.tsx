import { Card, CardBody } from '../ui/Card'
import { SkeletonCard } from '../ui/Skeleton'

export default function DashboardStatsCards({
  kpiCards,
  isLoading,
}: {
  kpiCards: ReadonlyArray<{
    label: string
    value: string
    hint: string
    icon: React.ComponentType<{ className?: string }>
  }>
  isLoading: boolean
}) {
  return (
    <div className={`grid gap-3 grid-cols-2 ${kpiCards.length > 5 ? 'sm:grid-cols-3 lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
      {isLoading ? (
        <>
          {Array.from({ length: kpiCards.length || 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </>
      ) : (
        kpiCards.map((k, i) => {
          const Icon = k.icon
          return (
            <div
              key={k.label}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-text truncate">{k.label}</div>
                      <div className="mt-0.5 text-[10px] sm:text-xs text-text-muted truncate">{k.hint}</div>
                    </div>
                    <div className="grid size-8 sm:size-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="size-4 sm:size-5" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-xl sm:text-3xl font-bold tracking-tight text-text">{k.value}</div>
                    <div className="rounded-md bg-muted px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium text-text-muted">
                      Live
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )
        })
      )}
    </div>
  )
}
