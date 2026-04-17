// src/pages/Booktrip/booktrip.jsx
// V3: Modular Leg Builder with Gig Mode Support

import { useState, useEffect } from 'react'
import {
  ChevronLeft, AlertCircle, RefreshCw, ArrowRight,
  Plus, Trash2, Clock, MapPin, Zap, Bus, Train,
  Car, Bike, Navigation
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import { bookTicket } from '../../service/api'
import { deductBalance, saveTicket } from '@/lib/walletstore'
import GroupTicketing from '../../components/GroupTicketing'
import QRGeneratorGrouped from '../../components/QRGeneratorGrouped'
import {
  calculateGroupedFare,
  minifyMultiLegPayload,
  calculateMultiLegFare,
  hasPrivateLeg
} from '../../utils/payloadMinifier'
import api from '../../service/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_STATIONS = [
  'Dahisar', 'Borivali', 'Kandivali', 'Malad', 'Andheri',
  'Jogeshwari', 'Goregaon', 'Ghatkopar', 'Thane',
  'Dadar', 'Dombivali', 'Kalyan', 'WEH',
  'Churchgate', 'Bandra', 'CST'
]

// Private mode uses address strings, not stations
const PRIVATE_ADDRESS_SUGGESTIONS = [
  'Home', 'Office', 'Airport (T2)', 'Hospital', 'Mall',
  'College', 'Railway Station', 'Bus Depot', 'Market'
]

// All available modes
const PUBLIC_MODES = [
  'Local Train (Western)',
  'Local Train (Central)',
  'Metro Line 1',
  'Metro Line 2A',
  'Metro Line 3',
  'Bus (BEST)'
]

const PRIVATE_MODES = [
  'Auto-Rickshaw',
  'Taxi (Kaali-Peeli)',
  'Bike Taxi'
]

// Per-km fare estimates for private modes (used for upfront locking)
const PRIVATE_FARE_PER_KM = {
  'Auto-Rickshaw': 18,
  'Taxi (Kaali-Peeli)': 25,
  'Bike Taxi': 12
}

// 25km cap for private/last-mile legs (from PDF spec)
const PRIVATE_LEG_MAX_KM = 25

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPrivateMode(mode = '') {
  return PRIVATE_MODES.includes(mode)
}

function getModeIcon(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return <Zap className="w-4 h-4" />
  if (m.includes('bus')) return <Bus className="w-4 h-4" />
  if (m.includes('auto') || m.includes('taxi')) return <Car className="w-4 h-4" />
  if (m.includes('bike')) return <Bike className="w-4 h-4" />
  return <Train className="w-4 h-4" />
}

function getModeColor(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return 'text-violet-400 border-violet-500/30 bg-violet-500/10'
  if (m.includes('bus')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  if (m.includes('auto') || m.includes('taxi')) return 'text-orange-400 border-orange-500/30 bg-orange-500/10'
  if (m.includes('bike')) return 'text-green-400 border-green-500/30 bg-green-500/10'
  return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
}

// Rough estimate: 3km default for private legs when no OSRM data yet
function estimatePrivateFare(mode, distanceKm = 3) {
  const rate = PRIVATE_FARE_PER_KM[mode] || 18
  return Math.round(rate * distanceKm)
}

// ─── Single Leg Builder Component ─────────────────────────────────────────────

function LegBuilder({ leg, index, stations, onUpdate, onRemove, canRemove }) {
  const isPrivate = isPrivateMode(leg.mode)
  const modeColor = getModeColor(leg.mode)

  return (
    <div className={cn(
      'rounded-xl border p-4 mb-3 relative transition-all',
      isPrivate
        ? 'border-orange-500/30 bg-orange-500/5'
        : 'border-white/10 bg-slate-800/40'
    )}>
      {/* Leg Number Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn(
          'text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1',
          modeColor
        )}>
          {getModeIcon(leg.mode)}
          LEG {index + 1}
        </span>

        {isPrivate && (
          <span className="text-[10px] tracking-widest text-orange-400 border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded-md">
            GIG MODE
          </span>
        )}

        {/* Pending badge — shown for private legs that need driver scan */}
        {isPrivate && leg.status === 'pending' && (
          <span className="ml-auto text-[10px] tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-md animate-pulse">
            ⏳ AWAITING DRIVER SCAN
          </span>
        )}

        {canRemove && (
          <button
            onClick={onRemove}
            className="ml-auto text-slate-600 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-1.5">
          Mode of Transport
        </label>
        <div className="flex gap-2 flex-wrap">
          {/* Public modes */}
          <div className="w-full">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Public Transit</p>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {PUBLIC_MODES.map(m => (
                <button
                  key={m}
                  onClick={() => onUpdate({ ...leg, mode: m, from: '', to: '' })}
                  className={cn(
                    'text-[10px] px-2.5 py-1 rounded-lg border transition-all',
                    leg.mode === m
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400'
                      : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white bg-slate-900/40'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Private modes */}
          <div className="w-full">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Private / Gig</p>
            <div className="flex gap-1.5 flex-wrap">
              {PRIVATE_MODES.map(m => (
                <button
                  key={m}
                  onClick={() => onUpdate({ ...leg, mode: m, from: '', to: '', status: 'pending' })}
                  className={cn(
                    'text-[10px] px-2.5 py-1 rounded-lg border transition-all',
                    leg.mode === m
                      ? 'border-orange-500/50 bg-orange-500/15 text-orange-400'
                      : 'border-white/10 text-slate-400 hover:border-orange-500/20 hover:text-orange-300 bg-slate-900/40'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* From / To Inputs — toggle between station dropdown and address input */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-1.5">
            {isPrivate ? 'Pickup Location' : 'From Station'}
          </label>
          {isPrivate ? (
            // Address input for private modes
            <input
              type="text"
              list={`from-suggestions-${index}`}
              value={leg.from}
              onChange={e => onUpdate({ ...leg, from: e.target.value })}
              placeholder="e.g. Home, Office..."
              className="w-full bg-slate-900/60 border border-orange-500/20 rounded-xl text-white px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 placeholder:text-slate-600"
            />
          ) : (
            // Station dropdown for public modes
            <select
              value={leg.from}
              onChange={e => onUpdate({ ...leg, from: e.target.value })}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Select station</option>
              {stations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {isPrivate && (
            <datalist id={`from-suggestions-${index}`}>
              {PRIVATE_ADDRESS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          )}
        </div>

        <div>
          <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-1.5">
            {isPrivate ? 'Drop Location' : 'To Station'}
          </label>
          {isPrivate ? (
            <input
              type="text"
              list={`to-suggestions-${index}`}
              value={leg.to}
              onChange={e => onUpdate({ ...leg, to: e.target.value })}
              placeholder="e.g. Andheri Station..."
              className="w-full bg-slate-900/60 border border-orange-500/20 rounded-xl text-white px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 placeholder:text-slate-600"
            />
          ) : (
            <select
              value={leg.to}
              onChange={e => onUpdate({ ...leg, to: e.target.value })}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Select station</option>
              {stations.map(s => s !== leg.from && <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {isPrivate && (
            <datalist id={`to-suggestions-${index}`}>
              {PRIVATE_ADDRESS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          )}
        </div>
      </div>

      {/* Private leg: estimated fare + 25km cap warning */}
      {isPrivate && leg.from && leg.to && (
        <div className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-orange-300/70 tracking-widest uppercase">
              Est. Fare (locked upfront)
            </span>
            <span className="text-sm font-bold text-orange-400">
              ₹{estimatePrivateFare(leg.mode)} – ₹{estimatePrivateFare(leg.mode, 6)}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1">
            Final fare calculated at driver scan · Max {PRIVATE_LEG_MAX_KM}km cap enforced
          </p>
        </div>
      )}

      {/* Connector arrow pointing to next leg */}
      {index >= 0 && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-90" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Journey Summary Strip ─────────────────────────────────────────────────────

function JourneySummary({ legs }) {
  if (!legs || legs.length === 0) return null

  return (
    <div className="rounded-xl border border-white/8 bg-slate-900/60 px-4 py-3 mb-4">
      <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-2">Journey Overview</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {legs.map((leg, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1',
              getModeColor(leg.mode)
            )}>
              {getModeIcon(leg.mode)}
              {leg.from || '?'} → {leg.to || '?'}
            </span>
            {idx < legs.length - 1 && (
              <ArrowRight className="w-3 h-3 text-slate-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main BookTrip Component ───────────────────────────────────────────────────

export default function BookTrip() {
  const [step, setStep] = useState(0)
  // Step 0: Build legs
  // Step 1: Passenger selection + fare summary
  // Step 2: Confirm + book
  // Step 3: Ticket / QR

  const [legs, setLegs] = useState([
    { id: uuidv4(), mode: 'Local Train (Western)', from: '', to: '', status: 'confirmed', estimatedFare: 0 }
  ])

  const [passengerData, setPassengerData] = useState({
    adults: 1, children: 0, childrenWithSeats: 0, totalPassengers: 1
  })

  const [name, setName] = useState('Commuter')
  const [stations, setStations] = useState([])
  const [stationsError, setStationsError] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [balanceError, setBalanceError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { fetchStations() }, [])

  async function fetchStations() {
    try {
      const response = await api.get('/stations')
      if (Array.isArray(response.data) && response.data.length > 0) {
        setStations(response.data)
        setStationsError(false)
      } else {
        setStations(FALLBACK_STATIONS)
        setStationsError(true)
      }
    } catch {
      setStations(FALLBACK_STATIONS)
      setStationsError(true)
    }
  }

  // ── Leg CRUD ────────────────────────────────────────────────────────────────

  function addLeg() {
    setLegs(prev => [
      ...prev,
      { id: uuidv4(), mode: 'Metro Line 1', from: '', to: '', status: 'confirmed', estimatedFare: 0 }
    ])
  }

  function updateLeg(index, updatedLeg) {
    // Recalculate estimated fare for private legs
    if (isPrivateMode(updatedLeg.mode)) {
      updatedLeg.estimatedFare = estimatePrivateFare(updatedLeg.mode)
      updatedLeg.status = 'pending'
    } else {
      updatedLeg.estimatedFare = 0  // will be filled by route API
      updatedLeg.status = 'confirmed'
    }
    setLegs(prev => prev.map((leg, i) => i === index ? updatedLeg : leg))
  }

  function removeLeg(index) {
    setLegs(prev => prev.filter((_, i) => i !== index))
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateLegs() {
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]
      if (!leg.mode) return `Leg ${i + 1}: Please select a mode.`
      if (!leg.from) return `Leg ${i + 1}: Please fill in the origin.`
      if (!leg.to) return `Leg ${i + 1}: Please fill in the destination.`
      if (leg.from === leg.to) return `Leg ${i + 1}: Origin and destination can't be the same.`
    }
    return null
  }

  // ── Fare Calculation ────────────────────────────────────────────────────────

  // For public legs, fetch fare from backend. For private legs, use estimate.
  async function fetchPublicFares() {
    const updatedLegs = [...legs]
    for (let i = 0; i < updatedLegs.length; i++) {
      const leg = updatedLegs[i]
      if (!isPrivateMode(leg.mode)) {
        try {
          const res = await api.get('/routes', {
            params: { from_station: leg.from, to_station: leg.to }
          })
          // Grab cheapest route fare
          const routes = res.data?.routes || res.data || []
          if (routes.length > 0) {
            const minFare = Math.min(...routes.map(r => r.total_fare || r.fare || r.totalFare || 0))
            updatedLegs[i] = { ...leg, estimatedFare: minFare }
          }
        } catch {
          // Fallback to a rough distance-based estimate
          updatedLegs[i] = { ...leg, estimatedFare: 20 }
        }
      }
    }
    setLegs(updatedLegs)
    return updatedLegs
  }

  function getTotalFare(legsData = legs) {
    const adultCount = passengerData.adults
    const childSeatCount = passengerData.childrenWithSeats

    return legsData.reduce((total, leg) => {
      const base = leg.estimatedFare || 0
      return total + (base * adultCount) + (base * 0.5 * childSeatCount)
    }, 0)
  }

  // ── Step Navigation ─────────────────────────────────────────────────────────

  async function handleProceedToPassengers() {
    const validationError = validateLegs()
    if (validationError) { setError(validationError); return }
    setError('')
    setLoading(true)
    await fetchPublicFares()
    setLoading(false)
    setStep(1)
  }

  async function handleConfirm() {
    setBalanceError('')
    setLoading(true)
    setError('')

    const totalFare = getTotalFare()
    const now = new Date()
    const valid_until = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const ticket_id = uuidv4()

    // Build primary from/to from first and last leg
    const firstLeg = legs[0]
    const lastLeg = legs[legs.length - 1]

    const newTicket = {
      ticket_id,
      commuter_name: name,
      from_station: firstLeg.from,
      to_station: lastLeg.to,
      mode: firstLeg.mode,
      fare: totalFare,
      issued_at: now.toISOString(),
      valid_until: valid_until.toISOString(),
      passengers: passengerData,
      legs: legs,
      is_multileg: legs.length > 1,
      has_private_leg: hasPrivateLeg(legs)
    }

    // Build QR payload using new multi-leg minifier
    const qrPayload = minifyMultiLegPayload(newTicket)
    newTicket.qr_payload = qrPayload

    try {
      // Send to backend (only public legs are booked server-side for now)
      const publicLegs = legs.filter(l => !isPrivateMode(l.mode))
      if (publicLegs.length > 0) {
        await bookTicket({
          commuter_name: name,
          from_station: firstLeg.from,
          to_station: lastLeg.to,
          mode: firstLeg.mode,
          ticket_id,
          passengers: passengerData
        })
      }

      // Deduct balance after successful API call
      const { ok, reason } = deductBalance(totalFare) // from walletstore
      if (!ok) {
        setBalanceError(reason)
        setLoading(false)
        return
      }

      saveTicket(newTicket)
      setTicket(newTicket)
      setStep(2)

    } catch (err) {
      // Offline fallback
      const { ok, reason } = deductBalance(totalFare)
      if (!ok) {
        setBalanceError(reason)
      } else {
        saveTicket(newTicket)
        setTicket(newTicket)
        setStep(2)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStep(0)
    setLegs([{ id: uuidv4(), mode: 'Local Train (Western)', from: '', to: '', status: 'confirmed', estimatedFare: 0 }])
    setTicket(null)
    setError('')
    setBalanceError('')
    setPassengerData({ adults: 1, children: 0, childrenWithSeats: 0, totalPassengers: 1 })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pb-20">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Plan Your Journey
          </h1>
          <p className="text-slate-400 text-sm">
            Multi-modal transit · Add public + gig legs
          </p>
        </div>

        {/* ── STEP 0: Leg Builder ── */}
        {step === 0 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Build Your Route</h2>
            <p className="text-slate-500 text-sm mb-5">
              Add one connection at a time. Mix public transit and gig rides.
            </p>

            {stationsError && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl px-4 py-2.5 mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Backend offline — using fallback stations.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl px-4 py-2.5 mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Name input */}
            <div className="mb-5">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Leg builders */}
            <div className="relative pb-4">
              {legs.map((leg, index) => (
                <LegBuilder
                  key={leg.id}
                  leg={leg}
                  index={index}
                  stations={stations}
                  onUpdate={updated => updateLeg(index, updated)}
                  onRemove={() => removeLeg(index)}
                  canRemove={legs.length > 1}
                />
              ))}
            </div>

            {/* Add Connection Button */}
            <button
              onClick={addLeg}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-cyan-500/30 text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-500/5 text-sm font-semibold py-3 rounded-xl transition-colors mb-5"
            >
              <Plus className="w-4 h-4" />
              + Add Connection
            </button>

            {/* Proceed CTA */}
            <button
              onClick={handleProceedToPassengers}
              disabled={loading}
              className={cn(
                'w-full font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2',
                loading
                  ? 'bg-cyan-500/40 text-white/60 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white'
              )}
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Fetching fares...</>
                : 'Continue to Passengers →'
              }
            </button>
          </div>
        )}

        {/* ── STEP 1: Passengers + Fare Review ── */}
        {step === 1 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-slate-400 mb-5 text-sm">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-xl font-bold text-white mb-4">Passengers & Fare</h2>

            {/* Journey summary */}
            <JourneySummary legs={legs} />

            {/* Individual leg fare breakdown */}
            <div className="rounded-xl border border-white/8 bg-slate-900/40 p-4 mb-5">
              <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-2">Leg Breakdown</p>
              {legs.map((leg, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1', getModeColor(leg.mode))}>
                      {getModeIcon(leg.mode)}
                    </span>
                    <span className="text-xs text-slate-300">{leg.from} → {leg.to}</span>
                    {isPrivateMode(leg.mode) && (
                      <span className="text-[9px] text-orange-400 border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 rounded animate-pulse">
                        PENDING DRIVER
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-cyan-400 font-semibold">
                    ₹{leg.estimatedFare?.toFixed(2) || '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Group ticketing component */}
            <GroupTicketing onUpdate={setPassengerData} />

            {/* Balance error */}
            {balanceError && (
              <div className="flex flex-col gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {balanceError}
                </div>
                <button
                  onClick={() => window.location.href = '/wallets'}
                  className="text-cyan-400 text-xs font-bold uppercase tracking-wider text-left hover:underline"
                >
                  + Add Funds to Wallet
                </button>
              </div>
            )}

            {/* Total fare display */}
            <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4 mb-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Total Fare</p>
                  <p className="text-[10px] text-slate-600">
                    {passengerData.adults}A + {passengerData.childrenWithSeats}CS + {passengerData.children}CN
                  </p>
                </div>
                <span className="text-2xl font-bold text-cyan-400">
                  ₹{getTotalFare().toFixed(2)}
                </span>
              </div>
             
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                'w-full font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2',
                loading
                  ? 'bg-cyan-500/40 text-white/60 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white'
              )}
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                : 'Confirm & Book All Legs'
              }
            </button>
          </div>
        )}

        {/* ── STEP 2: Ticket / QR ── */}
        {step === 2 && ticket && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            <QRGeneratorGrouped
              ticket={ticket}
              passengerData={passengerData}
              onBookAnother={handleReset}
            />

            {/* Multi-leg status list */}
            {ticket.is_multileg && (
              <div className="mt-5 rounded-xl border border-white/8 bg-slate-900/40 p-4">
                <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-3">Leg Status</p>
                {ticket.legs.map((leg, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1', getModeColor(leg.mode))}>
                        {getModeIcon(leg.mode)}
                        {leg.mode}
                      </span>
                      <span className="text-xs text-slate-400">{leg.from} → {leg.to}</span>
                    </div>
                    {leg.status === 'pending' ? (
                      <span className="text-[9px] tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">
                        ⏳ AWAITING DRIVER SCAN
                      </span>
                    ) : (
                      <span className="text-[9px] tracking-widest text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded">
                        ✓ CONFIRMED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}