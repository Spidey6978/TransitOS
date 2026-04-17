import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  QrCode, CheckCircle2, XCircle, MapPin, Clock,
  Wifi, WifiOff, ChevronDown, RotateCcw, Zap,
  Train, Bus, Anchor, AlertCircle, Shield, ScanLine,
  IndianRupee, User, Hash, Navigation
} from 'lucide-react'

// ─── Mock validator config ────────────────────────────────────────────────────
const VALIDATOR_ID   = 'BUS-340-GHATKOPAR'
const VALIDATOR_ZONE = 'Ghatkopar — Eastern Express Highway'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getModeIcon(mode = '') {
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail')) return <Zap    className="w-3 h-3" />
  if (m.includes('bus')   || m.includes('uber'))     return <Bus    className="w-3 h-3" />
  if (m.includes('ferry'))                            return <Anchor className="w-3 h-3" />
  return <Train className="w-3 h-3" />
}

function shortId(id = '') {
  return '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function validateTicketData(data) {
  try {
    const parsed = JSON.parse(data)
    if (!parsed.ticket_id || !parsed.from_station || !parsed.to_station || !parsed.mode) {
      return { valid: false, reason: 'Malformed ticket data', parsed }
    }
    if (parsed.valid_until && new Date(parsed.valid_until) < new Date()) {
      return { valid: false, reason: 'Ticket expired', parsed }
    }
    return { valid: true, reason: 'Ticket verified on-chain', parsed }
  } catch {
    return { valid: false, reason: 'Invalid QR format', parsed: null }
  }
}

// ─── Simulated QR data ────────────────────────────────────────────────────────
const MOCK_VALID = JSON.stringify({
  ticket_id:     'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  commuter_name: 'Rahul Sharma',
  from_station:  'Andheri',
  to_station:    'CST',
  mode:          'Local Train',
  fare:          47.50,
  issued_at:     new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  valid_until:   new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
})

const MOCK_INVALID = JSON.stringify({
  ticket_id:     'EXPIRED123',
  commuter_name: 'Unknown',
  from_station:  'Central',
  to_station:    'Airport',
  mode:          'Metro',
  fare:          45,
  issued_at:     '2024-03-11T10:38:00Z',
  valid_until:   '2024-03-11T13:38:00Z',
})

// ─── QR Scanner component ─────────────────────────────────────────────────────
function QRScanner({ onScan, isActive }) {
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const rafRef     = useRef(null)
  const [camError, setCamError] = useState('')
  const [scanning, setScanning] = useState(false)

  const isMobile = /Mobi|Android/i.test(navigator.userAgent)

  const startCamera = useCallback(async () => {
    setCamError('')
    try {
      const constraints = {
        video: isMobile
          ? { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
      }
    } catch (err) {
      // fallback: try without exact facingMode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setScanning(true)
        }
      } catch {
        setCamError('Camera access denied. Please allow camera permissions.')
      }
    }
  }, [isMobile])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setScanning(false)
  }, [])

  // Try to use BarcodeDetector API
  useEffect(() => {
    if (!isActive) { stopCamera(); return }
    startCamera()
    return () => stopCamera()
  }, [isActive, startCamera, stopCamera])

  // Poll BarcodeDetector if available
  useEffect(() => {
    if (!scanning || !videoRef.current) return
    if (!('BarcodeDetector' in window)) return

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let active = true

    const detect = async () => {
      if (!active || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length > 0) {
          onScan(codes[0].rawValue)
          return
        }
      } catch {}
      rafRef.current = requestAnimationFrame(detect)
    }
    rafRef.current = requestAnimationFrame(detect)

    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [scanning, onScan])

  if (camError) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-rose-400 text-sm">{camError}</p>
        <p className="text-slate-500 text-xs">Use the Simulate buttons below to test</p>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      {/* Scan overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Corner brackets */}
        <div className="relative w-48 h-48">
          {/* TL */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-md" />
          {/* TR */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-md" />
          {/* BL */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-md" />
          {/* BR */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-md" />
          {/* Scan line */}
          <div className="absolute inset-x-0 top-0" style={{ animation: 'scanLine 2s linear infinite' }}>
            <div className="h-0.5 bg-cyan-400/80 shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]" />
          </div>
        </div>
      </div>
      {/* Bottom label */}
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
  const { valid, reason, parsed } = result
  const isValid = valid

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all duration-300',
      isValid
        ? 'bg-green-500/5 border-green-500/25'
        : 'bg-rose-500/5 border-rose-500/25'
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isValid
            ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            : <XCircle      className="w-5 h-5 text-rose-400 shrink-0" />
          }
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {parsed?.commuter_name || 'Unknown'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: isValid ? '#4ADE80' : '#F87171' }}>
              {isValid ? 'Valid Ticket' : 'Invalid Ticket'} · {reason}
            </p>
          </div>
        </div>
        <span className={cn(
          'text-[9px] tracking-widest font-bold px-2 py-1 rounded-md border shrink-0 flex items-center gap-1',
          isValid
            ? 'bg-green-500/15 text-green-400 border-green-500/30'
            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        )}>
          {getModeIcon(parsed?.mode || '')}
          {(parsed?.mode || 'UNKNOWN').split(' ')[0].toUpperCase()}
        </span>
      </div>

      {/* Details grid */}
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
              {formatTime(new Date().toISOString())}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsBar({ results }) {
  const validCount   = results.filter(r => r.valid).length
  const invalidCount = results.filter(r => !r.valid).length
  const revenue      = results.filter(r => r.valid).reduce((s, r) => s + Number(r.parsed?.fare || 0), 0)

  return (
    <div className="grid grid-cols-3 gap-2 px-4 mt-4">
      {[
        { label: 'Valid Tickets',   value: validCount,            color: 'text-green-400' },
        { label: 'Invalid Tickets', value: invalidCount,          color: 'text-rose-400'  },
        { label: 'Total Revenue',   value: `₹${revenue.toFixed(2)}`, color: 'text-cyan-400' },
      ].map(({ label, value, color }) => (
        <div key={label} className="rounded-xl p-3 border border-white/5 bg-slate-800/50 text-center">
          <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">{label}</p>
          <p className={cn('text-lg font-bold', color)}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ValidatorPage() {
  const [screen,    setScreen]    = useState('idle')   // idle | scanning | result
  const [online,    setOnline]    = useState(true)
  const [flash,     setFlash]     = useState(null)     // 'valid' | 'invalid' | null
  const [results,   setResults]   = useState([])
  const [lastResult, setLastResult] = useState(null)
  const [scanActive, setScanActive] = useState(false)

  const handleScan = useCallback((rawValue) => {
    setScanActive(false)
    const result = validateTicketData(rawValue)
    result.scannedAt = new Date().toISOString()
    result.validatorId = VALIDATOR_ID

    setFlash(result.valid ? 'valid' : 'invalid')
    setLastResult(result)
    setResults(prev => [result, ...prev])
    setScreen('result')

    setTimeout(() => setFlash(null), 800)
  }, [])

  const handleStartScanner = () => {
    setScreen('scanning')
    setScanActive(true)
    setLastResult(null)
  }

  const handleRescan = () => {
    setScreen('scanning')
    setScanActive(true)
    setLastResult(null)
  }

  const handleSimulate = (type) => {
    handleScan(type === 'valid' ? MOCK_VALID : MOCK_INVALID)
  }

  return (
    <div
      className="min-h-screen pb-20 relative"
      style={{ background: '#070E1A', fontFamily: "'Space Mono', monospace" }}
    >
      {/* Flash overlay */}
      {flash && (
        <div className={cn(
          'fixed inset-0 z-50 pointer-events-none transition-opacity duration-300',
          flash === 'valid'   ? 'bg-green-400/20' : 'bg-rose-500/20'
        )} />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/5">
        <span className="text-cyan-400 font-bold tracking-widest text-sm">TransitOS</span>
        <button
          onClick={() => setOnline(v => !v)}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
            online
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-slate-700/40 border-white/10 text-slate-500'
          )}
        >
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* ── SCREEN: IDLE ── */}
      {screen === 'idle' && (
        <div className="px-4 pt-6">
          <h1 className="text-2xl font-bold text-white mb-1">Ticket Validator</h1>
          <p className="text-slate-400 text-sm mb-6">Scan passenger QR tickets to validate</p>

          {/* Validator ID card */}
          <div className="rounded-xl border border-white/8 bg-slate-800/40 px-4 py-3 mb-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">Validator ID</p>
              <p className="text-cyan-400 font-bold tracking-wider text-sm font-mono">{VALIDATOR_ID}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{VALIDATOR_ZONE}</p>
            </div>
            <Shield className="w-8 h-8 text-cyan-400/20" />
          </div>

          {/* Ready-to-scan box */}
          <div
            className="rounded-2xl border border-white/8 bg-slate-900/60 p-8 flex flex-col items-center mb-6"
            style={{ background: 'linear-gradient(160deg, rgba(14,165,233,0.04) 0%, rgba(7,14,26,0.95) 100%)' }}
          >
            {/* Animated QR icon */}
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-xl border-2 border-cyan-400/30 flex items-center justify-center"
                style={{ animation: 'pulse 2.5s ease-in-out infinite', boxShadow: '0 0 24px rgba(34,211,238,0.12)' }}
              >
                <QrCode className="w-10 h-10 text-cyan-400/70" />
              </div>
              <ScanLine
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 text-cyan-400"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              />
            </div>
            <h2 className="text-white font-bold text-lg mb-1">Ready to Scan</h2>
            <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
              Click below to start scanning<br />passenger tickets
            </p>
            <button
              onClick={handleStartScanner}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              style={{ boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}
            >
              <QrCode className="w-4 h-4" />
              Start Scanner
            </button>
          </div>

          {/* Stats if any */}
          {results.length > 0 && (
            <>
              <StatsBar results={results} />
              <div className="px-0 mt-4">
                <div className="flex items-center justify-between mb-3 px-0">
                  <h2 className="text-white font-bold text-sm">Scan Results</h2>
                  <span className="text-[10px] text-slate-500">{results.length} scanned</span>
                </div>
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <ResultCard key={i} result={r} validatorId={VALIDATOR_ID} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SCREEN: SCANNING ── */}
      {screen === 'scanning' && (
        <div className="px-4 pt-6">
          <button
            onClick={() => { setScanActive(false); setScreen('idle') }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-white mb-1">Transit Validator Scanner</h1>
          <p className="text-slate-400 text-xs mb-4">QR code validation for transit conductors and validators</p>

          {/* Validator ID inline */}
          <div className="rounded-xl border border-cyan-500/20 bg-slate-800/40 px-4 py-3 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">Validator ID</p>
                <p className="text-cyan-400 font-bold tracking-wider text-xs font-mono">{VALIDATOR_ID}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{VALIDATOR_ZONE}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full border flex items-center gap-1',
                  online
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-slate-700/40 border-white/10 text-slate-500'
                )}>
                  {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {online ? 'Online' : 'Offline'}
                </span>
                <button
                  onClick={() => setOnline(v => !v)}
                  className="text-[10px] text-slate-500 border border-white/10 px-2 py-1 rounded-lg hover:text-white hover:border-white/20 transition-colors"
                >
                  Toggle
                </button>
              </div>
            </div>
          </div>

          {/* Camera */}
          <QRScanner onScan={handleScan} isActive={scanActive} />

          <p className="text-center text-xs text-slate-500 mt-3 mb-5">
            Camera will automatically detect and validate tickets
          </p>

          {/* Simulate buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleSimulate('valid')}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-sm font-bold py-3 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simulate Valid
            </button>
            <button
              onClick={() => handleSimulate('invalid')}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-sm font-bold py-3 rounded-xl transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Simulate Invalid
            </button>
          </div>

          {/* Recent results */}
          {results.length > 0 && (
            <>
              <h2 className="text-white font-bold text-sm mb-3">Scan Results</h2>
              <div className="space-y-3">
                {results.slice(0, 5).map((r, i) => (
                  <ResultCard key={i} result={r} validatorId={VALIDATOR_ID} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SCREEN: RESULT ── */}
      {screen === 'result' && lastResult && (
        <div className="px-4 pt-6">
          <button
            onClick={() => setScreen('scanning')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            ← Back to Scanner
          </button>

          {/* Big result badge */}
          <div className={cn(
            'rounded-2xl p-6 flex flex-col items-center mb-5 border',
            lastResult.valid
              ? 'bg-green-500/8 border-green-500/25'
              : 'bg-rose-500/8 border-rose-500/25'
          )}>
            {lastResult.valid
              ? <CheckCircle2 className="w-14 h-14 text-green-400 mb-3" style={{ filter: 'drop-shadow(0 0 16px rgba(74,222,128,0.6))' }} />
              : <XCircle      className="w-14 h-14 text-rose-400  mb-3" style={{ filter: 'drop-shadow(0 0 16px rgba(248,113,113,0.6))' }} />
            }
            <h2 className={cn('text-2xl font-bold mb-1', lastResult.valid ? 'text-green-400' : 'text-rose-400')}>
              {lastResult.valid ? 'Valid Ticket' : 'Invalid Ticket'}
            </h2>
            <p className="text-slate-400 text-xs text-center">{lastResult.reason}</p>
          </div>

          {/* Detail card */}
          <ResultCard result={lastResult} validatorId={VALIDATOR_ID} />

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRescan}
              className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Scan Next
            </button>
            <button
              onClick={() => setScreen('idle')}
              className="px-4 flex items-center justify-center border border-white/10 text-slate-400 hover:text-white hover:border-white/20 rounded-xl transition-colors"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          {results.length > 0 && <StatsBar results={results} />}

          {/* All results */}
          {results.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold text-sm">Scan Results</h2>
                <span className="text-[10px] text-slate-500">{results.length} total</span>
              </div>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <ResultCard key={i} result={r} validatorId={VALIDATOR_ID} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scan line animation */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        @keyframes scanLine {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(192px); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}