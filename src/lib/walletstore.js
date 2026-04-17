const BALANCE_KEY = 'transitos_balance'
const TICKETS_KEY = 'transitos_tickets'
const DEFAULT_BALANCE = 1000.00

export function getBalance() {
  const raw = localStorage.getItem(BALANCE_KEY)
  if (raw === null) {
    localStorage.setItem(BALANCE_KEY, DEFAULT_BALANCE.toFixed(2))
    return DEFAULT_BALANCE
  }
  return parseFloat(raw)
}
export function deductBalance(amount) {
  const fare = parseFloat(amount)
  if (isNaN(fare) || fare <= 0) return { ok: false, reason: 'Invalid fare amount' }

  const current = getBalance()
  if (current < fare) {
    return {
      ok: false,
      reason: `Insufficient balance. Required ₹${fare.toFixed(2)}, available ₹${current.toFixed(2)}.`,
    }
  }

  const newBalance = parseFloat((current - fare).toFixed(2))
  localStorage.setItem(BALANCE_KEY, newBalance.toString())
  return { ok: true, newBalance }
}

export function saveTicket(ticket) {
  const existing = loadTickets()
  // Avoid duplicates (re-save on retry)
  const deduped = existing.filter(t => t.ticket_id !== ticket.ticket_id)
  localStorage.setItem(TICKETS_KEY, JSON.stringify([ticket, ...deduped]))
}

/** Returns all stored tickets sorted newest-first. */
export function loadTickets() {
  try {
    const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]')
    return tickets.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at))
  } catch { return [] }
}