import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"
import 'leaflet/dist/leaflet.css';
import api from "./service/api"

document.documentElement.classList.add('dark')

// Offline sync flush — fires whenever browser comes back online
// Matches the document's Day 7-9 requirement exactly
window.addEventListener('online', async () => {
  try {
    const queue = JSON.parse(localStorage.getItem('transitos_offline_queue') || '[]')
    if (queue.length === 0) return
    await api.post('/sync_offline', { tickets: queue })
    localStorage.removeItem('transitos_offline_queue')
    console.log(`[TransitOS] Synced ${queue.length} offline ticket(s) to blockchain.`)
  } catch (err) {
    console.warn('[TransitOS] Offline sync failed — will retry on next reconnect.', err)
  }
})

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)