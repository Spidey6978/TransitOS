import sqlite3
import math
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
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
from Backend.models import OfflineSyncPayload, TicketResponse, SyncResponse, TicketRequest, ValidateTicketRequest
from Backend.web3_bridge import settle_trip_on_chain
from Backend.fare_oracle import TransitFareOracle 
from Backend.osrm_routing import TransitPathfinder 
from Backend.qr_codec import QRMinifier

load_dotenv()

fare_oracle = TransitFareOracle()
pathfinder = TransitPathfinder()

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
                ticket_id TEXT UNIQUE,
                route_path TEXT -- <-- NEW COLUMN FOR OSRM GEOMETRY
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

def _get_oracle_mode(ui_mode: str) -> str:
    mode = ui_mode.lower()
    if "train" in mode: return "train"
    if "metro" in mode: return "metro"
    return "bus"

def _format_split_for_dashboard(operators_array: list, amounts_wei: list) -> str:
    wallet_names = {v: k for k, v in fare_oracle.operator_wallets.items()}
    split_str = ""
    for op, wei in zip(operators_array, amounts_wei):
        inr = wei / (10**18)
        name = wallet_names.get(op, "Operator").upper()
        split_str += f"{name}: ₹{inr:.2f} | "
    
    total_inr = sum(amounts_wei) / (10**18) / 0.95
    split_str += f"TRANSITOS: ₹{(total_inr * 0.05):.2f}"
    return split_str

# --- ENDPOINTS ---

@app.get("/health")
def health_check():
    return {"status": "online", "database": "connected", "web3": "active"}

@app.get("/stations")
def get_stations():
    return list(MUMBAI_LOCATIONS.keys())

@app.get("/routes")
def get_routes(from_station: str, to_station: str):
    # The Ghost Shield
    if from_station not in MUMBAI_LOCATIONS or to_station not in MUMBAI_LOCATIONS:
        raise HTTPException(status_code=400, detail="Invalid stations")
        
    lon1, lat1 = MUMBAI_LOCATIONS[from_station]
    lon2, lat2 = MUMBAI_LOCATIONS[to_station]
    
    # ==========================================
    # OPTION 1: Direct Train (The Federal Route)
    # ==========================================
    dist_train, geom_train = pathfinder.fetch_route("train", from_station, to_station, lat1, lon1, lat2, lon2)
    leg_train = [{"mode": "train", "from": from_station, "to": to_station, "class": "2nd"}]
    fare_train = fare_oracle.calculate_settlement_payload(leg_train)["total_fare_inr"]
    time_train = int(dist_train * 2.5) + 10
    
    route_1_leg = {
        "mode": "Local Train", "from_station": from_station, "to_station": to_station, 
        # 🔥 THE SHOTGUN LEGS: Guaranteeing the UI loop catches the time!
        "duration": time_train, "estimated_time": time_train, "estimatedTime": time_train, "time": time_train, "time_mins": time_train,
        "distance": dist_train, "distance_km": dist_train, "distanceKm": dist_train,
        "fare": fare_train, "total_fare": fare_train, "totalFare": fare_train, "price": fare_train
    }
    
    route_1 = {
        "id": 1, "mode": "Local Train (Western)", "transfers": 0,
        "duration": time_train, "estimated_time": time_train, "estimatedTime": time_train, "time": time_train, "time_mins": time_train,
        "distance": dist_train, "distance_km": dist_train, "distanceKm": dist_train,
        "fare": fare_train, "total_fare": fare_train, "totalFare": fare_train, "price": fare_train,
        "legs": [route_1_leg]
    }
    
    # ==========================================
    # OPTION 2: Hybrid (Train + Metro)
    # ==========================================
    dist_leg1, _ = pathfinder.fetch_route("train", from_station, "Dadar", lat1, lon1, 19.0178, 72.8436)
    dist_leg2, _ = pathfinder.fetch_route("metro", "Dadar", to_station, 19.0178, 72.8436, lat2, lon2)
    
    hybrid_legs = [
        {"mode": "train", "from": from_station, "to": "Dadar", "class": "2nd"},
        {"mode": "metro", "from": "Dadar", "to": to_station, "class": "Standard"}
    ]
    fare_hybrid = fare_oracle.calculate_settlement_payload(hybrid_legs)["total_fare_inr"]
    
    dist_hybrid = round(dist_leg1 + dist_leg2, 1)
    time_hybrid = int((dist_leg1 + dist_leg2) * 3.5) + 15
    
    fare_leg1 = fare_oracle.calculate_settlement_payload([hybrid_legs[0]])["total_fare_inr"]
    time_leg1 = int(dist_leg1 * 1.5) + 5
    
    fare_leg2 = fare_oracle.calculate_settlement_payload([hybrid_legs[1]])["total_fare_inr"]
    time_leg2 = int(dist_leg2 * 2.0) + 10
    
    route_2_leg1 = {
        "mode": "Local Train", "from_station": from_station, "to_station": "Dadar", 
        "duration": time_leg1, "estimated_time": time_leg1, "estimatedTime": time_leg1, "time": time_leg1, "time_mins": time_leg1,
        "distance": dist_leg1, "distance_km": dist_leg1, "distanceKm": dist_leg1, 
        "fare": fare_leg1, "total_fare": fare_leg1, "totalFare": fare_leg1, "price": fare_leg1
    }
    
    route_2_leg2 = {
        "mode": "Metro", "from_station": "Dadar", "to_station": to_station, 
        "duration": time_leg2, "estimated_time": time_leg2, "estimatedTime": time_leg2, "time": time_leg2, "time_mins": time_leg2,
        "distance": dist_leg2, "distance_km": dist_leg2, "distanceKm": dist_leg2,
        "fare": fare_leg2, "total_fare": fare_leg2, "totalFare": fare_leg2, "price": fare_leg2
    }
    
    route_2 = {
        "id": 2, "mode": "Hybrid", "transfers": 1,
        "duration": time_hybrid, "estimated_time": time_hybrid, "estimatedTime": time_hybrid, "time": time_hybrid, "time_mins": time_hybrid,
        "distance": dist_hybrid, "distance_km": dist_hybrid, "distanceKm": dist_hybrid,
        "fare": fare_hybrid, "total_fare": fare_hybrid, "totalFare": fare_hybrid, "price": fare_hybrid,
        "legs": [route_2_leg1, route_2_leg2]
    }
    
    # ==========================================
    # OPTION 3: BEST Bus (The Municipal Route)
    # ==========================================
    dist_bus, geom_bus = pathfinder.fetch_route("bus", from_station, to_station, lat1, lon1, lat2, lon2)
    leg_bus = [{"mode": "bus", "from": from_station, "to": to_station, "type": "long", "ac": True}]
    fare_bus = fare_oracle.calculate_settlement_payload(leg_bus)["total_fare_inr"]
    time_bus = int(dist_bus * 5.0) + 20
    
    route_3_leg = {
        "mode": "BEST Bus", "from_station": from_station, "to_station": to_station, 
        "duration": time_bus, "estimated_time": time_bus, "estimatedTime": time_bus, "time": time_bus, "time_mins": time_bus,
        "distance": dist_bus, "distance_km": dist_bus, "distanceKm": dist_bus, 
        "fare": fare_bus, "total_fare": fare_bus, "totalFare": fare_bus, "price": fare_bus
    }
    
    route_3 = {
        "id": 3, "mode": "BEST Bus", "transfers": 0,
        "duration": time_bus, "estimated_time": time_bus, "estimatedTime": time_bus, "time": time_bus, "time_mins": time_bus,
        "distance": dist_bus, "distance_km": dist_bus, "distanceKm": dist_bus,
        "fare": fare_bus, "total_fare": fare_bus, "totalFare": fare_bus, "price": fare_bus,
        "legs": [route_3_leg]
    }
    
    routes_array = [route_1, route_2, route_3]
    
    # SHOTGUN RESPONSE
    return {
        "status": "success",
        "data": routes_array,
        "routes": routes_array
    }

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
    if ticket.from_station not in MUMBAI_LOCATIONS or ticket.to_station not in MUMBAI_LOCATIONS:
        raise HTTPException(status_code=400, detail="Invalid route.")

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT 1 FROM ledger WHERE ticket_id = ? LIMIT 1", (ticket.ticket_id,))
        if c.fetchone():
            raise HTTPException(status_code=409, detail="Duplicate request.")

    actual_adults = ticket.adults
    actual_children = ticket.children
    if ticket.passengers:
        actual_adults = ticket.passengers.get("adults", 1)
        # Sum both child types Dev 2 created
        actual_children = ticket.passengers.get("children", 0) + ticket.passengers.get("childrenWithSeats", 0)

    start_coords = get_coords(ticket.from_station)
    end_coords = get_coords(ticket.to_station)
    
    dist, route_path_json = pathfinder.fetch_route(
        _get_oracle_mode(ticket.mode),
        ticket.from_station,
        ticket.to_station,
        start_coords[1], start_coords[0],
        end_coords[1], end_coords[0]
    )

    trip_legs = [{
        "mode": _get_oracle_mode(ticket.mode),
        "from": ticket.from_station,
        "to": ticket.to_station,
        "class": ticket.ticket_class
    }]

    settlement_data = fare_oracle.calculate_settlement_payload(
        trip_legs,
        adults=actual_adults,
        children=actual_children
    )
    contract_payload = settlement_data["contract_payload"]
    group_fare = settlement_data["total_fare_inr"]
    split_info = _format_split_for_dashboard(
        contract_payload["operators"], contract_payload["amounts_wei"]
    )

    tx_hash = settle_trip_on_chain(
        ticket.commuter_name,
        contract_payload["operators"],
        contract_payload["amounts_wei"],
        contract_payload["total_fare_wei"]
    )

    # 🔥 THE CIRCUIT BREAKER: Prevent Web3 errors from poisoning SQLite
    if tx_hash.startswith("ERR_"):
        raise HTTPException(status_code=500, detail=f"Blockchain Settlement Failed: {tx_hash}")

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("INSERT INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
            tx_hash, datetime.now(), ticket.commuter_name,
            ticket.from_station, ticket.to_station, ticket.mode,
            round(dist, 2), round(group_fare, 2), split_info,
            start_coords[1], start_coords[0], end_coords[1], end_coords[0],
            ticket.ticket_id, route_path_json
        ))
        conn.commit()

    return TicketResponse(
        status="success", tx_hash=tx_hash, fare=round(group_fare, 2),
        split=split_info, from_station=ticket.from_station,
        to_station=ticket.to_station, distance_km=round(dist, 2)
    )

@app.post("/sync_offline", response_model=SyncResponse)
def sync_offline(payload: OfflineSyncPayload):
    results = []
    success_count = 0
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        
        for raw_qr in payload.scanned_qrs:
            try:
                # 1. DECODE & VERIFY (The Shrink Ray Reversal)
                ticket = QRMinifier.decode_scanned_qr(raw_qr, commuter_name="Offline_Commuter")
                
                f_station = ticket["from_station"]
                t_station = ticket["to_station"]
                mode = ticket["mode"]
                
                # Composite Validation Key
                # Combines the Ticket UUID with the Conductor's Mode (e.g. "a1b2_Metro")
                composite_ticket_id = f"{ticket['ticket_id']}_{payload.scanner_mode}"
                
                # 🛡️ THE NEW IDEMPOTENCY SHIELD
                c.execute("SELECT 1 FROM ledger WHERE ticket_id = ?", (composite_ticket_id,))
                if c.fetchone():
                    results.append({"qr": raw_qr[:10], "tx_hash": None, "status": f"Skipped - Already Synced by {payload.scanner_mode}"})
                    continue

                # 2. GHOST SHIELD
                if f_station not in MUMBAI_LOCATIONS or t_station not in MUMBAI_LOCATIONS:
                    raise Exception(f"Invalid route: {f_station} to {t_station}")
                    
                start_coords = get_coords(f_station)
                end_coords = get_coords(t_station)
                
                # 3. PATHFINDING
                dist, route_path_json = pathfinder.fetch_route(
                    _get_oracle_mode(mode),
                    f_station, t_station,
                    start_coords[1], start_coords[0], 
                    end_coords[1], end_coords[0]
                )
                
                # 4. FARE ORACLE
                trip_legs = [{
                    "mode": _get_oracle_mode(mode),
                    "from": f_station,
                    "to": t_station,
                    "class": ticket.get("ticket_class", "Standard")
                }]
                
                settlement_data = fare_oracle.calculate_settlement_payload(
                    trip_legs, 
                    adults=ticket["adults"],
                    children=ticket["children"]
                )
                contract_payload = settlement_data["contract_payload"]
                fare = settlement_data["total_fare_inr"]
                split_info = _format_split_for_dashboard(contract_payload["operators"], contract_payload["amounts_wei"])

                # 5. WEB3 BRIDGE
                tx_hash = settle_trip_on_chain(
                    ticket["commuter_name"], 
                    contract_payload["operators"],
                    contract_payload["amounts_wei"],
                    contract_payload["total_fare_wei"]
                )
                
                # 🔥 THE CIRCUIT BREAKER
                if tx_hash.startswith("ERR_"):
                    raise Exception(f"Blockchain Settlement Failed: {tx_hash}")
                
                # 6. LEDGER COMMIT
                c.execute("INSERT OR IGNORE INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
                    tx_hash, datetime.now(), ticket["commuter_name"],
                    f_station, t_station, mode,
                    round(dist, 2), round(fare, 2), split_info,
                    start_coords[1], start_coords[0], end_coords[1], end_coords[0],
                    composite_ticket_id, route_path_json # 🔥 Saved with composite ID!
                ))
                results.append({"qr": raw_qr[:10], "tx_hash": tx_hash, "status": "saved"})
                success_count += 1
                
            except ValueError as ve:
                # Instantly catch tampered QR codes without crashing the batch
                results.append({"qr": raw_qr[:10], "tx_hash": None, "status": f"Tamper Blocked: {str(ve)}"})
            except Exception as e:
                results.append({"qr": raw_qr[:10], "tx_hash": None, "status": f"failed: {str(e)}"})
        conn.commit()
        
    return SyncResponse(status="Batch Processed", total_received=success_count, results=results)

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

@app.post("/validate_ticket")
def validate_ticket(payload: ValidateTicketRequest):
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        # Search for the ticket in the ledger
        c.execute("SELECT * FROM ledger WHERE ticket_id = ? OR ticket_id LIKE ? LIMIT 1", 
                  (payload.ticket_id, f"{payload.ticket_id}%"))
        row = c.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Ticket not found in global ledger")
        
        ticket = dict(row)
        # Check expiry (if your ledger stores valid_until, otherwise assume 3h from timestamp)
        # Note: In your current main.py, you don't store valid_until in SQLite. 
        # We can calculate it as 3 hours after the issued timestamp.
        issued_dt = datetime.strptime(ticket['timestamp'], '%Y-%m-%d %H:%M:%S.%f')
        if (datetime.now() - issued_dt).total_seconds() > 3 * 3600:
             return {"valid": False, "reason": "Ticket expired", "parsed": ticket}

        return {"valid": True, "reason": "Verified via Backend Ledger", "parsed": ticket}
