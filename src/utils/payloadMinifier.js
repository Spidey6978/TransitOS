/**
 * Payload Minifier Utility
 * Handles minification/unminification of ticket data for QR codes
 * and group fare calculations
 */

/**
 * Minify ticket data to reduce QR code complexity
 * Maps full keys to abbreviated keys
 * 
 * @param {Object} ticketData - Full ticket object
 * @returns {Object} Minified ticket object with abbreviated keys
 * 
 * Input: {
 *   ticket_id, commuter_name, from_station, to_station, mode, fare,
 *   duration, timestamp, issued_at, valid_until,
 *   passengers: { adults, children, childrenWithSeats, totalPassengers },
 *   polyline
 * }
 * 
 * Output: {
 *   t, c, f, d, m, fa, du, ts, ia, vu, a, s, n, p
 * }
 */
export function minifyGroupPayload(ticketData) {
  if (!ticketData) {
    console.warn('minifyGroupPayload: ticketData is null or undefined')
    return {}
  }

  try {
    const { passengers = {} } = ticketData

    const minified = {
      // Ticket identifiers
      t: ticketData.ticket_id,        // ticket_id
      c: ticketData.commuter_name,    // commuter_name
      
      // Station info
      f: ticketData.from_station,     // from_station
      d: ticketData.to_station,       // to_station (destination)
      
      // Mode and fare
      m: ticketData.mode,             // mode
      fa: ticketData.fare,            // fare
      
      // Timing
      du: ticketData.duration,        // duration
      ts: ticketData.timestamp,       // timestamp
      ia: ticketData.issued_at,       // issued_at
      vu: ticketData.valid_until,     // valid_until
      
      // Passenger composition (from nested object)
      a: passengers.adults || 0,      // adults
      s: passengers.childrenWithSeats || 0,  // seated children
      n: passengers.children || 0,    // non-seated children
      
      // Map data
      p: ticketData.polyline || null  // polyline
    }

    return minified
  } catch (err) {
    console.error('Error minifying payload:', err)
    return {}
  }
}

/**
 * Unminify ticket data (reconstruct full object from minified)
 * Maps abbreviated keys back to full keys
 * 
 * @param {Object} minified - Minified ticket object
 * @returns {Object} Full ticket object
 * 
 * Input: { t, c, f, d, m, fa, du, ts, ia, vu, a, s, n, p }
 * Output: Full ticket object with original keys
 */
export function unminifyGroupPayload(minified) {
  if (!minified) {
    console.warn('unminifyGroupPayload: minified object is null or undefined')
    return null
  }

  try {
    const reconstructed = {
      ticket_id: minified.t,
      commuter_name: minified.c,
      from_station: minified.f,
      to_station: minified.d,
      mode: minified.m,
      fare: minified.fa,
      duration: minified.du,
      timestamp: minified.ts,
      issued_at: minified.ia,
      valid_until: minified.vu,
      polyline: minified.p,
      passengers: {
        adults: minified.a || 0,
        childrenWithSeats: minified.s || 0,
        children: minified.n || 0,
        totalPassengers: (minified.a || 0) + (minified.s || 0) + (minified.n || 0)
      }
    }

    return reconstructed
  } catch (err) {
    console.error('Error unminifying payload:', err)
    return null
  }
}

/**
 * Calculate grouped fare based on passenger composition
 * 
 * @param {number} baseFare - Base fare for one adult (in ₹)
 * @param {Object} passengerData - Passenger composition
 * @returns {number} Total fare (in ₹)
 * 
 * Calculation:
 *   - Adults pay 100% of base fare
 *   - Children with seat pay 50% of base fare
 *   - Children without seat pay 0% (free)
 * 
 * Example:
 *   baseFare = 20
 *   passengerData = { adults: 2, childrenWithSeats: 1, children: 1, totalPassengers: 4 }
 *   Result = (20 × 2) + (20 × 0.5 × 1) + (0 × 1) = 40 + 10 + 0 = ₹50
 */
export function calculateGroupedFare(baseFare, passengerData) {
  // Input validation
  if (!baseFare || baseFare < 0) {
    console.warn('calculateGroupedFare: Invalid baseFare', baseFare)
    return 0
  }

  if (!passengerData) {
    console.warn('calculateGroupedFare: passengerData is null or undefined')
    return baseFare // Return base fare for 1 adult
  }

  try {
    const {
      adults = 0,
      childrenWithSeats = 0,
      children = 0
    } = passengerData

    // Calculate fare components
    const adultsFare = baseFare * adults
    const childrenWithSeatsFare = baseFare * 0.5 * childrenWithSeats
    const childrenFare = 0 * children // Always free

    // Total fare
    const totalFare = adultsFare + childrenWithSeatsFare + childrenFare

    // Round to 2 decimal places
    return Math.round(totalFare * 100) / 100
  } catch (err) {
    console.error('Error calculating grouped fare:', err)
    return baseFare // Fallback to base fare
  }
}

/**
 * Get passenger composition string for display
 * Example: "2A 1CS 0CN" = 2 adults, 1 child with seat, 0 children without seat
 * 
 * @param {Object} passengerData - Passenger composition
 * @returns {string} Composition string
 */
export function getPassengerCompositionString(passengerData) {
  if (!passengerData) return '1A'

  const {
    adults = 0,
    childrenWithSeats = 0,
    children = 0
  } = passengerData

  const parts = []
  
  if (adults > 0) parts.push(`${adults}A`)
  if (childrenWithSeats > 0) parts.push(`${childrenWithSeats}CS`)
  if (children > 0) parts.push(`${children}CN`)

  return parts.length > 0 ? parts.join(' ') : '1A'
}

/**
 * Format fare for display
 * 
 * @param {number} fare - Fare in ₹
 * @returns {string} Formatted string with currency symbol
 */
export function formatFare(fare) {
  if (!fare || fare < 0) return '₹0'
  return `₹${fare.toFixed(2)}`
}

/**
 * Validate minified payload structure
 * Checks if all required fields are present
 * 
 * @param {Object} minified - Minified ticket object
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidMinifiedPayload(minified) {
  if (!minified || typeof minified !== 'object') return false

  const requiredFields = ['t', 'c', 'f', 'd', 'm', 'fa', 'du', 'ts', 'ia', 'vu', 'a', 's', 'n']
  
  return requiredFields.every(field => minified.hasOwnProperty(field) && minified[field] !== undefined)
}

/**
 * Create QR payload (JSON string for encoding in QR)
 * 
 * @param {Object} ticketData - Full ticket object
 * @returns {string} JSON string to encode in QR code
 */
export function createQRPayload(ticketData) {
  try {
    const minified = minifyGroupPayload(ticketData)
    return JSON.stringify(minified)
  } catch (err) {
    console.error('Error creating QR payload:', err)
    return null
  }
}

/**
 * Parse QR payload (decode JSON from QR)
 * 
 * @param {string} qrData - Raw data from QR code
 * @returns {Object|null} Parsed minified object or null if invalid
 */
export function parseQRPayload(qrData) {
  try {
    const parsed = JSON.parse(qrData)
    
    if (!isValidMinifiedPayload(parsed)) {
      console.warn('Invalid minified payload structure')
      return null
    }

    return parsed
  } catch (err) {
    console.error('Error parsing QR payload:', err)
    return null
  }
}

/**
 * Full QR validation workflow (scan → parse → unminify → validate)
 * 
 * @param {string} qrData - Raw QR data
 * @returns {Object|null} Full unminified ticket or null if invalid
 */
export function validateAndDecodeQR(qrData) {
  try {
    // Step 1: Parse JSON from QR
    const minified = parseQRPayload(qrData)
    if (!minified) {
      console.error('Failed to parse QR payload')
      return null
    }

    // Step 2: Unminify
    const ticket = unminifyGroupPayload(minified)
    if (!ticket) {
      console.error('Failed to unminify ticket')
      return null
    }

    // Step 3: Validate ticket structure
    if (!ticket.ticket_id || !ticket.commuter_name || !ticket.from_station || !ticket.to_station) {
      console.error('Invalid ticket structure')
      return null
    }

    return ticket
  } catch (err) {
    console.error('Error validating and decoding QR:', err)
    return null
  }
}

// ADD THESE TO THE BOTTOM OF src/utils/payloadMinifier.js

/**
 * Minify a multi-leg trip payload for QR encoding
 * Each leg: { mode, from, to }
 * Private legs (auto/taxi/bike) will have status: "pending" initially
 *
 * Output format per leg: "M:AND:WEH" or "A:Home:Andheri"
 * Full string: "MULTILEG|ticketId|leg1|leg2|..."
 */
export function minifyMultiLegPayload(ticketData) {
  if (!ticketData || !ticketData.legs || ticketData.legs.length === 0) return null

  try {
    const modeCode = (mode = '') => {
      const m = mode.toLowerCase()
      if (m.includes('metro')) return 'MT'
      if (m.includes('train')) return 'TR'
      if (m.includes('bus')) return 'BU'
      if (m.includes('auto')) return 'AU'
      if (m.includes('taxi')) return 'TX'
      if (m.includes('bike')) return 'BK'
      return 'XX'
    }

    const legStrings = ticketData.legs.map(leg =>
      `${modeCode(leg.mode)}:${leg.from}:${leg.to}:${leg.status || 'confirmed'}`
    )

    const payload = {
      v: 3,                                    // version
      t: ticketData.ticket_id,
      c: ticketData.commuter_name,
      ia: ticketData.issued_at,
      vu: ticketData.valid_until,
      a: ticketData.passengers?.adults || 1,
      s: ticketData.passengers?.childrenWithSeats || 0,
      n: ticketData.passengers?.children || 0,
      fa: ticketData.total_fare,
      legs: legStrings
    }

    return payload
  } catch (err) {
    console.error('Error minifying multi-leg payload:', err)
    return null
  }
}

/**
 * Calculate total fare across all legs
 * Private legs: use osrm-based estimate passed in
 * Public legs: use fare from route selection
 */
/**
 * V4.1: Capacity-Aware Fare Estimator
 * Public: Fare * Passengers
 * Private: Fare * Ceil(Passengers / Capacity)
 */
export function calculateMultiLegFare(legs, passengerData) {
  const adultCount = passengerData?.adults || 1
  const childSeatCount = passengerData?.childrenWithSeats || 0
  const totalHumans = adultCount + childSeatCount + (passengerData?.children || 0)

  let total = 0
  for (const leg of legs) {
    const mode = (leg.mode || '').toLowerCase()
    
    // 🚕 PRIVATE LOGIC: Charge per vehicle needed
    if (mode.includes('auto') || mode.includes('taxi') || mode.includes('bike')) {
        const capacity = mode.includes('auto') ? 3 : (mode.includes('bike') ? 1 : 4)
        const vehicles = Math.ceil(Math.max(1, totalHumans) / capacity)
        const base = leg.estimatedFare || 45 // Fallback if OSRM is slow
        total += base * vehicles
        continue
    }

    // 🚆 PUBLIC LOGIC: Charge per head
    let base = leg.estimatedFare || 15
    if (mode.includes('metro')) base = 20
    else if (mode.includes('bus')) base = 10
    else if (mode.includes('train') || mode.includes('rail')) base = 15

    total += base * adultCount + base * 0.5 * childSeatCount
  }
  return Math.round(total * 100) / 100
}
/**
 * Check if any leg in a multi-leg trip is a private/gig mode
 */
export function hasPrivateLeg(legs) {
  if (!legs || legs.length === 0) return false
  return legs.some(leg => {
    const m = (leg.mode || '').toLowerCase()
    return m.includes('auto') || m.includes('taxi') || m.includes('bike')
  })
}
