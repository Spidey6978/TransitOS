import sqlite3
import hashlib
import random
import math
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mumbai_data import MUMBAI_LOCATIONS, get_coords
from models import OfflineSyncPayload, TicketResponse, SyncResponse
from dotenv import load_dotenv
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

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

# --- DB SETUP ---
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
                end_lng REAL
            )
        """)
        conn.commit()

init_db()

# --- MODELS ---
class TicketRequest(BaseModel):
    commuter_name: str
    from_station: str
    to_station: str
    mode: str 

# --- UTILS ---
def haversine(coord1, coord2):
    # Calculate distance in KM between two lat/lng points
    R = 6371  # Earth radius in km
    dlat = math.radians(coord2[1] - coord1[1])
    dlon = math.radians(coord2[0] - coord1[0])
    a = math.sin(dlat/2)**2 + math.cos(math.radians(coord1[1])) * math.cos(math.radians(coord2[1])) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_split(fare, mode):
    # The TransitOS Settlement Logic
    if "Local Train" in mode:
        return f"Railways: ₹{fare*0.95:.1f} | TransitOS: ₹{fare*0.05:.1f}"
    elif "Metro" in mode:
        return f"MMRDA: ₹{fare*0.9:.1f} | TransitOS: ₹{fare*0.1:.1f}"
    elif "Hybrid" in mode:
        return f"Railways: ₹{fare*0.5:.1f} | BEST: ₹{fare*0.4:.1f} | TransitOS: ₹{fare*0.1:.1f}"
    else:
        return f"Operator: ₹{fare*0.95:.1f} | TransitOS: ₹{fare*0.05:.1f}"

# --- ENDPOINTS ---

@app.get("/stations")
def get_stations():
    return list(MUMBAI_LOCATIONS.keys())

@app.post("/reset_db")
def reset_database():
    """Clear all data for the Demo"""
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
    return JSONResponse(status_code=429, content={"error": "Too many requests — slow down"})

@app.post("/book_ticket", response_model=TicketResponse)
@limiter.limit("30/minute")
def book_ticket(request: TicketRequest):
    start_coords = get_coords(request.from_station)
    end_coords = get_coords(request.to_station)
    
    # Calculate physics
    dist = haversine(start_coords, end_coords)
    base_fare = 10
    fare = base_fare + (dist * 2) # ₹2 per KM
    if "AC" in request.mode: fare *= 1.5
    
    split_info = calculate_split(fare, request.mode)
    
    # Blockchain Hash
    tx_data = f"{request.commuter_name}{datetime.now()}{fare}"
    #tx_hash = "0x" + hashlib.sha256(tx_data.encode()).hexdigest()[:16]
    tx_hash = settle_fare(request.commuter_name, fare)

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tx_hash, datetime.now(), request.commuter_name,
            request.from_station, request.to_station, request.mode,
            round(dist, 2), round(fare, 2), split_info,
            start_coords[1], start_coords[0], # Lat, Lng
            end_coords[1], end_coords[0]      # Lat, Lng
        ))
        conn.commit()

    return TicketResponse(
        status       = "success",
        tx_hash      = tx_hash,
        fare         = round(fare, 2),
        split        = split_info,
        from_station = request.from_station,
        to_station   = request.to_station,
        distance_km  = round(dist, 2)
    )

@app.get("/ledger_live")
def get_ledger():
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM ledger ORDER BY timestamp DESC LIMIT 500")
        return [dict(row) for row in c.fetchall()]

@app.post("/sync_offline", response_model=SyncResponse)
def sync_offline(payload: OfflineSyncPayload):
    """
    Receives a batch of tickets that were queued while the device was offline.
    Phase 1: Saves each ticket to SQLite with a dummy hash.
    Phase 3: Each ticket will be pushed to Web3 via web3_bridge.py.
    """
    results = []

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()

        for ticket in payload.tickets:
            try:
                # Get coordinates
                start_coords = get_coords(ticket.from_station)
                end_coords   = get_coords(ticket.to_station)

                # Calculate fare (same logic as /book_ticket)
                dist      = haversine(start_coords, end_coords)
                fare      = 10 + (dist * 2)
                if "AC" in ticket.mode:
                    fare *= 1.5
                split_info = calculate_split(fare, ticket.mode)

                # Generate mock hash for Phase 1
                tx_data  = f"{ticket.commuter_name}{datetime.now()}{fare}"
                #tx_hash  = "0x" + hashlib.sha256(tx_data.encode()).hexdigest()[:16]
                tx_hash = settle_fare(request.commuter_name, fare)

                c.execute("""
                    INSERT OR IGNORE INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tx_hash, datetime.now(), ticket.commuter_name,
                    ticket.from_station, ticket.to_station, ticket.mode,
                    round(dist, 2), round(fare, 2), split_info,
                    start_coords[1], start_coords[0],
                    end_coords[1], end_coords[0]
                ))

                results.append({
                    "commuter": ticket.commuter_name,
                    "tx_hash": tx_hash,
                    "status": "saved"
                })

            except Exception as e:
                # Don't crash the whole batch — log and continue
                results.append({
                    "commuter": ticket.commuter_name,
                    "tx_hash": None,
                    "status": f"failed: {str(e)}"
                })

        conn.commit()

    return SyncResponse(
        status         = "queued",
        total_received = len(payload.tickets),
        results        = results
    )

#extra suggested endpoint
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "database": "connected",
        "web3_bridge": "pending_abi"
    }

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