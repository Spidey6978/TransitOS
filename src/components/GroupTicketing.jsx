import { useState, useEffect } from 'react'
import { Plus, Minus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * GroupTicketing Component
 * Allows users to select passenger composition for group bookings
 * 
 * Props:
 *   - onUpdate: (passengerData) => void - Called when passenger count changes
 *   - initialData: passengerData object (optional)
 * 
 * Output: { adults, children, childrenWithSeats, totalPassengers }
 */
export default function GroupTicketing({ onUpdate, initialData = null }) {
  // State for passenger counts
  const [adults, setAdults] = useState(initialData?.adults || 1)
  const [childrenWithSeats, setChildrenWithSeats] = useState(initialData?.childrenWithSeats || 0)
  const [children, setChildren] = useState(initialData?.children || 0)

  // Constraints
  const MIN_ADULTS = 1
  const MAX_ADULTS = 10
  const MAX_CHILDREN_WITH_SEATS = 10
  const MAX_CHILDREN = 10

  /**
   * Calculate total passengers and trigger callback
   */
  useEffect(() => {
    const totalPassengers = adults + childrenWithSeats + children
    const passengerData = {
      adults,
      childrenWithSeats,
      children,
      totalPassengers
    }
    onUpdate(passengerData)
  }, [adults, childrenWithSeats, children, onUpdate])

  /**
   * Handle adult count changes
   */
  function handleAdultChange(delta) {
    const newAdults = adults + delta
    if (newAdults >= MIN_ADULTS && newAdults <= MAX_ADULTS) {
      setAdults(newAdults)
    }
  }

  /**
   * Handle children with seats count changes
   */
  function handleChildrenWithSeatsChange(delta) {
    const newCount = childrenWithSeats + delta
    if (newCount >= 0 && newCount <= MAX_CHILDREN_WITH_SEATS) {
      setChildrenWithSeats(newCount)
    }
  }

  /**
   * Handle children without seats count changes
   */
  function handleChildrenChange(delta) {
    const newCount = children + delta
    if (newCount >= 0 && newCount <= MAX_CHILDREN) {
      setChildren(newCount)
    }
  }

  const totalPassengers = adults + childrenWithSeats + children

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Passengers</h3>
        <span className="ml-auto text-sm text-cyan-400 font-semibold">
          Total: {totalPassengers}
        </span>
      </div>

      {/* Passenger Composition Summary */}
      <div className="bg-slate-900/40 border border-white/5 rounded-lg px-4 py-3 mb-6">
        <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Composition
        </p>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-cyan-400">{adults}</span>
            <span className="text-slate-500 ml-1">Adult{adults !== 1 ? 's' : ''}</span>
          </div>
          {childrenWithSeats > 0 && (
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-cyan-400">{childrenWithSeats}</span>
              <span className="text-slate-500 ml-1">
                Child{childrenWithSeats !== 1 ? 'ren' : ''} (Seat)
              </span>
            </div>
          )}
          {children > 0 && (
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-cyan-400">{children}</span>
              <span className="text-slate-500 ml-1">
                Child{children !== 1 ? 'ren' : ''} (Free)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Adults Counter */}
      <div className="mb-6">
        <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-3">
          👤 Adults 
        </label>
        <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 rounded-lg p-4">
          <button
            onClick={() => handleAdultChange(-1)}
            disabled={adults <= MIN_ADULTS}
            className={cn(
              'p-2 rounded-lg transition-colors',
              adults <= MIN_ADULTS
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            )}
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <div className="text-3xl font-bold text-white">{adults}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Min {MIN_ADULTS}, Max {MAX_ADULTS}
            </div>
          </div>

          <button
            onClick={() => handleAdultChange(1)}
            disabled={adults >= MAX_ADULTS}
            className={cn(
              'p-2 rounded-lg transition-colors',
              adults >= MAX_ADULTS
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          100% of base fare per person
        </p>
      </div>

      {/* Children with Seats Counter */}
      <div className="mb-6">
        <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-3">
          👧 Children (5-12 years)
        </label>
        <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 rounded-lg p-4">
          <button
            onClick={() => handleChildrenWithSeatsChange(-1)}
            disabled={childrenWithSeats <= 0}
            className={cn(
              'p-2 rounded-lg transition-colors',
              childrenWithSeats <= 0
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            )}
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <div className="text-3xl font-bold text-white">{childrenWithSeats}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Max {MAX_CHILDREN_WITH_SEATS}
            </div>
          </div>

          <button
            onClick={() => handleChildrenWithSeatsChange(1)}
            disabled={childrenWithSeats >= MAX_CHILDREN_WITH_SEATS}
            className={cn(
              'p-2 rounded-lg transition-colors',
              childrenWithSeats >= MAX_CHILDREN_WITH_SEATS
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          50% of base fare per child
        </p>
      </div>

      {/* Children without Seats Counter */}
      <div>
        <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-3">
          👶 Children (Under 5)
        </label>
        <div className="flex items-center gap-4 bg-slate-900/40 border border-white/5 rounded-lg p-4">
          <button
            onClick={() => handleChildrenChange(-1)}
            disabled={children <= 0}
            className={cn(
              'p-2 rounded-lg transition-colors',
              children <= 0
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
            )}
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <div className="text-3xl font-bold text-white">{children}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Max {MAX_CHILDREN}
            </div>
          </div>

          <button
            onClick={() => handleChildrenChange(1)}
            disabled={children >= MAX_CHILDREN}
            className={cn(
              'p-2 rounded-lg transition-colors',
              children >= MAX_CHILDREN
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          Free (no seat required)
        </p>
      </div>

      {/* Info Banner */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
        </div>
      </div>
    </div>
  )
}