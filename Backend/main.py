import sqlite3
import hashlib
import random
import math
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .mumbai_data import MUMBAI_LOCATIONS, get_coords

app = FastAPI(title="TransitOS Kernel")
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

@app.post("/book_ticket")
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
    tx_hash = "0x" + hashlib.sha256(tx_data.encode()).hexdigest()[:16]

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

    return {"tx_hash": tx_hash, "fare": round(fare, 2)}

@app.get("/ledger_live")
def get_ledger():
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM ledger ORDER BY timestamp DESC LIMIT 500")
        return [dict(row) for row in c.fetchall()]