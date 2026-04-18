/**
 * ActiveTrip.jsx  —  src/pages/Driver/ActiveTrip.jsx
 *
 * Displays the driver's current trip, allows them to mark it complete,
 * and shows a skeleton while loading.  Matches the TransitOS dark/teal aesthetic.
 *
 * Dependent files (all already exist in the project):
 *   src/service/driverApi.js
 *   src/components/ui/card.jsx
 *   src/components/ui/button.jsx
 *   src/components/ui/badge.jsx
 *   @/lib/utils  (cn helper)
 *   lucide-react
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Navigation, Train, Bus, Car, Zap, Anchor,
  CheckCircle2, Clock, AlertCircle, RefreshCw,
  MapPin, ArrowRight, Ruler, IndianRupee, User,
  Loader2, CircleDot
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getActiveTrip, completeTrip } from '../../service/driver_api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getModeIcon(mode = '', size = 'w-4 h-4') {
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail')) return <Zap    className={size} />
  if (m.includes('bus'))                              return <Bus    className={size} />
  if (m.includes('ferry'))                            return <Anchor className={size} />
  if (m.includes('auto') || m.includes('taxi'))       return <Car    className={size} />
  return <Train className={size} />
}

const STATUS_CONFIG = {
  awaiting:    { label: 'Awaiting Passenger', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30',  dot: 'bg-amber-400'  },
  in_progress: { label: 'In Progress',        color: 'text-cyan-400',   bg: 'bg-cyan-500/10  border-cyan-500/30',   dot: 'bg-cyan-400 animate-pulse'   },
  completed:   { label: 'Completed',          color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30',  dot: 'bg-green-400'  },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TripSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header card skeleton */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-28 rounded bg-slate-800" />
          <div className="h-6 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="h-6 w-48 rounded bg-slate-800 mb-2" />
        <div className="h-3 w-32 rounded bg-slate-800" />
      </div>
      {/* Legs skeleton */}
      {[0, 1].map(i => (
        <div key={i} className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-slate-800" />
              <div className="h-3 w-24 rounded bg-slate-800" />
            </div>
            <div className="h-5 w-16 rounded bg-slate-800" />
          </div>
        </div>
      ))}
      {/* Fare skeleton */}
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-slate-800 mx-auto" />
              <div className="h-6 w-20 rounded bg-slate-800 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Button skeleton */}
      <div className="h-12 rounded-xl bg-slate-800" />
    </div>
  )
}

// ─── No Active Trip ───────────────────────────────────────────────────────────

function NoTrip({ onRefresh, refreshing }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-2xl border border-white/10 flex items-center justify-center mb-5"
        style={{ background: 'rgba(14,165,233,0.04)', boxShadow: '0 0 32px rgba(34,211,238,0.06)' }}
      >
        <Navigation className="w-10 h-10 text-slate-700" />
      </div>
      <h2 className="text-white font-bold text-lg mb-2">No Active Trip</h2>
      <p className="text-slate-500 text-sm mb-6 max-w-xs leading-relaxed">
        You have no trip assigned right now. Refresh to check for new assignments.
      </p>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
        className="border-white/10 text-slate-400 hover:text-white hover:border-white/20 gap-2"
      >
        <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  )
}

// ─── Leg Card ─────────────────────────────────────────────────────────────────

function LegCard({ leg, index }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-slate-900/40 p-4 flex items-center gap-3">
      {/* Mode icon badge */}
      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
        {getModeIcon(leg.mode || leg.status || '')}
      </div>

      {/* Route */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium text-white">
          <span className="truncate">{leg.from || leg.from_station || '—'}</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="truncate">{leg.to || leg.to_station || '—'}</span>
        </div>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">
          Leg {index + 1} · {leg.mode || 'Unknown'}
        </p>
      </div>

      {/* Estimated fare for this leg */}
      {leg.estimatedFare != null && (
        <span className="text-sm font-bold text-cyan-400 shrink-0">
          ₹{Number(leg.estimatedFare).toFixed(2)}
        </span>
      )}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
      'flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl',
      'text-sm font-medium backdrop-blur-md transition-all',
      type === 'success'
        ? 'bg-green-950/90 border-green-500/30 text-green-300'
        : 'bg-rose-950/90  border-rose-500/30  text-rose-300'
    )}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        : <AlertCircle  className="w-4 h-4 text-rose-400  shrink-0" />
      }
      {message}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActiveTrip() {
  const [trip,       setTrip]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [toast,      setToast]      = useState(null)  // { message, type }
  const [error,      setError]      = useState('')

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchTrip = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await getActiveTrip()
      setTrip(data)
    } catch (err) {
      // 404 = no active trip (backend returns 404 when driver has no trip)
      if (err?.response?.status === 404) {
        setTrip(null)
      } else {
        setError('Failed to load trip. Is the backend running?')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchTrip() }, [fetchTrip])

  async function handleCompleteTrip() {
    if (!trip?.trip_id) return
    setCompleting(true)
    try {
      await completeTrip(trip.trip_id)
      // Optimistically update status so the UI reflects completion immediately
      setTrip(prev => ({ ...prev, status: 'completed' }))
      showToast('Trip marked as completed! Fare released to your wallet.', 'success')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not complete trip. Retry.', 'error')
    } finally {
      setCompleting(false)
    }
  }

  const statusCfg = STATUS_CONFIG[trip?.status] ?? STATUS_CONFIG.awaiting
  const legs      = trip?.legs ?? []
  const isCompleted = trip?.status === 'completed'

  return (
    <div
      className="min-h-screen p-6 pb-20"
      style={{ background: '#0b1220' }}
    >
      <div className="max-w-xl mx-auto">

        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Trip</h1>
          </div>
          <p className="text-slate-500 text-sm">Your current passenger assignment</p>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && <TripSkeleton />}

        {/* ── Backend error ── */}
        {!loading && error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-400 text-sm font-medium">{error}</p>
              <button
                onClick={() => fetchTrip(true)}
                className="text-rose-400/70 text-xs mt-1 hover:text-rose-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── No active trip ── */}
        {!loading && !error && !trip && (
          <NoTrip onRefresh={() => fetchTrip(true)} refreshing={refreshing} />
        )}

        {/* ── Trip details ── */}
        {!loading && !error && trip && (
          <div className="space-y-4">

            {/* ── Status + Passenger card ── */}
            <Card className="border-white/[0.07] bg-slate-900/60 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-slate-300 font-semibold tracking-wide">
                    Trip Details
                  </CardTitle>
                  {/* Refresh */}
                  <button
                    onClick={() => fetchTrip(true)}
                    disabled={refreshing}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Status badge */}
                <div className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wide',
                  statusCfg.bg, statusCfg.color
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                  {statusCfg.label}
                </div>

                {/* Passenger */}
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm uppercase">
                    {(trip.passenger_name || 'P').charAt(0)}
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-0.5">Passenger</p>
                    <p className="text-white font-semibold text-sm">{trip.passenger_name || 'Unknown'}</p>
                  </div>
                  <User className="w-4 h-4 text-slate-700 ml-auto" />
                </div>

                {/* Mode + Trip ID */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                    <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-1">Mode</p>
                    <div className="flex items-center gap-1.5 text-cyan-400 text-sm font-semibold">
                      {getModeIcon(trip.mode || '', 'w-3.5 h-3.5')}
                      {trip.mode || '—'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                    <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-1">Trip ID</p>
                    <p className="text-slate-300 text-xs font-mono">
                      #{String(trip.trip_id || '').slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* ── Route legs ── */}
            {legs.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-600 tracking-widest uppercase mb-2 px-1">
                  Route · {legs.length} leg{legs.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {legs.map((leg, i) => (
                    <LegCard key={i} leg={leg} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Fare summary ── */}
            <Card className="border-white/[0.07] bg-slate-900/60 backdrop-blur-md">
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-1">Distance</p>
                    <p className="text-white font-bold text-lg">
                      {trip.distance_km != null ? `${Number(trip.distance_km).toFixed(1)} km` : '—'}
                    </p>
                  </div>
                  <div>
                    <div
                      className="mx-auto mb-1 w-px h-8 bg-white/5"
                      style={{ gridColumn: 'none' }}
                    />
                  </div>
                  <div className="col-span-1">
                    {/* intentionally empty middle divider column hidden via grid-cols-3 */}
                  </div>
                </div>

                {/* Redesigned: two clear stats side-by-side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                    <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-1">
                      <Ruler className="w-3 h-3 inline mr-1" />Distance
                    </p>
                    <p className="text-white font-bold text-xl">
                      {trip.distance_km != null ? Number(trip.distance_km).toFixed(1) : '—'}
                      <span className="text-xs text-slate-500 ml-1">km</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center"
                    style={{ boxShadow: '0 0 20px rgba(34,211,238,0.06)' }}
                  >
                    <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">
                      <IndianRupee className="w-3 h-3 inline mr-0.5" />Fare (Locked)
                    </p>
                    <p className="text-cyan-400 font-bold text-xl">
                      ₹{trip.fare != null ? Number(trip.fare).toFixed(2) : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Complete Trip CTA ── */}
            <Button
              onClick={handleCompleteTrip}
              disabled={completing || isCompleted}
              className={cn(
                'w-full h-12 font-bold text-sm rounded-xl transition-all duration-200 gap-2',
                isCompleted
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30 cursor-default'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg'
              )}
              style={!isCompleted ? { boxShadow: '0 0 24px rgba(14,165,233,0.35)' } : {}}
            >
              {completing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Completing…</>
              ) : isCompleted ? (
                <><CheckCircle2 className="w-4 h-4" /> Trip Completed</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Complete Trip</>
              )}
            </Button>

          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
      `}</style>
    </div>
  )
}
