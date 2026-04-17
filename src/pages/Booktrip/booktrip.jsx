import { useState, useEffect } from 'react'
import { ChevronLeft, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import { getRoutes, bookTicket } from '../../service/api'
import GroupTicketing from '../../components/GroupTicketing'
import MultiLegRoute from '../../components/MultiLegRoute'
import QRGeneratorGrouped from '../../components/QRGeneratorGrouped'
import { calculateGroupedFare } from '../../utils/payloadMinifier'
import api from '../../service/api'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_STATIONS = [
  'Dahisar', 'Borivali', 'Kandivali', 'Malad', 'Andheri',
  'Jogeshwari', 'Goregaon', 'Dindoshi', 'Chembur', 'Thane',
  'Dadar', 'Parel', 'Dombivali', 'Kalyan', 'WEH',
  'Churchgate', 'Bandra', 'Kala Ghoda', 'CST'
]

const MODES = [
  'Local Train (Western)',
  'Local Train (Central)',
  'Metro Line 1',
  'Metro Line 2A',
  'Metro Line 3',
  'Bus (BEST)'
]

/**
 * Fallback mock routes used when the backend /routes endpoint is unavailable.
 * Mirrors the exact shape that transformRouteData() expects from the real API.
 */
function buildMockRoutes(from, to) {
  return [
    {
      legs: [
        {
          id: 0,
          mode: 'Metro Line 2A',
          from_station: from,
          to_station: to,
          duration: 35,
          fare: 40,
          distance: 18,
          transfer_wait: 0,
          polyline: null
        }
      ],
      totalFare: 40,
      totalDuration: 35
    },
    {
      legs: [
        {
          id: 0,
          mode: 'Local Train (Western)',
          from_station: from,
          to_station: 'Dadar',
          duration: 25,
          fare: 15,
          distance: 12,
          transfer_wait: 5,
          polyline: null
        },
        {
          id: 1,
          mode: 'Local Train (Central)',
          from_station: 'Dadar',
          to_station: to,
          duration: 20,
          fare: 15,
          distance: 10,
          transfer_wait: 0,
          polyline: null
        }
      ],
      totalFare: 30,
      totalDuration: 50
    },
    {
      legs: [
        {
          id: 0,
          mode: 'Bus (BEST)',
          from_station: from,
          to_station: to,
          duration: 55,
          fare: 12,
          distance: 20,
          transfer_wait: 0,
          polyline: null
        }
      ],
      totalFare: 12,
      totalDuration: 55
    }
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

function getModeIcon(mode) {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return '⚡'
  if (m.includes('western') || m.includes('central')) return '🚂'
  if (m.includes('bus')) return '🚌'
  return '🚊'
}

/**
 * Transforms raw route data from backend into the internal displayable format.
 * @param {Object} routeData - Response body from GET /routes
 * @returns {Array} Normalized route objects
 */
function transformRouteData(routeData) {
  if (!routeData?.routes?.length) return []

  return routeData.routes.map((route) => ({
    legs: (route.legs || []).map((leg, idx) => ({
      id: idx,
      mode: leg.mode || 'Unknown',
      from_station: leg.from_station || '',
      to_station: leg.to_station || '',
      duration: leg.duration ?? leg.estimated_time ?? leg.estimatedTime ?? leg.time ?? leg.time_mins ?? 0,
      fare: leg.fare ?? leg.total_fare ?? leg.totalFare ?? leg.price ?? 0,
      distance: leg.distance_km ?? leg.distance ?? leg.distanceKm ?? 0,
      transfer_wait: idx < (route.legs || []).length - 1 ? 5 : 0,
      polyline: leg.polyline || null
    })),
    totalFare: route.total_fare ?? route.totalFare ?? route.fare ?? route.price ?? 0,
    totalDuration: route.total_duration ?? route.totalDuration ?? route.duration ?? route.estimated_time ?? route.estimatedTime ?? route.time ?? 0
  }))
}
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function BookTrip() {

  // ── Step tracking ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(0)

  // ── Step 0 fields ──────────────────────────────────────────────────────────
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [name, setName] = useState('Commuter')

  // ── Stations ───────────────────────────────────────────────────────────────
  const [stations, setStations] = useState([])
  const [stationsError, setStationsError] = useState(false)

  // ── Step 1: Routes ─────────────────────────────────────────────────────────
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  /** true when the shown routes are mock data (backend was offline) */
  const [usingMockRoutes, setUsingMockRoutes] = useState(false)

  // ── Step 2: Passengers ─────────────────────────────────────────────────────
  const [passengerData, setPassengerData] = useState({
    adults: 1,
    children: 0,
    childrenWithSeats: 0,
    totalPassengers: 1
  })

  // ── Step 3: Ticket ─────────────────────────────────────────────────────────
  const [ticket, setTicket] = useState(null)

  // ── UI states ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [routesLoading, setRoutesLoading] = useState(false)
  const [error, setError] = useState('')

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStations()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

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

  function logAnalytic(event, data) {
    console.log('[ANALYTICS]', {
      timestamp: new Date().toISOString(),
      event,
      data,
      passengers: passengerData.totalPassengers,
      route: `${from}-${to}`
    })
  }

  function saveTicketLocally(ticketData) {
    try {
      const existing = JSON.parse(localStorage.getItem('transitos_tickets') || '[]')
      localStorage.setItem(
        'transitos_tickets',
        JSON.stringify([ticketData, ...existing])
      )
    } catch (err) {
      console.error('Failed to save ticket locally:', err)
    }
  }

  function queueOfflineTicket(ticketData) {
    try {
      const queue = JSON.parse(localStorage.getItem('transitos_offline_queue') || '[]')
      queue.push({
        commuter_name: ticketData.commuter_name,
        from_station: ticketData.from_station,
        to_station: ticketData.to_station,
        mode: ticketData.mode,
        ticket_id: ticketData.ticket_id,
        passengers: ticketData.passengers
      })
      localStorage.setItem('transitos_offline_queue', JSON.stringify(queue))
    } catch (err) {
      console.error('Failed to queue offline ticket:', err)
    }
  }

  // ── Route-data accessors (work for both array & object route formats) ──────

  /** Total fare for the selected route across all legs */
  function getRouteTotalFare() {
    if (!selectedRoute) return 0
    // Use pre-computed totalFare when available
    if (selectedRoute.totalFare != null) return selectedRoute.totalFare
    // Legacy array format
    if (Array.isArray(selectedRoute)) {
      return selectedRoute.reduce((sum, leg) => sum + (leg.fare || 0), 0)
    }
    // Fall back to summing legs
    return selectedRoute.legs?.reduce((sum, leg) => sum + (leg.fare || 0), 0) || 0
  }

  function getRouteMode() {
    if (!selectedRoute) return 'Unknown'
    if (Array.isArray(selectedRoute)) return selectedRoute[0]?.mode || 'Unknown'
    return selectedRoute.legs?.[0]?.mode || 'Unknown'
  }

  function getRouteDuration() {
    if (!selectedRoute) return 0
    if (Array.isArray(selectedRoute)) {
      return selectedRoute.reduce((sum, leg) => sum + (leg.duration || 0), 0)
    }
    return selectedRoute.legs?.reduce((sum, leg) => sum + (leg.duration || 0), 0) || 0
  }

  function getRoutePolyline() {
    if (!selectedRoute) return null
    if (Array.isArray(selectedRoute)) return selectedRoute[0]?.polyline || null
    return selectedRoute.legs?.[0]?.polyline || null
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fetch routes via the named getRoutes() export from api.js.
   * Falls back to mock routes when the backend returns a 404 / is offline,
   * so the rest of the booking flow remains fully testable.
   */
  async function handlePlanJourney() {
    if (!from || !to) {
      setError('Please select both origin and destination.')
      return
    }
    if (from === to) {
      setError('Origin and destination cannot be the same.')
      return
    }

    setError('')
    setLoading(true)
    setRoutesLoading(true)
    setUsingMockRoutes(false)

    try {
      // ── Try real backend first ──────────────────────────────────────────
      let fetchedRoutes = []
      try {
        const rawData = await getRoutes(from, to)          // uses api.js export
        fetchedRoutes = transformRouteData(rawData)
      } catch (backendErr) {
        const status = backendErr?.response?.status
        // 404 means endpoint missing; network error means backend is down.
        // Either way, fall back gracefully.
        if (status === 404 || !backendErr?.response) {
          console.warn(
            `Backend /routes unavailable (${status ?? 'network error'}) — using mock routes`
          )
          fetchedRoutes = buildMockRoutes(from, to)
          setUsingMockRoutes(true)
        } else {
          // 4xx/5xx that isn't a 404 — surface to the user
          throw backendErr
        }
      }

      if (fetchedRoutes.length === 0) {
        setError('No routes found for this journey. Try different stations.')
        return
      }

      setRoutes(fetchedRoutes)
      logAnalytic('journey_planned', { from, to, routeCount: fetchedRoutes.length })
      setStep(1)
    } catch (err) {
      console.error('Journey planning error:', err)
      setError('Failed to fetch routes. Please check your connection and try again.')
    } finally {
      setLoading(false)
      setRoutesLoading(false)
    }
  }

  function handleSelectRoute(route) {
    setSelectedRoute(route)
    logAnalytic('route_selected', {
      mode: Array.isArray(route) ? route[0]?.mode : route.legs?.[0]?.mode,
      totalFare: route.totalFare,
      legs: Array.isArray(route) ? route.length : route.legs?.length || 1
    })
    setStep(2)
  }

  /**
   * Confirm booking — uses the named bookTicket() export from api.js.
   * Saves locally first, then attempts server sync; queues offline if it fails.
   */
  async function handleConfirm() {
    setLoading(true)
    setError('')

    const ticket_id = uuidv4()
    const now = new Date()
    const valid_until = new Date(now.getTime() + 3 * 60 * 60 * 1000)

    const baseFare = getRouteTotalFare()
    const calculatedFare = calculateGroupedFare(baseFare, passengerData)

    const newTicket = {
      ticket_id,
      commuter_name: name,
      from_station: from,
      to_station: to,
      mode: getRouteMode(),
      fare: calculatedFare,
      duration: getRouteDuration(),
      timestamp: now.getTime(),
      issued_at: now.toISOString(),
      valid_until: valid_until.toISOString(),
      passengers: passengerData,
      polyline: getRoutePolyline()
    }

    // Always persist locally first
    saveTicketLocally(newTicket)

    try {
      // Use the named export — keeps api.js as the single source of truth
      const bookingResponse = await bookTicket({
        commuter_name: name,
        from_station: from,
        to_station: to,
        mode: getRouteMode(),
        ticket_id,
        passengers: passengerData
      })
      console.log('On-chain settlement triggered!', bookingResponse)
      logAnalytic('booking_confirmed', {
        fare: calculatedFare,
        passengers: passengerData.totalPassengers,
        txHash: bookingResponse?.tx_hash || 'pending'
      })
    } catch (err) {
      console.warn('Server offline — ticket queued for sync.', err)
      queueOfflineTicket(newTicket)
      logAnalytic('booking_offline', {
        fare: calculatedFare,
        passengers: passengerData.totalPassengers
      })
    } finally {
      setTicket(newTicket)
      setLoading(false)
      setStep(3)
    }
  }

  function handleReset() {
    setStep(0)
    setFrom('')
    setTo('')
    setModeFilter('')
    setRoutes([])
    setSelectedRoute(null)
    setTicket(null)
    setError('')
    setUsingMockRoutes(false)
    setPassengerData({ adults: 1, children: 0, childrenWithSeats: 0, totalPassengers: 1 })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES (used in render)
  // ─────────────────────────────────────────────────────────────────────────

  const totalFare = getRouteTotalFare()
  const adultFare = totalFare * passengerData.adults
  const childSeatFare = totalFare * 0.5 * passengerData.childrenWithSeats
  const grandTotal = adultFare + childSeatFare

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pb-20">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Plan Your Journey
          </h1>
          <p className="text-slate-400 text-sm">Multi-modal transit with group ticketing</p>
        </div>

        {/* ── STEP 0: Select Origin / Destination ─────────────────────────── */}
        {step === 0 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Select Your Journey</h2>

            {/* Stations fallback warning */}
            {stationsError && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-xl px-4 py-3 mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Backend offline — using fallback station list.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* From */}
            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">
                From
              </label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">Select origin station</option>
                {stations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* To */}
            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">
                To
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">Select destination station</option>
                {stations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Mode filter */}
            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">
                Preferred Mode (Optional)
              </label>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">Any mode</option>
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Name */}
            <div className="mb-8">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
              />
            </div>

            <button
              onClick={handlePlanJourney}
              disabled={loading || !from || !to}
              className={cn(
                'w-full font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2',
                loading || !from || !to
                  ? 'bg-cyan-500/40 text-white/60 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white'
              )}
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Finding Routes...</>
                : 'Plan Journey'}
            </button>
          </div>
        )}

        {/* ── STEP 1: Route Selection ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-1">Route Options</h2>
            <p className="text-slate-400 text-sm mb-1">{from} → {to}</p>

            {/* Mock-data notice */}
            {usingMockRoutes && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl px-4 py-2 mb-4">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Backend route engine offline — showing estimated routes. Fares may differ.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {routesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-slate-800/40 border border-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">No routes available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {routes.map((route, idx) => (
                  <MultiLegRoute
                    key={idx}
                    legs={route.legs}
                    totalFare={route.totalFare}
                    totalDuration={route.totalDuration}
                    isSelected={selectedRoute === route}
                    onSelect={() => handleSelectRoute(route)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Confirm Journey ──────────────────────────────────────── */}
        {step === 2 && selectedRoute && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-1">Confirm Your Journey</h2>
            <p className="text-slate-400 text-sm mb-6">Review your trip details before booking</p>

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Leg breakdown */}
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 mb-4">
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-4">
                Journey Details
              </p>
              {(Array.isArray(selectedRoute) ? selectedRoute : selectedRoute.legs)?.map((leg, idx) => (
                <div key={idx} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{getModeIcon(leg.mode)}</span>
                    <span className="text-white font-medium">{leg.from_station}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-white font-medium">{leg.to_station}</span>
                    <span className="text-[10px] text-slate-500 ml-auto whitespace-nowrap">
                      {leg.duration} min · ₹{leg.fare}
                    </span>
                  </div>
                  {/* Transfer indicator between legs */}
                  {leg.transfer_wait > 0 && (
                    <p className="text-[10px] text-slate-600 ml-8 mt-1">
                      ↕ {leg.transfer_wait} min transfer
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Group ticketing */}
            <GroupTicketing
              onUpdate={(data) => {
                setPassengerData(data)
                logAnalytic('passenger_updated', data)
              }}
            />

            {/* Fare breakdown */}
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 mb-6">
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-4">
                Fare Breakdown
              </p>

              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Base fare (all legs)</span>
                <span>₹{totalFare.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Adult × {passengerData.adults}</span>
                <span>₹{adultFare.toFixed(2)}</span>
              </div>

              {passengerData.childrenWithSeats > 0 && (
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Child (With Seat) × {passengerData.childrenWithSeats} <span className="text-slate-600">(50%)</span></span>
                  <span>₹{childSeatFare.toFixed(2)}</span>
                </div>
              )}

              {passengerData.children > 0 && (
                <div className="flex justify-between text-sm text-slate-400 mb-3">
                  <span>Child (No Seat) × {passengerData.children}</span>
                  <span className="text-emerald-400">Free</span>
                </div>
              )}

              <div className="border-t border-white/10 pt-3 flex justify-between font-semibold">
                <span className="text-white">
                  Total ({passengerData.totalPassengers} passenger{passengerData.totalPassengers !== 1 ? 's' : ''})
                </span>
                <span className="text-cyan-400">₹{grandTotal.toFixed(2)}</span>
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
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating ticket...</>
                : 'Confirm & Book'}
            </button>

            <p className="text-[10px] text-slate-600 text-center mt-3 tracking-wide">
              Ticket generated locally · Syncs to blockchain when online
            </p>
          </div>
        )}

        {/* ── STEP 3: QR Display ───────────────────────────────────────────── */}
        {step === 3 && ticket && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <QRGeneratorGrouped
              ticket={ticket}
              passengerData={passengerData}
              onBookAnother={handleReset}
            />
          </div>
        )}

      </div>
    </div>
  )
}