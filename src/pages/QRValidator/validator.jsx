import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  QrCode, CheckCircle2, XCircle, MapPin, Clock,
  Wifi, WifiOff, Zap, Loader2,
  Train, Bus, Anchor, AlertCircle,
  Hash, Trash2,
  Users, User, LogOut
} from 'lucide-react'
import { validateTicketById } from '../../service/api'
import { loadTickets } from '@/lib/walletstore'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getModeIcon(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail')) return <Zap    className="w-3 h-3" />
  if (m.includes('bus')   || m.includes('uber'))     return <Bus    className="w-3 h-3" />
  if (m.includes('ferry'))                            return <Anchor className="w-3 h-3" />
  return <Train className="w-3 h-3" />
}

function shortId(id = '') {
  return '#' + String(id).replace(/-/g, '').slice(0, 8).toUpperCase()
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function normalizeParsed(raw) {
  if (!raw) return null
  return {
    ticket_id:     raw.ticket_id    || raw.hash          || '—',
    commuter_name: raw.commuter_name                     || 'Unknown',
    from_station:  raw.from_station || raw.start_station || '—',
    to_station:    raw.to_station   || raw.end_station   || '—',
    mode:          raw.mode                              || 'Unknown',
    fare:          raw.fare         || raw.total_fare    || 0,
    issued_at:     raw.issued_at    || raw.timestamp     || null,
    valid_until:   raw.valid_until                       || null,
  }
}

// ── A history entry is "real" only if it has genuine parsed ticket data ──
function isValidHistoryEntry(entry) {
  if (!entry) return false
  const p = entry.parsed
  if (!p) return false
  // Must have a real commuter name (not Unknown) and real stations (not —)
  if (p.commuter_name === 'Unknown' && p.from_station === '—' && p.to_station === '—') return false
  if (p.mode === 'Unknown' || !p.mode) return false
  return true
}

function validateTicketData(data) {
  try {
    const raw = JSON.parse(data)
    const parsed = normalizeParsed(raw)
    if (!parsed.ticket_id || !parsed.from_station || !parsed.to_station || !parsed.mode) {
      return { valid: false, reason: 'Malformed ticket data', parsed }
    }
    if (raw.valid_until && new Date(raw.valid_until) < new Date()) {
      return { valid: false, reason: 'Ticket expired', parsed }
    }
    return { valid: true, reason: 'Ticket verified on-chain', parsed }
  } catch {
    return { valid: false, reason: 'Invalid QR format', parsed: null }
  }
}

function lookupLocalTicket(ticket_id) {
  const tickets = loadTickets()
  const q = ticket_id.trim().toLowerCase()
  const found = tickets.find(t =>
    t.ticket_id?.toLowerCase() === q ||
    t.ticket_id?.replace(/-/g, '').slice(0, 8).toUpperCase() === q.toUpperCase()
  )
  if (!found) return null
  const parsed = normalizeParsed(found)
  if (found.valid_until && new Date(found.valid_until) < new Date()) {
    return { valid: false, reason: 'Ticket expired (offline check)', parsed }
  }
  return { valid: true, reason: 'Verified via Local Cache (Offline)', parsed }
}

function getValidationHistory() {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('validationHistory')
    if (!stored) return []
    const all = JSON.parse(stored)
    // Filter out any corrupted / mock entries that have no real parsed data
    return all.filter(isValidHistoryEntry)
  } catch {
    return []
  }
}

function clearValidationHistory() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('validationHistory')
  }
}

function addToValidationHistory(result, validatorId, validatorZone) {
  if (typeof window === 'undefined') return
  // Don't persist entries with no real parsed data
  if (!isValidHistoryEntry({ parsed: result.parsed })) return
  const history = getValidationHistory()
  const entry = {
    id:            crypto.randomUUID(),
    ticket_id:     result.parsed.ticket_id,
    commuter_name: result.parsed.commuter_name,
    valid:         result.valid,
    reason:        result.reason,
    validatorId,
    validatorZone,
    scannedAt:     new Date().toISOString(),
    fare:          result.parsed.fare || 0,
    from_station:  result.parsed.from_station,
    to_station:    result.parsed.to_station,
    mode:          result.parsed.mode,
    parsed:        result.parsed,
    source:        result.source,
  }
  history.unshift(entry)
  if (history.length > 500) history.pop()
  localStorage.setItem('validationHistory', JSON.stringify(history))
  return entry
}

function isTicketDuplicate(ticketId) {
  const history = getValidationHistory()
  const normalizedId = ticketId.trim().toLowerCase()
  return history.some(entry =>
    entry.ticket_id?.toLowerCase() === normalizedId ||
    entry.ticket_id?.replace(/-/g, '').slice(0, 8).toUpperCase() === normalizedId.toUpperCase()
  )
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QRScanner({ onScan, isActive }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const [camError, setCamError] = useState('')
  const [scanning, setScanning] = useState(false)

  const isMobile = /Mobi|Android/i.test(navigator.userAgent)

  const startCamera = useCallback(async () => {
    setCamError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isMobile
          ? { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setScanning(true) }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setScanning(true) }
      } catch {
        setCamError('Camera access denied. Allow camera permissions or use manual entry below.')
      }
    }
  }, [isMobile])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setScanning(false)
  }, [])

  useEffect(() => {
    if (!isActive) { stopCamera(); return }
    startCamera()
    return () => stopCamera()
  }, [isActive, startCamera, stopCamera])

  useEffect(() => {
    if (!scanning || !videoRef.current || !('BarcodeDetector' in window)) return
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let active = true
    const detect = async () => {
      if (!active || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length > 0) { onScan(codes[0].rawValue); return }
      } catch {}
      rafRef.current = requestAnimationFrame(detect)
    }
    rafRef.current = requestAnimationFrame(detect)
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [scanning, onScan])

  if (camError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center px-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-rose-400 text-sm">{camError}</p>
        <p className="text-slate-500 text-xs">Use Manual Entry to validate tickets</p>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-48 h-48">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-md" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-md" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-md" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-md" />
          <div className="absolute inset-x-0 top-0" style={{ animation: 'scanLine 2s linear infinite' }}>
            <div className="h-0.5 bg-cyan-400/80 shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-center text-xs text-slate-300 tracking-wide">
          {scanning ? 'Camera live — position QR code in frame' : 'Starting camera…'}
        </p>
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result, validatorId }) {
  const { valid, reason, parsed, source } = result
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all duration-300',
      valid ? 'bg-green-500/5 border-green-500/25' : 'bg-rose-500/5 border-rose-500/25'
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {valid
            ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            : <XCircle      className="w-5 h-5 text-rose-400 shrink-0" />
          }
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {parsed?.commuter_name || 'Unknown'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: valid ? '#4ADE80' : '#F87171' }}>
              {valid ? 'Valid Ticket' : 'Invalid Ticket'} · {reason}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            'text-[9px] tracking-widest font-bold px-2 py-1 rounded-md border shrink-0 flex items-center gap-1',
            valid
              ? 'bg-green-500/15 text-green-400 border-green-500/30'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
          )}>
            {getModeIcon(parsed?.mode || '')}
            {(parsed?.mode || 'UNKNOWN').split(' ')[0].toUpperCase()}
          </span>
          {source && (
            <span className="text-[8px] text-slate-600 tracking-wider uppercase">{source}</span>
          )}
        </div>
      </div>

      {parsed && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400 mt-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-[9px] tracking-widest text-slate-600 uppercase mb-0.5">Ticket ID</p>
            <p className="text-slate-300 font-mono">{shortId(parsed.ticket_id)}</p>
          </div>
          <div>
            <p className="text-[9px] tracking-widest text-slate-600 uppercase mb-0.5">Route</p>
            <p className="text-slate-300 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              {parsed.from_station} → {parsed.to_station}
            </p>
          </div>
          <div>
            <p className="text-[9px] tracking-widest text-slate-600 uppercase mb-0.5">Fare</p>
            <p className="text-slate-300">₹{Number(parsed.fare || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] tracking-widest text-slate-600 uppercase mb-0.5">Validator</p>
            <p className="text-slate-300 font-mono text-[10px]">{validatorId}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[9px] tracking-widest text-slate-600 uppercase mb-0.5">Scanned At</p>
            <p className="text-slate-300 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              {formatTime(result.scannedAt || new Date().toISOString())}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Single Manual Entry ──────────────────────────────────────────────────────
function SingleManualEntry({ online, validatorId, validatorZone, onResult, onBack }) {
  const [ticketId, setTicketId] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleValidate() {
    const id = ticketId.trim()
    if (!id) { setError('Please enter a Ticket ID'); return }

    if (isTicketDuplicate(id)) {
      setError('⚠️ This ticket has already been validated.')
      return
    }

    setError('')
    setLoading(true)

    let result
    if (online) {
      try {
        const data = await validateTicketById(id)
        const parsed = normalizeParsed(data.parsed || data)
        result = {
          valid:       data.valid,
          reason:      data.reason,
          parsed,
          scannedAt:   new Date().toISOString(),
          validatorId,
          source:      'Ledger',
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          const local = lookupLocalTicket(id)
          result = local
            ? { ...local, scannedAt: new Date().toISOString(), validatorId, source: 'Local Cache' }
            : { valid: false, reason: 'Not found', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Not Found' }
        } else {
          result = { valid: false, reason: 'Server error', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Error' }
        }
      }
    } else {
      const local = lookupLocalTicket(id)
      result = local
        ? { ...local, scannedAt: new Date().toISOString(), validatorId, source: 'Offline Cache' }
        : { valid: false, reason: 'Offline: Not found', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Offline' }
    }

    setLoading(false)
    addToValidationHistory(result, validatorId, validatorZone)
    setTicketId('')
    onResult(result)
  }

  return (
    <div className="px-4 pt-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
        ← Back
      </button>
      <div className="flex items-center gap-2 mb-1">
        <User className="w-5 h-5 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">Manual Entry</h1>
      </div>
      <p className="text-slate-400 text-xs mb-6">Enter a single passenger's Ticket ID to validate</p>
      <div className="flex items-center gap-3 rounded-xl border px-4 py-3.5 mb-3 bg-slate-800/70 border-white/10">
        <Hash className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          autoFocus
          type="text"
          value={ticketId}
          onChange={e => { setTicketId(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleValidate()}
          placeholder="e.g. a1b2c3d4..."
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 font-mono"
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl px-3 py-2.5 mb-4">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}
      <button
        onClick={handleValidate}
        disabled={loading || !ticketId.trim()}
        className={cn(
          'w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2',
          loading || !ticketId.trim() ? 'bg-white/5 text-slate-600' : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20'
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Validate Ticket
      </button>
    </div>
  )
}

// ─── Bulk Manual Entry ────────────────────────────────────────────────────────
function BulkManualEntry({ online, validatorId, validatorZone, onBulkResults, onBack }) {
  const [rows,        setRows]        = useState([{ id: crypto.randomUUID(), value: '' }])
  const [loading,     setLoading]     = useState(false)
  const [progress,    setProgress]    = useState(null)
  const [bulkResults, setBulkResults] = useState([])

  function addRow()             { setRows(prev => [...prev, { id: crypto.randomUUID(), value: '' }]) }
  function removeRow(id)        { setRows(prev => prev.length === 1 ? prev : prev.filter(r => r.id !== id)) }
  function updateRow(id, value) { setRows(prev => prev.map(r => r.id === id ? { ...r, value } : r)) }

  async function handleValidateAll() {
    const ids = rows.map(r => r.value.trim()).filter(Boolean)
    if (!ids.length) return

    setLoading(true)
    setBulkResults([])
    setProgress({ done: 0, total: ids.length })

    const batchResults = []
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      let result

      if (isTicketDuplicate(id)) {
        result = { valid: false, reason: 'Duplicate', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Local', inputId: id }
      } else if (online) {
        try {
          const data = await validateTicketById(id)
          result = { valid: data.valid, reason: data.reason, parsed: normalizeParsed(data.parsed || data), scannedAt: new Date().toISOString(), validatorId, source: 'Ledger', inputId: id }
        } catch {
          result = { valid: false, reason: 'Error', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Error', inputId: id }
        }
      } else {
        const local = lookupLocalTicket(id)
        result = local
          ? { ...local, scannedAt: new Date().toISOString(), validatorId, source: 'Offline', inputId: id }
          : { valid: false, reason: 'Not found', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Offline', inputId: id }
      }

      batchResults.push(result)
      addToValidationHistory(result, validatorId, validatorZone)
      setProgress({ done: i + 1, total: ids.length })
      await new Promise(r => setTimeout(r, 100))
    }

    setBulkResults(batchResults)
    setLoading(false)
    setRows([{ id: crypto.randomUUID(), value: '' }])
    onBulkResults(batchResults)
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <button onClick={onBack} className="text-slate-400 text-sm mb-4">← Back</button>
      <h1 className="text-2xl font-bold text-white mb-5">Bulk Entry</h1>
      <div className="space-y-2 mb-5">
        {rows.map((row, idx) => (
          <div key={row.id} className="flex items-center gap-2">
            <input
              type="text"
              value={row.value}
              onChange={e => updateRow(row.id, e.target.value)}
              placeholder={`Ticket ID ${idx + 1}`}
              className="flex-1 bg-slate-800/70 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-mono"
            />
            <button onClick={() => removeRow(row.id)} className="text-slate-600 hover:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="text-cyan-400 text-xs mb-6">+ Add ticket</button>
      {loading && progress && (
        <div className="mb-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      )}
      <button
        onClick={handleValidateAll}
        disabled={loading}
        className="w-full bg-cyan-500 text-white font-bold py-3.5 rounded-xl text-sm"
      >
        {loading ? 'Validating...' : 'Validate Tickets'}
      </button>
      {bulkResults.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-white font-bold text-sm border-b border-white/5 pb-2">Batch Results</h2>
          {bulkResults.map((r, i) => <ResultCard key={i} result={r} validatorId={validatorId} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ValidatorPage() {
  const [screen,     setScreen]     = useState('idle')
  const [online,     setOnline]     = useState(true)
  const [flash,      setFlash]      = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [scanActive, setScanActive] = useState(false)
  const [results,    setResults]    = useState([])

  const validatorId   = "GATE-01"
  const validatorZone = "Main Terminal"

  // On mount: load history but strip any corrupted/mock entries automatically
  useEffect(() => {
    const clean = getValidationHistory()
    // Rewrite localStorage with only valid entries so stale data is purged
    if (typeof window !== 'undefined') {
      localStorage.setItem('validationHistory', JSON.stringify(clean))
    }
    setResults(clean)
  }, [])

  function handleLogout() {
    clearValidationHistory()
    setResults([])
    setLastResult(null)
    setFlash(null)
    setScreen('idle')
    setScanActive(false)
  }

  const handleScan = useCallback((rawValue) => {
    setScanActive(false)
    const result = validateTicketData(rawValue)
    result.scannedAt   = new Date().toISOString()
    result.validatorId = validatorId
    result.source      = 'QR Scan'

    if (result.parsed?.ticket_id && isTicketDuplicate(result.parsed.ticket_id)) {
      result.valid  = false
      result.reason = '⚠️ DUPLICATE: Already scanned'
    } else {
      addToValidationHistory(result, validatorId, validatorZone)
    }

    setFlash(result.valid ? 'valid' : 'invalid')
    setLastResult(result)
    setResults(getValidationHistory())
    setScreen('result')
    setTimeout(() => setFlash(null), 800)
  }, [])

  const handleStartScanner = () => {
    setScanActive(true)
    setLastResult(null)
    setScreen('scanning')
  }

  function handleManualResult(result) {
    setFlash(result.valid ? 'valid' : 'invalid')
    setLastResult(result)
    setResults(getValidationHistory())
    setScreen('result')
    setTimeout(() => setFlash(null), 800)
  }

  function handleBulkResults() {
    setResults(getValidationHistory())
  }

  return (
    <div className="min-h-screen pb-20 relative bg-[#070E1A] font-mono">
      {flash && (
        <div className={cn(
          'fixed inset-0 z-50 pointer-events-none',
          flash === 'valid' ? 'bg-green-400/20' : 'bg-rose-500/20'
        )} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <span className="text-cyan-400 font-bold tracking-widest text-sm">TransitDost Validator</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnline(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border',
              online ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-slate-500 border-white/10'
            )}
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </div>
      </div>

      {/* Idle Screen */}
      {screen === 'idle' && (
        <div className="px-4 pt-6">
          <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6 mb-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl border-2 border-cyan-400/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <QrCode className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-white font-bold mb-1">Ready to Scan</h2>
            <p className="text-slate-500 text-xs mb-6">Point camera at passenger ticket</p>
            <button
              onClick={handleStartScanner}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              Start Scanner
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              onClick={() => setScreen('manual_single')}
              className="bg-slate-800/40 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2"
            >
              <User className="text-cyan-400 w-5 h-5" />
              <span className="text-white text-xs font-bold">Single Entry</span>
            </button>
            <button
              onClick={() => setScreen('manual_bulk')}
              className="bg-slate-800/40 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2"
            >
              <Users className="text-cyan-400 w-5 h-5" />
              <span className="text-white text-xs font-bold">Bulk Entry</span>
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">Validation History</h3>
                <span className="text-[10px] text-slate-500">{results.length} total</span>
              </div>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <ResultCard key={r.id || i} result={r} validatorId={validatorId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanning Screen */}
      {screen === 'scanning' && (
        <div className="px-4 pt-6">
          <button onClick={() => setScreen('idle')} className="text-slate-400 text-sm mb-4">← Back</button>
          <QRScanner onScan={handleScan} isActive={scanActive} />
        </div>
      )}

      {/* Result Screen */}
      {screen === 'result' && lastResult && (
        <div className="px-4 pt-6">
          <div className={cn(
            'rounded-2xl p-8 flex flex-col items-center mb-6 border',
            lastResult.valid ? 'bg-green-500/10 border-green-500/20' : 'bg-rose-500/10 border-rose-500/20'
          )}>
            {lastResult.valid
              ? <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
              : <XCircle      className="w-16 h-16 text-rose-400 mb-4" />
            }
            <h2 className="text-2xl font-bold text-white mb-2">
              {lastResult.valid ? 'Ticket validated' : 'TIcket invalid'}
            </h2>
            <p className="text-slate-400 text-sm">{lastResult.reason}</p>
          </div>
          <ResultCard result={lastResult} validatorId={validatorId} />
          <button
            onClick={() => setScreen('idle')}
            className="w-full mt-6 bg-cyan-500 text-white font-bold py-3.5 rounded-xl"
          >
            Scan Another
          </button>
        </div>
      )}

      {screen === 'manual_single' && (
        <SingleManualEntry
          online={online} validatorId={validatorId} validatorZone={validatorZone}
          onResult={handleManualResult} onBack={() => setScreen('idle')}
        />
      )}
      {screen === 'manual_bulk' && (
        <BulkManualEntry
          online={online} validatorId={validatorId} validatorZone={validatorZone}
          onBulkResults={handleBulkResults} onBack={() => setScreen('idle')}
        />
      )}

      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(0);     opacity: 0; }
          50%  {                               opacity: 1; }
          100% { transform: translateY(192px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}