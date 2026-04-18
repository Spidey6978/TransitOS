import { QRCode } from 'react-qr-code'
import { CheckCircle2, MapPin, Clock, IndianRupee, Users, Zap, Bus, Car, Bike, Train } from 'lucide-react'
import { cn } from '@/lib/utils'
import { minifyGroupPayload, minifyMultiLegPayload } from '../utils/payloadMinifier'

// Helper function to get mode icon
function getModeIcon(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return <Zap className="w-4 h-4" />
  if (m.includes('bus')) return <Bus className="w-4 h-4" />
  if (m.includes('auto') || m.includes('taxi')) return <Car className="w-4 h-4" />
  if (m.includes('bike')) return <Bike className="w-4 h-4" />
  if (m.includes('train')) return <Train className="w-4 h-4" />
  return <MapPin className="w-4 h-4" />
}

// Helper function to get mode color
function getModeColor(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro')) return 'text-violet-400 border-violet-500/30 bg-violet-500/10'
  if (m.includes('bus')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  if (m.includes('auto') || m.includes('taxi')) return 'text-orange-400 border-orange-500/30 bg-orange-500/10'
  if (m.includes('bike')) return 'text-green-400 border-green-500/30 bg-green-500/10'
  if (m.includes('train')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
}

export default function QRGeneratorGrouped({ ticket, passengerData, onBookAnother }) {
  if (!ticket) return null

  // Build minified QR payload that includes group metadata
  // If ticket has multi-leg data use the V3 minifier, else fall back to V2
  const qrPayload = ticket.qr_payload
    ? ticket.qr_payload
    : ticket.legs && ticket.legs.length > 1
      ? minifyMultiLegPayload(ticket)
      : minifyGroupPayload({
          ticket_id: ticket.ticket_id,
          commuter_name: ticket.commuter_name,
          from_station: ticket.from_station,
          to_station: ticket.to_station,
          mode: ticket.mode,
          issued_at: ticket.issued_at,
          valid_until: ticket.valid_until,
          passengers: passengerData,
          operators: ticket.operators,
          amounts_wei: ticket.amounts_wei,
          polyline: ticket.polyline
        })

  const qrValue = JSON.stringify(qrPayload)

  const isValid = ticket.valid_until ? new Date(ticket.valid_until) > new Date() : true
  const isMultiLeg = ticket.is_multileg || (ticket.legs && ticket.legs.length > 1)

  return (
    <div className="flex flex-col items-center w-full">
      {/* Success banner */}
      <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Booking confirmed! Your ticket is ready for {passengerData.totalPassengers} passenger{passengerData.totalPassengers !== 1 ? 's' : ''}.
      </div>

      {/* Brand */}
      <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase mb-1">
        TransitDost
      </h2>
      <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-3">
        Mumbai Unified Transit
      </p>

      {/* Active badge */}
      <span className={cn(
        "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full mb-6",
        "bg-green-500/10 border border-green-500/30 text-green-400"
      )}>
        <CheckCircle2 className="w-3 h-3" />
        ACTIVE
      </span>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-2xl mb-6 shadow-lg shadow-cyan-500/10">
        <QRCode
          value={qrValue}
          size={200}
          level="H"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Ticket info */}
      <div className="w-full bg-slate-800/60 border border-white/10 rounded-xl p-5 space-y-3 mb-4">
        <div className="flex items-start justify-between gap-4 text-sm">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
            Ticket ID
          </span>
          <span className="text-white font-medium text-right">
            {ticket.ticket_id.split('-')[0].toUpperCase()}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 text-sm">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
            Route
          </span>
          <span className="text-white font-medium text-right flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {ticket.from_station} → {ticket.to_station}
          </span>
        </div>

        {/* FIXED: Display all modes if multi-leg, otherwise single mode */}
        {isMultiLeg ? (
          <div className="flex items-start justify-between gap-4 text-sm border-t border-white/10 pt-3">
            <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
              Modes
            </span>
            <div className="flex flex-col items-end gap-1.5">
              {ticket.legs && ticket.legs.map((leg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'text-[10px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5',
                    getModeColor(leg.mode)
                  )}
                >
                  {getModeIcon(leg.mode)}
                  <span>{leg.mode}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
              Mode
            </span>
            <span className={cn(
              'text-[10px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5',
              getModeColor(ticket.mode)
            )}>
              {getModeIcon(ticket.mode)}
              {ticket.mode}
            </span>
          </div>
        )}

        {/* NEW: Show legs breakdown if multi-leg */}
        {isMultiLeg && ticket.legs && (
          <div className="border-t border-white/10 pt-3">
            <p className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mb-2">
              Journey Legs
            </p>
            <div className="space-y-2">
              {ticket.legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/40 rounded-lg p-2.5 border border-white/5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        leg.status === 'pending' ? 'bg-amber-400' : 'bg-green-400'
                      )} />
                      Leg {idx + 1}
                    </span>
                    {leg.status === 'pending' ? (
                      <span className="text-[9px] tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                        ⏳ PENDING
                      </span>
                    ) : (
                      <span className="text-[9px] tracking-widest text-green-400 border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 rounded">
                        ✓ CONFIRMED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white mb-1">
                    {leg.from} → {leg.to}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{leg.mode}</span>
                    <span className="text-cyan-400 font-semibold">
                      ₹{leg.estimatedFare?.toFixed(0) || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passenger composition */}
        <div className="flex items-start justify-between gap-4 text-sm border-t border-white/10 pt-3">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
            Passengers
          </span>
          <span className="text-white font-medium text-right flex items-center gap-1">
            <Users className="w-3 h-3" />
            {passengerData.adults}A {passengerData.childrenWithSeats}C {passengerData.children}N
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 text-sm">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
            Issued At
          </span>
          <span className="text-white font-medium text-right flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(ticket.issued_at).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 text-sm">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
            Valid Until
          </span>
          <span className="text-white font-medium text-right">
            {new Date(ticket.valid_until).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Total fare if multi-leg */}
        {isMultiLeg && (
          <div className="flex items-start justify-between gap-4 text-sm border-t border-white/10 pt-3 bg-cyan-500/5 -mx-5 -mb-3 px-5 py-3 rounded-b-lg border-l-2 border-l-cyan-500/50">
            <span className="text-[10px] text-cyan-400 tracking-widest uppercase font-semibold">
              Total Fare
            </span>
            <span className="text-lg font-bold text-cyan-400">
              ₹{ticket.fare?.toFixed(2) || '—'}
            </span>
          </div>
        )}
      </div>

      {/* Stored locally notice */}
      <div className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 mb-6">
        <p className="text-[10px] text-slate-500 text-center tracking-wide">
          This ticket is stored locally and works offline. Show to validators on entry & exit.
        </p>
      </div>

      <p className="text-xs text-slate-600 mb-1 text-center">
        All passengers must scan this single QR code
      </p>
      <p className="text-[10px] text-slate-700 tracking-widest uppercase mb-6 text-center">
        {isMultiLeg
          ? `Multi-Leg Journey · ${ticket.legs?.length || 1} Leg${ticket.legs?.length !== 1 ? 's' : ''} · ${passengerData.totalPassengers} Passenger${passengerData.totalPassengers !== 1 ? 's' : ''}`
          : `One ID · One Ticket · ${passengerData.totalPassengers} Passenger${passengerData.totalPassengers !== 1 ? 's' : ''}`
        }
      </p>

      {/* Book another */}
      {onBookAnother && (
        <button
          onClick={onBookAnother}
          className={cn(
            "w-full border border-white/10 text-slate-400",
            "hover:text-white hover:border-white/20",
            "text-sm font-medium py-3 rounded-xl transition-colors"
          )}
        >
          Book Another Trip
        </button>
      )}
    </div>
  )
}