import { ArrowRight, Clock, MapPin, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MultiLegRoute Component
 * Displays a single route option with multiple legs (transfers)
 * 
 * Props:
 *   - legs: Array of { id, mode, from_station, to_station, duration, fare, distance, transfer_wait, polyline }
 *   - isSelected: boolean
 *   - onSelect: () => void
 */
function getModeIcon(mode) {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return { icon: '⚡', color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
  if (m.includes('western') || m.includes('central')) return { icon: '🚂', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (m.includes('bus')) return { icon: '🚌', color: 'text-amber-400', bg: 'bg-amber-500/10' }
  if (m.includes('local')) return { icon: '🚊', color: 'text-blue-400', bg: 'bg-blue-500/10' }
  return { icon: '🚉', color: 'text-slate-400', bg: 'bg-slate-500/10' }
}

function getModeLabel(mode) {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return 'Metro'
  if (m.includes('western')) return 'Western Line'
  if (m.includes('central')) return 'Central Line'
  if (m.includes('bus')) return 'BEST Bus'
  return mode
}

export default function MultiLegRoute({ legs = [], isSelected = false, onSelect = () => {} }) {
  if (!legs || legs.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 text-center">
        <p className="text-slate-500 text-sm">No legs available for this route</p>
      </div>
    )
  }

  // Calculate totals
  const totalDuration = legs.reduce((sum, leg) => sum + (leg.duration || 0), 0)
  const totalFare = legs.reduce((sum, leg) => sum + (leg.fare || 0), 0)
  const totalDistance = legs.reduce((sum, leg) => sum + (leg.distance || 0), 0)
  const transferCount = legs.length - 1

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left transition-all duration-200 rounded-xl border p-5',
        isSelected
          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
          : 'bg-slate-800/40 border-white/5 hover:border-white/20 hover:bg-slate-800/60'
      )}
    >
      {/* Route Summary Header */}
      <div className="mb-4 pb-4 border-b border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mb-1">
              {transferCount > 0 ? `${transferCount} Transfer${transferCount > 1 ? 's' : ''}` : 'Direct'}
            </p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-white font-semibold">{totalDuration} min</span>
              <span className="text-slate-500 text-sm">• {totalDistance.toFixed(1)} km</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mb-1">
              Fare
            </p>
            <span className="text-2xl font-bold text-cyan-400">₹{totalFare}</span>
          </div>
        </div>
      </div>

      {/* Legs Detail */}
      <div className="space-y-3">
        {legs.map((leg, idx) => {
          const modeInfo = getModeIcon(leg.mode)
          const isLastLeg = idx === legs.length - 1
          const hasTransfer = !isLastLeg

          return (
            <div key={leg.id || idx}>
              {/* Leg Card */}
              <div className={cn(
                'rounded-lg p-3 border transition-colors',
                isSelected
                  ? 'bg-cyan-500/5 border-cyan-500/30'
                  : 'bg-slate-900/30 border-white/5'
              )}>
                <div className="flex items-start gap-3">
                  {/* Mode Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold',
                    modeInfo.bg,
                    modeInfo.color
                  )}>
                    {modeInfo.icon}
                  </div>

                  {/* Leg Details */}
                  <div className="flex-1 min-w-0">
                    {/* Mode Label */}
                    <p className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mb-1">
                      {getModeLabel(leg.mode)}
                    </p>

                    {/* From → To */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {leg.from_station}
                        </p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {leg.to_station}
                        </p>
                      </div>
                    </div>

                    {/* Duration & Fare */}
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {leg.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {leg.distance?.toFixed(1) || '0'} km
                      </span>
                      {leg.fare && (
                        <span className="text-cyan-400 font-semibold">₹{leg.fare}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Wait (if not last leg) */}
              {hasTransfer && leg.transfer_wait > 0 && (
                <div className="flex items-center justify-center py-2 text-[10px] text-slate-600">
                  <div className="flex-1 border-t border-slate-700" />
                  <span className="px-2 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Transfer {leg.transfer_wait} min
                  </span>
                  <div className="flex-1 border-t border-slate-700" />
                </div>
              )}

              {/* Connect to next leg */}
              {!isLastLeg && (
                <div className="flex justify-center py-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-slate-600 to-transparent rounded-full" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-cyan-500/20 flex items-center justify-center">
          <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase flex items-center gap-1">
            ✓ Selected
          </span>
        </div>
      )}

      {/* Click to Select Hint */}
      {!isSelected && (
        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-600 hover:text-slate-500 transition-colors">
            Click to select this route
          </span>
        </div>
      )}
    </button>
  )
}