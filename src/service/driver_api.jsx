/**
 * driverApi.js
 * Dedicated Axios instance for the Driver Portal.
 * Mirrors the pattern in api.js but targets the local FastAPI server directly
 * (no ngrok header needed for local development).
 *
 * Endpoints consumed:
 *   GET  /active_trip      → returns the driver's current active trip
 *   POST /complete_trip    → marks the current trip as completed
 *   POST /withdraw_fiat    → initiates a fiat withdrawal to the driver's bank
 */

import axios from 'axios'

const driverApi = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 s — local server should be fast
})

// ─── GET /active_trip ─────────────────────────────────────────────────────────
// Returns: { trip_id, passenger_name, legs[], mode, distance_km, fare, status }
// status: 'awaiting' | 'in_progress' | 'completed'
export const getActiveTrip = async () => {
  const response = await driverApi.get('/active_trip')
  return response.data
}

// ─── POST /complete_trip ──────────────────────────────────────────────────────
// Body:    { trip_id }
// Returns: { status, message, fare_released }
export const completeTrip = async (tripId) => {
  const response = await driverApi.post('/complete_trip', { trip_id: tripId })
  return response.data
}

// ─── POST /withdraw_fiat ──────────────────────────────────────────────────────
// Body:    { amount }   (optional — omit to withdraw full available balance)
// Returns: { status, amount_credited, message }
export const withdrawFiat = async (amount) => {
  const body = amount != null ? { amount } : {}
  const response = await driverApi.post('/withdraw_fiat', body)
  return response.data
}

export default driverApi