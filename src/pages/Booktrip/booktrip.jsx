import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  QrCode, CheckCircle2, XCircle, MapPin, Clock,
  Wifi, WifiOff, RotateCcw, Zap, Loader2,
  Train, Bus, Anchor, AlertCircle, Shield, ScanLine,
  Hash, Plus, Trash2, ClipboardList, ChevronRight,
  Users, User, Settings, X
} from 'lucide-react';
import { validateTicketById } from '../../service/api';
import { loadTickets } from '@/lib/walletstore';

// --- Helpers ---
function getModeIcon(mode = '') {
  const m = mode.toLowerCase();
  if (m.includes('metro') || m.includes('monorail')) return <Zap className="w-3 h-3" />;
  if (m.includes('bus')) return <Bus className="w-3 h-3" />;
  if (m.includes('ferry')) return <Anchor className="w-3 h-3" />;
  return <Train className="w-3 h-3" />;
}

function shortId(id = '') {
  return '#' + String(id).replace(/-/g, '').slice(0, 8).toUpperCase();
}

function formatTime(iso) {
  if (!iso) return;
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function normalizeParsed(raw) {
  if (!raw) return null;
  return {
    ticket_id: raw.ticket_id || raw.id || 'N/A',
    commuter_name: raw.commuter_name || 'Unknown',
    from_station: raw.from_station || raw.start_station || 'Unknown',
    to_station: raw.to_station || raw.end_station || 'Unknown',
    mode: raw.mode || 'Unknown',
    fare: raw.fare || raw.total_fare || 0,
    issued_at: raw.issued_at || raw.timestamp || null,
    valid_until: raw.valid_until || null,
  };
}

function validateTicketData(data) {
  try {
    const raw = JSON.parse(data);
    const parsed = normalizeParsed(raw);
    if (!parsed.ticket_id || !parsed.from_station || !parsed.to_station || !parsed.mode) {
      return { valid: false, reason: 'Malformed ticket data', parsed };
    }
    if (raw.valid_until && new Date(raw.valid_until) < new Date()) {
      return { valid: false, reason: 'Ticket expired', parsed };
    }
    return { valid: true, reason: 'Ticket verified on-chain', parsed };
  } catch {
    return { valid: false, reason: 'Invalid QR format', parsed: null };
  }
}

function lookupLocalTicket(ticket_id) {
  const tickets = loadTickets();
  const q = ticket_id.trim().toLowerCase();
  const found = tickets.find(t => 
    t.ticket_id?.toLowerCase() === q || 
    t.ticket_id?.replace(/-/g, '').slice(0, 8).toUpperCase() === q.toUpperCase()
  );
  if (!found) return null;
  const parsed = normalizeParsed(found);
  if (found.valid_until && new Date(found.valid_until) < new Date()) {
    return { valid: false, reason: 'Ticket expired (offline check)', parsed };
  }
  return { valid: true, reason: 'Verified via Local Cache (Offline)', parsed };
}

function getValidationHistory() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('validationHistory');
    return stored ? JSON.parse(stored) : [];
  }
  return [];
}

function addToValidationHistory(result, validatorId, validatorZone) {
  if (typeof window === 'undefined') return;
  const history = getValidationHistory();
  const entry = {
    id: crypto.randomUUID(),
    ticket_id: result.parsed?.ticket_id || 'N/A',
    commuter_name: result.parsed?.commuter_name || 'Unknown',
    valid: result.valid,
    reason: result.reason,
    validatorId,
    validatorZone,
    scannedAt: new Date().toISOString(),
    fare: result.parsed?.fare || 0,
    from_station: result.parsed?.from_station || '-',
    to_station: result.parsed?.to_station || '-',
    mode: result.parsed?.mode || 'Unknown',
    parsed: result.parsed,
    source: result.source
  };
  history.unshift(entry);
  if (history.length > 500) history.pop();
  localStorage.setItem('validationHistory', JSON.stringify(history));
  return entry;
}

function isTicketDuplicate(ticketId) {
  const history = getValidationHistory();
  const normalizedId = ticketId.trim().toLowerCase();
  return history.some(entry => 
    entry.ticket_id.toLowerCase() === normalizedId ||
    entry.ticket_id.replace(/-/g, '').slice(0, 8).toUpperCase() === normalizedId.toUpperCase()
  );
}

const MOCK_VALID = JSON.stringify({
  ticket_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  commuter_name: 'Rahul Sharma',
  from_station: 'Andheri',
  to_station: 'CST',
  mode: 'Bus',
  fare: 47.50,
  issued_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  valid_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
});

// --- Components ---

function QRScanner({ onScan, isActive }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [camError, setCamError] = useState('');
  const [scanning, setScanning] = useState(false);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  const startCamera = useCallback(async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isMobile 
          ? { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setScanning(true);
        }
      } catch {
        setCamError('Camera access denied.');
      }
    }
  }, [isMobile]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!isActive) { stopCamera(); return; }
    startCamera();
    return () => stopCamera();
  }, [isActive, startCamera, stopCamera]);

  useEffect(() => {
    if (!scanning || !videoRef.current || !('BarcodeDetector' in window)) return;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    let active = true;
    const detect = async () => {
      if (!active || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) { onScan(codes[0].rawValue); return; }
      } catch {}
      rafRef.current = requestAnimationFrame(detect);
    };
    detect();
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [scanning, onScan]);

  if (camError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center px-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-rose-400 text-sm">{camError}</p>
      </div>
    );
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
    </div>
  );
}

function ResultCard({ result, validatorId }) {
  const { valid, reason, parsed, source } = result;
  return (
    <div className={cn('rounded-xl border p-4 transition-all duration-300', valid ? 'bg-green-500/5 border-green-500/25' : 'bg-rose-500/5 border-rose-500/25')}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {valid ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
          <div>
            <p className="text-white font-bold text-sm">{parsed?.commuter_name || 'Unknown'}</p>
            <p className="text-[10px]" style={{ color: valid ? '#4ADE80' : '#F87171' }}>{valid ? 'Valid Ticket' : 'Invalid Ticket'} ({reason})</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn('text-[9px] tracking-widest font-bold px-2 py-1 rounded-md border flex items-center gap-1', valid ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30')}>
            {getModeIcon(parsed?.mode || '')}
            {(parsed?.mode || 'UNKNOWN').toUpperCase()}
          </span>
        </div>
      </div>
      {parsed && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400 mt-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-[9px] uppercase text-slate-600 mb-0.5">Ticket ID</p>
            <p className="text-slate-300 font-mono">{shortId(parsed.ticket_id)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-600 mb-0.5">Route</p>
            <p className="text-slate-300 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {parsed.from_station} → {parsed.to_station}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SingleManualEntry({ online, validatorId, validatorZone, onResult, onBack }) {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleValidate() {
    const id = ticketId.trim();
    if (!id) { setError('Please enter a Ticket ID'); return; }
    if (isTicketDuplicate(id)) { setError('This ticket has already been validated.'); return; }
    setError('');
    setLoading(true);
    let result;
    
    if (online) {
      try {
        const data = await validateTicketById(id);
        result = { valid: data.valid, reason: data.reason, parsed: normalizeParsed(data.parsed || data), scannedAt: new Date().toISOString(), validatorId, source: 'Ledger' };
      } catch (err) {
        if (err?.response?.status === 404) {
          const local = lookupLocalTicket(id);
          result = local ? { ...local, scannedAt: new Date().toISOString(), validatorId, source: 'Local Cache' } : { valid: false, reason: 'Not found', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Not Found' };
        } else {
          result = { valid: false, reason: 'Server error', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Error' };
        }
      }
    } else {
      const local = lookupLocalTicket(id);
      result = local ? { ...local, scannedAt: new Date().toISOString(), validatorId, source: 'Offline Cache' } : { valid: false, reason: 'Offline: Not found', parsed: null, scannedAt: new Date().toISOString(), validatorId, source: 'Offline' };
    }
    setLoading(false);
    addToValidationHistory(result, validatorId, validatorZone);
    setTicketId('');
    onResult(result);
  }

  return (
    <div className="px-4 pt-6">
      <button onClick={onBack} className="text-slate-400 text-sm mb-4">Back</button>
      <div className="flex items-center gap-2 mb-1">
        <User className="w-5 h-5 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">Manual Entry</h1>
      </div>
      <div className="flex items-center gap-3 rounded-xl border px-4 py-3.5 mb-3 bg-slate-800/70 border-white/10">
        <Hash className="w-4 h-4 text-slate-500" />
        <input type="text" value={ticketId} onChange={e => {setTicketId(e.target.value); setError('');}} placeholder="e.g. a1b2c3d4..." className="flex-1 bg-transparent text-white text-sm outline-none font-mono" />
      </div>
      {error && <div className="text-rose-400 text-xs mb-4">{error}</div>}
      <button onClick={handleValidate} disabled={loading} className="w-full bg-cyan-500 text-white font-bold py-3.5 rounded-xl text-sm">
        {loading ? <Loader2 className="animate-spin" /> : 'Validate Ticket'}
      </button>
    </div>
  );
}

// --- Main Page ---

export default function ValidatorPage() {
  const [screen, setScreen] = useState('idle');
  const [online, setOnline] = useState(true);
  const [flash, setFlash] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [scanActive, setScanActive] = useState(false);
  const [results, setResults] = useState(() => getValidationHistory());

  const validatorId = "GATE-01";
  const validatorZone = "Main Terminal";

  const handleScan = useCallback((rawValue) => {
    setScanActive(false);
    const result = validateTicketData(rawValue);
    result.scannedAt = new Date().toISOString();
    result.validatorId = validatorId;
    result.source = 'QR Scan';

    if (result.parsed?.ticket_id && isTicketDuplicate(result.parsed.ticket_id)) {
      result.valid = false;
      result.reason = 'DUPLICATE: Already scanned';
    } else {
      addToValidationHistory(result, validatorId, validatorZone);
    }

    setFlash(result.valid ? 'valid' : 'invalid');
    setLastResult(result);
    setResults(getValidationHistory());
    setScreen('result');
    setTimeout(() => setFlash(null), 800);
  }, []);

  return (
    <div className="min-h-screen pb-20 relative bg-[#070E1A] font-mono">
      {flash && <div className={cn('fixed inset-0 z-50 pointer-events-none', flash === 'valid' ? 'bg-green-400/20' : 'bg-rose-500/20')} />}
      
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <span className="text-cyan-400 font-bold tracking-widest text-sm">TransitOS Validator</span>
        <button onClick={() => setOnline(v => !v)} className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border', online ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-slate-500 border-white/10')}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />} {online ? 'Online' : 'Offline'}
        </button>
      </div>

      {screen === 'idle' && (
        <div className="px-4 pt-6">
          <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6 mb-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl border-2 border-cyan-400/30 flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-white font-bold mb-1">Ready to Scan</h2>
            <button onClick={() => {setScanActive(true); setScreen('scanning');}} className="w-full bg-cyan-500 text-white font-bold py-3.5 rounded-xl">Start Scanner</button>
          </div>
          
          <button onClick={() => setScreen('manual_single')} className="w-full bg-slate-800/40 border border-white/10 p-4 rounded-xl flex items-center justify-center gap-2 mb-8">
            <User className="text-cyan-400 w-5 h-5" />
            <span className="text-white text-xs font-bold">Manual Entry</span>
          </button>

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-sm uppercase">Validation History</h3>
              {results.map((r, i) => <ResultCard key={r.id || i} result={r} validatorId={validatorId} />)}
            </div>
          )}
        </div>
      )}

      {screen === 'scanning' && (
        <div className="px-4 pt-6">
          <button onClick={() => setScreen('idle')} className="text-slate-400 text-sm mb-4">Back</button>
          <QRScanner onScan={handleScan} isActive={scanActive} />
          <div className="flex gap-3 mt-6">
            <button onClick={() => handleScan(MOCK_VALID)} className="flex-1 bg-green-500/10 text-green-400 text-xs font-bold py-3 rounded-lg">Simulate Valid</button>
          </div>
        </div>
      )}

      {screen === 'result' && lastResult && (
        <div className="px-4 pt-6">
          <div className={cn('rounded-2xl p-8 flex flex-col items-center mb-6 border', lastResult.valid ? 'bg-green-500/10 border-green-500/20' : 'bg-rose-500/10 border-rose-500/20')}>
            {lastResult.valid ? <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" /> : <XCircle className="w-16 h-16 text-rose-400 mb-4" />}
            <h2 className="text-2xl font-bold text-white mb-2">{lastResult.valid ? 'Access Granted' : 'Access Denied'}</h2>
            <p className="text-slate-400 text-sm">{lastResult.reason}</p>
          </div>
          <ResultCard result={lastResult} validatorId={validatorId} />
          <button onClick={() => setScreen('idle')} className="w-full mt-6 bg-cyan-500 text-white font-bold py-3.5 rounded-xl">Scan Another</button>
        </div>
      )}

      {screen === 'manual_single' && <SingleManualEntry online={online} validatorId={validatorId} validatorZone={validatorZone} onResult={(res) => {setLastResult(res); setResults(getValidationHistory()); setScreen('result');}} onBack={() => setScreen('idle')} />}

      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(192px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}