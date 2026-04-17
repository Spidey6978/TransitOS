// src/components/PinDropMap.jsx
import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fix Leaflet's broken default icon in Vite/webpack builds
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom cyan pin icon to match TransitOS theme
const cyColor = '#0EA5E9'
const createCustomIcon = () => L.divIcon({
  className: '',
  html: `
    <div style="
      width:32px; height:32px; border-radius:50% 50% 50% 0;
      background:${cyColor}; border:3px solid white;
      transform:rotate(-45deg); box-shadow:0 2px 12px rgba(14,165,233,0.6);
    "></div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

// Inner component: handles map click + drag events
function DraggableMarker({ position, onChange }) {
  const markerRef = useRef(null)

  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  return position ? (
    <Marker
      draggable
      position={[position.lat, position.lng]}
      icon={createCustomIcon()}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current
          if (m) {
            const ll = m.getLatLng()
            onChange({ lat: ll.lat, lng: ll.lng })
          }
        },
      }}
    />
  ) : null
}

/**
 * PinDropMap
 *
 * Props:
 *   label        – "Pickup Location" | "Drop Location"
 *   initialPos   – { lat, lng } | null  (pre-fill if editing)
 *   onConfirm    – ({ lat, lng, label }) => void
 *   onClose      – () => void
 */
export default function PinDropMap({ label = 'Pin Location', initialPos = null, onConfirm, onClose }) {
  // Default center: Mumbai
  const MUMBAI = { lat: 19.076, lng: 72.877 }
  const [position, setPosition] = useState(initialPos || null)
  const [confirmed, setConfirmed] = useState(false)

  // Reverse-geocode using free Nominatim (no API key) for a human label only
  const [humanLabel, setHumanLabel] = useState('')
  useEffect(() => {
    if (!position) return
    const { lat, lng } = position
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(d => setHumanLabel(d.display_name?.split(',').slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`))
      .catch(() => setHumanLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`))
  }, [position])

  function handleConfirm() {
    if (!position) return
    setConfirmed(true)
    setTimeout(() => onConfirm({ ...position, label: humanLabel || `${position.lat.toFixed(4)},${position.lng.toFixed(4)}` }), 400)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(7,14,26,0.92)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        style={{ background: '#0F172A' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-bold tracking-wide text-sm">{label}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xs border border-white/10 px-2 py-1 rounded-lg">
            ✕ Cancel
          </button>
        </div>

        {/* Instructions */}
        <div className="px-5 py-2 bg-cyan-500/5 border-b border-cyan-500/10">
          <p className="text-[10px] text-cyan-300/70 tracking-wide">
            📍 Tap the map or drag the pin to set your {label.toLowerCase()}
          </p>
        </div>

        {/* Map */}
        <div style={{ height: 300 }}>
          <MapContainer
            center={initialPos ? [initialPos.lat, initialPos.lng] : [MUMBAI.lat, MUMBAI.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker position={position} onChange={setPosition} />
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="px-5 py-4">
          {position && (
            <div className="mb-3 rounded-xl border border-white/8 bg-slate-800/50 px-4 py-2.5">
              <p className="text-[9px] text-slate-500 tracking-widest uppercase mb-0.5">Selected Location</p>
              <p className="text-white text-xs font-medium leading-tight truncate">
                {humanLabel || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`}
              </p>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!position}
            className={cn(
              'w-full font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2',
              confirmed
                ? 'bg-green-500 text-white'
                : position
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
            )}
          >
            {confirmed
              ? <><Check className="w-4 h-4" /> Location Set!</>
              : <><MapPin className="w-4 h-4" /> Confirm Pin</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}