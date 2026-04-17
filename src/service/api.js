import axios from "axios";

const api = axios.create({
  baseURL: "https://touchily-steamerless-alyssa.ngrok-free.dev",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420",
  },
});

// New endpoint for OSRM routing
export const getRoutes = async (fromStation, toStation) => {
  try {
    const response = await api.get('/routes', {
      params: {
        from_station: fromStation,
        to_station: toStation
      }
    })
    return response.data
  } catch (error) {
    console.error('Route fetch error:', error)
    throw error
  }
}

// Book ticket with group passenger data
export const bookTicket = async (ticketData) => {
  try {
    const response = await api.post('/book_ticket', {
      commuter_name: ticketData.commuter_name,
      from_station: ticketData.from_station,
      to_station: ticketData.to_station,
      mode: ticketData.mode,
      ticket_id: ticketData.ticket_id,
      passengers: ticketData.passengers // NEW: group data
    })
    return response.data
  } catch (error) {
    console.error('Booking error:', error)
    throw error
  }
}
export const validateTicketById = async (ticket_id) => {
  try {
    const response = await api.post('/validate_ticket', { ticket_id });
    return response.data;
  } catch (error) {
    console.error('Manual validation fetch error:', error);
    throw error;
  }
};
export default api;