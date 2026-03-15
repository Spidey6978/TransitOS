import sqlite3
import math
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request # Added Request here
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# --- Security & Rate Limiting ---
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

# --- Local Imports ---
from Backend.mumbai_data import MUMBAI_LOCATIONS, get_coords
from Backend.models import OfflineSyncPayload, TicketResponse, SyncResponse, TicketRequest
from Backend.web3_bridge import settle_trip_on_chain

load_dotenv() 

app = FastAPI(title="TransitOS Kernel")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
DB_FILE = "transitos.db"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS ledger (
                hash TEXT PRIMARY KEY,
                timestamp DATETIME,
                commuter_name TEXT,
                start_station TEXT,
                end_station TEXT,
                mode TEXT,
                distance_km REAL,
                total_fare REAL,
                operator_split TEXT,
                start_lat REAL,
                start_lng REAL,
                end_lat REAL,
                end_lng REAL,
                ticket_id TEXT UNIQUE
            )
        """)
        conn.commit()

init_db()

# --- UTILS ---
def haversine(coord1, coord2):
    R = 6371 
    dlat = math.radians(coord2[1] - coord1[1])
    dlon = math.radians(coord2[0] - coord1[0])
    a = math.sin(dlat/2)**2 + math.cos(math.radians(coord1[1])) * math.cos(math.radians(coord2[1])) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_split(fare, mode):
    if "Local Train" in mode:
        return f"Railways: ₹{fare*0.95:.1f} | TransitOS: ₹{fare*0.05:.1f}"
    elif "Metro" in mode:
        return f"MMRDA: ₹{fare*0.9:.1f} | TransitOS: ₹{fare*0.1:.1f}"
    elif "Hybrid" in mode:
        return f"Railways: ₹{fare*0.5:.1f} | BEST: ₹{fare*0.4:.1f} | TransitOS: ₹{fare*0.1:.1f}"
    else:
        return f"Operator: ₹{fare*0.95:.1f} | TransitOS: ₹{fare*0.05:.1f}"

# --- ENDPOINTS ---

@app.get("/health")
def health_check():
    return {"status": "online", "database": "connected", "web3": "active"}

@app.get("/stations")
def get_stations():
    return list(MUMBAI_LOCATIONS.keys())

@app.post("/reset_db")
def reset_database():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM ledger")
            conn.commit()
        return {"status": "System Reset"}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"error": "Too many requests"})

@app.post("/book_ticket", response_model=TicketResponse)
@limiter.limit("30/minute")
def book_ticket(request: Request, ticket: TicketRequest):
    # --- THE GHOST SHIELD ---
    if ticket.from_station not in MUMBAI_LOCATIONS or ticket.to_station not in MUMBAI_LOCATIONS:
        raise HTTPException(status_code=400, detail=f"Invalid route: {ticket.from_station} to {ticket.to_station} does not exist.")

    # --- THE IDEMPOTENCY SHIELD ---
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        # FIX 1: Check ticket_id explicitly
        c.execute("SELECT 1 FROM ledger WHERE ticket_id = ? LIMIT 1", (ticket.ticket_id,))
        # FIX 2: Actually block the request if a duplicate is found!
        if c.fetchone():
            raise HTTPException(status_code=409, detail=f"Duplicate request blocked. Ticket ID {ticket.ticket_id} already processed.")

    start_coords = get_coords(ticket.from_station)
    end_coords = get_coords(ticket.to_station)
    
    dist = haversine(start_coords, end_coords)
    fare = 10 + (dist * 2)
    if "AC" in ticket.mode: fare *= 1.5
    split_info = calculate_split(fare, ticket.mode)

    # Bridge to the Blockchain logic
    tx_hash = settle_trip_on_chain(
        ticket.commuter_name, 
        ticket.from_station, 
        ticket.to_station, 
        ticket.mode, 
        fare
    )

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        # FIX 3: Add the 14th placeholder (?) and ticket.ticket_id to the insert
        c.execute("INSERT INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
            tx_hash, datetime.now(), ticket.commuter_name,
            ticket.from_station, ticket.to_station, ticket.mode,
            round(dist, 2), round(fare, 2), split_info,
            start_coords[1], start_coords[0], end_coords[1], end_coords[0],
            ticket.ticket_id
        ))
        conn.commit()

    return TicketResponse(
        status="success", tx_hash=tx_hash, fare=round(fare, 2),
        split=split_info, from_station=ticket.from_station,
        to_station=ticket.to_station, distance_km=round(dist, 2)
    )

@app.post("/sync_offline", response_model=SyncResponse)
def sync_offline(payload: OfflineSyncPayload):
    results = []
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        for ticket in payload.tickets:
            try:
                # --- THE GHOST SHIELD (Offline Version) ---
                if ticket.from_station not in MUMBAI_LOCATIONS or ticket.to_station not in MUMBAI_LOCATIONS:
                    raise Exception(f"Invalid route: {ticket.from_station} to {ticket.to_station}")

                start_coords = get_coords(ticket.from_station)
                end_coords = get_coords(ticket.to_station)
                dist = haversine(start_coords, end_coords)
                fare = 10 + (dist * 2)
                if "AC" in ticket.mode: fare *= 1.5
                split_info = calculate_split(fare, ticket.mode)

                tx_hash = settle_trip_on_chain(
                    ticket.commuter_name, 
                    ticket.from_station, 
                    ticket.to_station, 
                    ticket.mode, 
                    fare
                )

                # FIX: Because ticket_id is UNIQUE in the DB, "INSERT OR IGNORE" acts as 
                # a built-in idempotency shield for the offline sync loop!
                c.execute("INSERT OR IGNORE INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
                    tx_hash, datetime.now(), ticket.commuter_name,
                    ticket.from_station, ticket.to_station, ticket.mode,
                    round(dist, 2), round(fare, 2), split_info,
                    start_coords[1], start_coords[0], end_coords[1], end_coords[0],
                    ticket.ticket_id
                ))
                results.append({"commuter": ticket.commuter_name, "tx_hash": tx_hash, "status": "saved"})
            except Exception as e:
                results.append({"commuter": ticket.commuter_name, "tx_hash": None, "status": f"failed: {str(e)}"})
        conn.commit()
    return SyncResponse(status="queued", total_received=len(payload.tickets), results=results)

@app.get("/ledger_live")
def get_ledger():
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM ledger ORDER BY timestamp DESC LIMIT 500")
        return [dict(row) for row in c.fetchall()]

@app.get("/stats")
def get_stats():
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM ledger")
        total_tickets = c.fetchone()[0]
        c.execute("SELECT SUM(total_fare) FROM ledger")
        total_revenue = c.fetchone()[0] or 0
        c.execute("SELECT COUNT(DISTINCT commuter_name) FROM ledger")
        unique_commuters = c.fetchone()[0]
    return {
        "total_tickets": total_tickets,
        "total_revenue_inr": round(total_revenue, 2),
        "unique_commuters": unique_commuters
    }