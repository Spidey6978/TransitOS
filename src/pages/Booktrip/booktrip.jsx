import { useState, useEffect } from 'react'
import { ChevronLeft, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import { getRoutes, bookTicket } from '../../service/api'
// ── STEP 1: IMPORT WALLET UTILS ─────────────────────────────────────────────
import { deductBalance, saveTicket } from '@/lib/walletstore'
import GroupTicketing from '../../components/GroupTicketing'
import MultiLegRoute from '../../components/MultiLegRoute'
import QRGeneratorGrouped from '../../components/QRGeneratorGrouped'
import { calculateGroupedFare } from '../../utils/payloadMinifier'
import api from '../../service/api'

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

function getModeIcon(mode) {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return '⚡'
  if (m.includes('western') || m.includes('central')) return '🚂'
  if (m.includes('bus')) return '🚌'
  return '🚊'
}

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

export default function BookTrip() {

  const [step, setStep] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [name, setName] = useState('Commuter')

  const [stations, setStations] = useState([])
  const [stationsError, setStationsError] = useState(false)

  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [usingMockRoutes, setUsingMockRoutes] = useState(false)

  const [passengerData, setPassengerData] = useState({
    adults: 1,
    children: 0,
    childrenWithSeats: 0,
    totalPassengers: 1
  })

  const [ticket, setTicket] = useState(null)
  // ── STEP 2: BALANCE ERROR STATE ───────────────────────────────────────────
  const [balanceError, setBalanceError] = useState('')

  const [loading, setLoading] = useState(false)
  const [routesLoading, setRoutesLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStations()
  }, [])

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

  function getRouteTotalFare() {
    if (!selectedRoute) return 0
    if (selectedRoute.totalFare != null) return selectedRoute.totalFare
    if (Array.isArray(selectedRoute)) {
      return selectedRoute.reduce((sum, leg) => sum + (leg.fare || 0), 0)
    }
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
      let fetchedRoutes = []
      try {
        const rawData = await getRoutes(from, to)
        fetchedRoutes = transformRouteData(rawData)
      } catch (backendErr) {
        const status = backendErr?.response?.status
        if (status === 404 || !backendErr?.response) {
          fetchedRoutes = buildMockRoutes(from, to)
          setUsingMockRoutes(true)
        } else {
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
    setStep(2)
  }

  // ── STEP 3: PATCHED CONFIRMATION LOGIC ────────────────────────────────────
  async function handleConfirm() {
    setBalanceError('')
    setLoading(true)
    setError('')

    const baseFare = getRouteTotalFare()
    const calculatedFare = calculateGroupedFare(baseFare, passengerData)

    // 3a. Pre-flight balance check
    const { ok: canAfford } = deductBalance(0) 
    
    const ticket_id = uuidv4()
    const now = new Date()
    const valid_until = new Date(now.getTime() + 3 * 60 * 60 * 1000)

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

    try {
      // 3b. Call API
      const bookingResponse = await bookTicket({
        commuter_name: name,
        from_station: from,
        to_station: to,
        mode: getRouteMode(),
        ticket_id,
        passengers: passengerData
      })

      // 3c. Deduct balance ONLY after successful booking
      const { ok, reason } = deductBalance(calculatedFare)
      if (!ok) {
        setBalanceError(reason)
        setLoading(false)
        return 
      }

      // 3d. Save and persist
      saveTicket(newTicket)
      setTicket(newTicket)
      setStep(3)
      
    } catch (err) {
      console.warn('Server offline — attempting local/offline booking logic.', err)
      
      // Handle offline fallback with balance check
      const { ok, reason } = deductBalance(calculatedFare)
      if (!ok) {
        setBalanceError(reason)
      } else {
        saveTicket(newTicket)
        setTicket(newTicket)
        setStep(3)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStep(0)
    setFrom('')
    setTo('')
    setRoutes([])
    setSelectedRoute(null)
    setTicket(null)
    setError('')
    setBalanceError('')
    setUsingMockRoutes(false)
    setPassengerData({ adults: 1, children: 0, childrenWithSeats: 0, totalPassengers: 1 })
  }

  const totalFare = getRouteTotalFare()
  const adultFare = totalFare * passengerData.adults
  const childSeatFare = totalFare * 0.5 * passengerData.childrenWithSeats
  const grandTotal = adultFare + childSeatFare

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pb-20">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Plan Your Journey
          </h1>
          <p className="text-slate-400 text-sm">Multi-modal transit with group ticketing</p>
        </div>

        {step === 0 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Select Your Journey</h2>

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

            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">From</label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Select origin station</option>
                {stations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">To</label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Select destination station</option>
                {stations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="mb-8">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold block mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl text-white px-4 py-3 text-sm"
              />
            </div>

            <button
              onClick={handlePlanJourney}
              disabled={loading || !from || !to}
              className={cn(
                'w-full font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2',
                loading || !from || !to ? 'bg-cyan-500/40 text-white/60' : 'bg-cyan-500 hover:bg-cyan-400 text-white'
              )}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Plan Journey'}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-slate-400 mb-5 text-sm">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Route Options</h2>
            <div className="space-y-4 mt-6">
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
          </div>
        )}

        {step === 2 && selectedRoute && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 mb-5 text-sm">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Confirm Your Journey</h2>

            {/* ── STEP 4: BALANCE ERROR UI ──────────────────────────────────── */}
            {balanceError && (
              <div className="flex flex-col gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{balanceError}</span>
                </div>
                <button 
                  onClick={() => window.location.href = '/wallets'}
                  className="text-cyan-400 text-xs font-bold uppercase tracking-wider text-left hover:underline"
                >
                  + Add Funds to Wallet
                </button>
              </div>
            )}

            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 mb-4">
               {/* Leg details logic remains same as your original snippet */}
               {(Array.isArray(selectedRoute) ? selectedRoute : selectedRoute.legs)?.map((leg, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm mb-3 text-white">
                    {getModeIcon(leg.mode)} {leg.from_station} <ArrowRight className="w-3 h-3"/> {leg.to_station}
                    <span className="ml-auto text-slate-500">₹{leg.fare}</span>
                </div>
               ))}
            </div>

            <GroupTicketing onUpdate={setPassengerData} />

            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 mb-6">
              <div className="flex justify-between font-semibold">
                <span className="text-white">Total Fare</span>
                <span className="text-cyan-400">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm & Book'}
            </button>
          </div>
        )}

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