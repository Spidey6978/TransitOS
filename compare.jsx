import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Wallet, Train, Bus, Zap, Anchor,
  QrCode, X, CheckCircle2, MapPin, Clock,
  Plus, Send, CreditCard, RefreshCw
} from 'lucide-react'
import QRCode from 'react-qr-code'

// ─── helpers ─────────────────────────────────────────────────────────────────

function getModeIcon(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail')) return <Zap    className="w-3.5 h-3.5" />
  if (m.includes('bus')   || m.includes('uber'))     return <Bus    className="w-3.5 h-3.5" />
  if (m.includes('ferry'))                            return <Anchor className="w-3.5 h-3.5" />
  return <Train className="w-3.5 h-3.5" />
}

function getModeLabel(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail')) return 'METRO'
  if (m.includes('bus')   || m.includes('uber'))     return 'BUS'
  if (m.includes('ferry'))                            return 'FERRY'
  return 'RAIL'
}

function getModeColors(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail'))
    return { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30' }
  if (m.includes('bus') || m.includes('uber'))
    return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' }
  if (m.includes('ferry'))
    return { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30' }
  return { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function shortId(ticket_id = '') {
  return 'TKT-' + ticket_id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function loadTickets() {
  try { return JSON.parse(localStorage.getItem('transitos_tickets') || '[]') }
  catch { return [] }
}

// ─── Add Money Modal ──────────────────────────────────────────────────────────

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000]

function AddMoneyModal({ onClose, onAdd }) {
  const [input,    setInput]    = useState('')
  const [selected, setSelected] = useState(null)
  const [success,  setSuccess]  = useState(false)

  const parsed  = parseFloat(input)
  const amount  = selected !== null ? selected : (!isNaN(parsed) ? parsed : 0)
  const isValid = amount > 0 && amount <= 100000

  function handleQuickPick(val) {
    setSelected(val)
    setInput(String(val))
  }

  function handleInputChange(e) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setInput(raw)
    setSelected(null)
  }

  function handleClear() {
    setInput('')
    setSelected(null)
  }

  function handleConfirm() {
    if (!isValid) return
    setSuccess(true)
    setTimeout(() => { onAdd(amount); onClose() }, 900)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: '#0F172A' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#22D3EE]" /> Add Money
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Choose a preset or enter a custom amount</p>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 mb-4 transition-colors"
          style={{
            background: 'rgba(30,41,59,0.7)',
            borderColor: input && selected === null ? '#0EA5E9' : 'rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-[#22D3EE] text-lg font-bold">₹</span>
          <input
            autoFocus
            type="number"
            min="1"
            max="100000"
            placeholder="Enter amount"
            value={input}
            onChange={handleInputChange}
            className="flex-1 bg-transparent text-white text-xl font-bold outline-none placeholder:text-slate-600
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {input && (
            <button onClick={handleClear} className="text-slate-600 hover:text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2">Quick Add</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {QUICK_AMOUNTS.map(val => (
            <button
              key={val}
              onClick={() => handleQuickPick(val)}
              className={cn(
                'py-2.5 rounded-xl text-sm font-bold border transition-all duration-150',
                selected === val
                  ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white shadow-lg shadow-[#0EA5E9]/30'
                  : 'bg-transparent border-white/10 text-slate-300 hover:border-[#0EA5E9]/40 hover:text-white',
              )}
            >
              ₹{val >= 1000 ? `${val / 1000}K` : val}
            </button>
          ))}
        </div>

        {isValid && (
          <div
            className="flex justify-between items-center rounded-xl px-4 py-3 mb-4 border border-green-500/20"
            style={{ background: 'rgba(74,222,128,0.06)' }}
          >
            <span className="text-xs text-slate-400">Adding to wallet</span>
            <span className="text-base font-bold text-[#4ADE80]">+₹{amount.toFixed(2)}</span>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className={cn(
            'w-full font-bold py-3.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2',
            success
              ? 'bg-[#4ADE80] text-[#0F172A]'
              : isValid
                ? 'bg-[#0EA5E9] hover:bg-[#22D3EE] text-white shadow-lg shadow-[#0EA5E9]/25'
                : 'bg-white/5 text-slate-600 cursor-not-allowed',
          )}
        >
          {success ? (
            <><CheckCircle2 className="w-4 h-4" /> Money Added!</>
          ) : (
            <>Add {isValid ? `₹${amount.toFixed(2)}` : 'Money'}</>
          )}
        </button>

        <p className="text-[10px] text-slate-700 text-center mt-3 tracking-wide">
          Max ₹1,00,000 per transaction
        </p>
      </div>
    </div>
  )
}

// ─── QR / Ticket Modal ────────────────────────────────────────────────────────

function TicketModal({ ticket, onClose }) {
  if (!ticket) return null

  const qrValue = JSON.stringify({
    ticket_id:     ticket.ticket_id,
    commuter_name: ticket.commuter_name,
    from_station:  ticket.from_station,
    to_station:    ticket.to_station,
    mode:          ticket.mode,
    issued_at:     ticket.issued_at,
  })

  const isValid = ticket.valid_until ? new Date(ticket.valid_until) > new Date() : true

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: '#0F172A' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-5">
          <h2 className="text-lg font-bold tracking-widest uppercase text-[#22D3EE]">TransitOS</h2>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase">Mumbai Unified Transit</p>
          <span className={cn(
            'mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border',
            isValid
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          )}>
            <CheckCircle2 className="w-3 h-3" />
            {isValid ? 'ACTIVE' : 'EXPIRED'}
          </span>
        </div>

        <div className="flex justify-center mb-5">
          <div className="bg-white p-3 rounded-xl shadow-lg shadow-cyan-500/10">
            <QRCode value={qrValue} size={180} level="H" bgColor="#ffffff" fgColor="#000000" />
          </div>
        </div>

        <div
          className="rounded-xl border border-white/10 p-4 space-y-2.5 mb-3"
          style={{ background: 'rgba(30,41,59,0.6)' }}
        >
          {[
            { label: 'Ticket ID',   value: shortId(ticket.ticket_id) },
            { label: 'Route',       value: `${ticket.from_station} → ${ticket.to_station}`, icon: <MapPin className="w-3 h-3" /> },
            { label: 'Mode',        value: ticket.mode },
            { label: 'Issued At',   value: formatDate(ticket.issued_at), icon: <Clock className="w-3 h-3" /> },
            { label: 'Valid Until', value: formatDate(ticket.valid_until) },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-start justify-between gap-4 text-sm">
              <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">{label}</span>
              <span className="text-white font-medium text-right flex items-center gap-1">{icon}{value}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-600 text-center tracking-wide">
          Show this QR code to validators during your journey
        </p>
        <p className="text-[10px] text-slate-700 tracking-widest uppercase text-center mt-1">
          One ID · One Ticket · Any Mode
        </p>
      </div>
    </div>
  )
}

function TxRow({ ticket, onViewQR }) {
  const { bg, text, border } = getModeColors(ticket.mode)
  const label = getModeLabel(ticket.mode)

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-default">
      <span className={cn('text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1', bg, text, border)}>
        {getModeIcon(ticket.mode)}
        {label}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 truncate">{shortId(ticket.ticket_id)}</p>
        <p className="text-sm text-white font-medium truncate leading-tight">
          {ticket.from_station} → {ticket.to_station}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(ticket.issued_at)}</p>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-[#F43F5E]">
          −₹{Number(ticket.fare || 0).toFixed(2)}
        </span>
        <button
          onClick={() => onViewQR(ticket)}
          className="flex items-center gap-1 text-[10px] text-[#0EA5E9] border border-[#0EA5E9]/30 rounded-lg px-2 py-0.5 hover:bg-[#0EA5E9]/10 transition-colors"
        >
          <QrCode className="w-3 h-3" />
          Ticket
        </button>
      </div>
    </div>
  )
}

export default function WalletPage() {
  const [tickets,        setTickets]        = useState([])
  const [balance,        setBalance]        = useState(0)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [refreshing,     setRefreshing]     = useState(false)
  const [showAddMoney,   setShowAddMoney]   = useState(false)

  useEffect(() => { 
    setTickets(loadTickets());
    const savedBalance = localStorage.getItem('transitos_balance');
    if (savedBalance === null) {
      localStorage.setItem('transitos_balance', '1000.00');
      setBalance(1000.00);
    } else {
      setBalance(parseFloat(savedBalance));
    }
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => { 
      setTickets(loadTickets());
      const savedBalance = localStorage.getItem('transitos_balance');
      setBalance(parseFloat(savedBalance || '0'));
      setRefreshing(false);
    }, 600)
  }

  function handleAddMoney(amount) {
    const newBalance = parseFloat((balance + amount).toFixed(2));
    setBalance(newBalance);
    localStorage.setItem('transitos_balance', newBalance.toString());
  }

  const totalSpent = tickets.reduce((s, t) => s + Number(t.fare || 0), 0)

  return (
    <>
      {showAddMoney && (
        <AddMoneyModal onClose={() => setShowAddMoney(false)} onAdd={handleAddMoney} />
      )}
      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      <div className="min-h-screen" style={{ background: '#0F172A', fontFamily: "'Space Mono', monospace" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-[#0EA5E9] font-bold tracking-widest text-base">TransitOS</span>
          <button onClick={handleRefresh} className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>

        <div className="px-5 pt-3 pb-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#22D3EE]" /> Wallet
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your balance and view transaction history</p>
        </div>

        <div className="px-5 mt-4">
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)' }}
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-white/5" />

            <p className="text-[10px] tracking-widest uppercase text-white/70 mb-1 relative z-10">
              Available Balance
            </p>
            <div className="flex items-center gap-2 relative z-10">
              <CreditCard className="w-5 h-5 text-white/80" />
              <span className="text-4xl font-bold text-white tracking-tight">
                ₹{balance.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-3 mt-4 relative z-10">
              <button
                onClick={() => setShowAddMoney(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Money
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                <Send className="w-4 h-4" /> Send Money
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 mt-4">
          <div className="rounded-xl p-4 border border-white/5" style={{ background: 'rgba(30,41,59,0.6)' }}>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Total Trips</p>
            <p className="text-2xl font-bold text-white">{tickets.length}</p>
          </div>
          <div className="rounded-xl p-4 border border-white/5" style={{ background: 'rgba(30,41,59,0.6)' }}>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-[#F43F5E]">₹{totalSpent.toFixed(2)}</p>
          </div>
        </div>

        <div className="px-5 mt-6 pb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">Transaction History</h2>
            <span className="text-[10px] text-slate-500 tracking-widest">
              {tickets.length} transaction{tickets.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(15,23,42,0.8)' }}>
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <Wallet className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">No transactions yet</p>
                <p className="text-slate-700 text-xs mt-1">Book a trip to see it here</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <TxRow key={ticket.ticket_id} ticket={ticket} onViewQR={setSelectedTicket} />
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
      `}</style>
    </>
  )
}