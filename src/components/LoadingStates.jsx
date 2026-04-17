import { cn } from '@/lib/utils'

/**
 * RouteLoadingState Component
 * Displays skeleton loaders while routes are being fetched
 * 
 * Props:
 *   - count: number of skeleton cards to show (default: 3)
 */
export function RouteLoadingState({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-slate-800/40 border border-white/5 rounded-xl p-5 animate-pulse"
        >
          {/* Header Skeleton */}
          <div className="mb-4 pb-4 border-b border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="h-3 bg-slate-700/50 rounded w-24 mb-2" />
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-slate-700/50 rounded w-20" />
                  <div className="h-4 bg-slate-700/50 rounded w-24" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-3 bg-slate-700/50 rounded w-16 mb-2" />
                <div className="h-6 bg-slate-700/50 rounded w-20" />
              </div>
            </div>
          </div>

          {/* Legs Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, legIdx) => (
              <div key={legIdx} className="rounded-lg p-3 bg-slate-900/30 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-3 bg-slate-700/50 rounded w-24 mb-2" />
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 bg-slate-700/50 rounded flex-1" />
                      <div className="h-4 bg-slate-700/50 rounded w-24" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 bg-slate-700/50 rounded w-16" />
                      <div className="h-3 bg-slate-700/50 rounded w-16" />
                      <div className="h-3 bg-slate-700/50 rounded w-12 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * PassengerLoadingState Component
 * Displays skeleton loaders while passenger selection UI is loading
 */
export function PassengerLoadingState() {
  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-5 h-5 bg-slate-700/50 rounded" />
        <div className="h-6 bg-slate-700/50 rounded w-32" />
        <div className="ml-auto h-4 bg-slate-700/50 rounded w-24" />
      </div>

      {/* Composition Summary */}
      <div className="bg-slate-900/40 border border-white/5 rounded-lg px-4 py-3 mb-6">
        <div className="h-3 bg-slate-700/50 rounded w-24 mb-2" />
        <div className="flex items-center gap-4">
          <div className="h-5 bg-slate-700/50 rounded w-32" />
          <div className="h-5 bg-slate-700/50 rounded w-32" />
        </div>
      </div>

      {/* Counter Skeletons */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx}>
            <div className="h-3 bg-slate-700/50 rounded w-40 mb-3" />
            <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 rounded-lg p-4">
              <div className="w-10 h-10 bg-slate-700/50 rounded" />
              <div className="flex-1 text-center">
                <div className="h-8 bg-slate-700/50 rounded w-16 mx-auto mb-1" />
                <div className="h-2 bg-slate-700/50 rounded w-24 mx-auto" />
              </div>
              <div className="w-10 h-10 bg-slate-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner Skeleton */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
          <div className="h-4 bg-blue-500/30 rounded w-full mb-2" />
          <div className="h-4 bg-blue-500/30 rounded w-5/6" />
        </div>
      </div>
    </div>
  )
}

/**
 * TicketLoadingState Component
 * Displays skeleton loader while ticket is being generated
 */
export function TicketLoadingState() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8 text-center">
        <div className="h-8 bg-slate-700/50 rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-slate-700/50 rounded w-40 mx-auto" />
      </div>

      {/* Ticket Card Skeleton */}
      <div className="bg-slate-800/60 border border-white/10 rounded-xl p-6 mb-6">
        {/* Ticket Number */}
        <div className="mb-6 pb-6 border-b border-white/10">
          <div className="h-3 bg-slate-700/50 rounded w-24 mb-2" />
          <div className="h-5 bg-slate-700/50 rounded w-full" />
        </div>

        {/* Journey Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx}>
              <div className="h-3 bg-slate-700/50 rounded w-16 mb-2" />
              <div className="h-5 bg-slate-700/50 rounded" />
            </div>
          ))}
        </div>

        {/* Passenger & Fare */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx}>
              <div className="h-3 bg-slate-700/50 rounded w-20 mb-2" />
              <div className="h-6 bg-slate-700/50 rounded w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Skeleton */}
      <div className="bg-slate-100 rounded-2xl p-8 mb-6 flex items-center justify-center" style={{ height: '280px' }}>
        <div className="w-52 h-52 bg-slate-300 rounded" />
      </div>

      {/* Action Buttons Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="h-12 bg-slate-700/50 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * GenericLoadingState Component
 * Generic skeleton loader for any content
 * 
 * Props:
 *   - lines: number of lines to show (default: 3)
 *   - fullWidth: boolean (default: true)
 */
export function GenericLoadingState({ lines = 3, fullWidth = true }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, idx) => {
        const isLastLine = idx === lines - 1
        const width = isLastLine ? 'w-2/3' : 'w-full'

        return (
          <div
            key={idx}
            className={cn(
              'h-4 bg-slate-700/50 rounded',
              !fullWidth && width
            )}
          />
        )
      })}
    </div>
  )
}

/**
 * SkeletonCard Component
 * Reusable skeleton card for various contexts
 * 
 * Props:
 *   - height: CSS height string (default: 'auto')
 *   - padding: Tailwind padding class (default: 'p-4')
 *   - children: Content to render (optional)
 */
export function SkeletonCard({ height = 'auto', padding = 'p-4', children = null }) {
  if (children) {
    return (
      <div className={cn(
        'bg-slate-800/40 border border-white/5 rounded-lg',
        padding,
        'animate-pulse'
      )}>
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-slate-800/40 border border-white/5 rounded-lg',
        padding,
        'animate-pulse'
      )}
      style={{ height }}
    />
  )
}