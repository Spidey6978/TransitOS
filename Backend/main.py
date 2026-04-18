
import sqlite3
import math
import json
import uuid
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
from fastapi import HTTPException

# --- Local Imports ---
from Backend.mumbai_data import MUMBAI_LOCATIONS, get_coords
from Backend.models import (OfflineSyncPayload, TicketResponse, SyncResponse, 
                            TicketRequest, ValidateTicketRequest, DriverScanRequest, 
                            FiatWithdrawal, TripLeg, BookPrivateLegsRequest, CancelRequest)
from Backend.web3_bridge import settle_trip_on_chain
from Backend.fare_oracle import TransitFareOracle 
from Backend.osrm_routing import TransitPathfinder 
from Backend.qr_codec import QRMinifier
from Backend.web3_bridge import settle_trip_on_chain, sweep_escrow_on_chain

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
    allow_credentials=True,
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
    if "auto" in mode or "taxi" in mode or "bike" in mode: return "auto"
    return "bus"

def _format_split_for_dashboard(operators_array: list, amounts_wei: list) -> str:
    wallet_names = {v: k for k, v in fare_oracle.operator_wallets.items()}
    # V3: Inject pending gig worker mapping for UI
    wallet_names["0x0000000000000000000000000000000000000000"] = "Pending Driver"
    
    split_str = ""
    for op, wei in zip(operators_array, amounts_wei):
        inr = wei / (10**18)
        name = wallet_names.get(op, f"Driver {op[:6]}").upper()
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

@limiter.limit("30/minute")
@app.post("/book_ticket", response_model=TicketResponse)
def book_ticket(request: Request, ticket: TicketRequest):
    # 🔥 V3 FIX: Removed the strict Ghost Shield here!
    # Gig Transit (Autos) use raw "lat,lng" strings that aren't in the MUMBAI_LOCATIONS dict.
    # We now rely on get_coords() to parse the locations safely.

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT 1 FROM ledger WHERE ticket_id = ? LIMIT 1", (ticket.ticket_id,))
        if c.fetchone():
            raise HTTPException(status_code=409, detail="Duplicate request.")

    actual_adults = ticket.adults
    actual_children = ticket.children
    if ticket.passengers:
        p_dict = ticket.passengers.dict() if hasattr(ticket.passengers, "dict") else ticket.passengers
        actual_adults = p_dict.get("adults", 1)
        actual_children = p_dict.get("children", 0) + p_dict.get("childrenWithSeats", 0)

    start_coords = get_coords(ticket.from_station)
    end_coords = get_coords(ticket.to_station)
    
    # V3 Multi-Leg Parsing
    if not getattr(ticket, "legs", None):
        trip_legs = [{
            "mode": _get_oracle_mode(ticket.mode),
            "from": ticket.from_station,
            "to": ticket.to_station,
            "class": getattr(ticket, "ticket_class", "Standard")
        }]
    else:
        trip_legs = []
        for leg in ticket.legs:
            leg_dict = leg.dict() if hasattr(leg, 'dict') else leg
            trip_legs.append({
                "mode": _get_oracle_mode(leg_dict.get("mode", ticket.mode)),
                "from": leg_dict.get("from_location", leg_dict.get("from", ticket.from_station)),
                "to": leg_dict.get("to_location", leg_dict.get("to", ticket.to_station)),
                "class": getattr(ticket, "ticket_class", "Standard")
            })

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

    dist, route_path_json = pathfinder.fetch_route(
        _get_oracle_mode(ticket.mode),
        ticket.from_station,
        ticket.to_station,
        start_coords[1], start_coords[0],
        end_coords[1], end_coords[0]
    )
    
    # Build composite JSON for route_path to store the Escrow Data for later V3 modifications
    try:
        geom = json.loads(route_path_json)
    except:
        geom = [[start_coords[1], start_coords[0]], [end_coords[1], end_coords[0]]]
        
    composite_route_data = {
        "geometry": geom,
        "escrow": contract_payload
    }

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("INSERT INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
            tx_hash, datetime.now(), ticket.commuter_name,
            ticket.from_station, ticket.to_station, ticket.mode,
            round(dist, 2), round(group_fare, 2), split_info,
            start_coords[1], start_coords[0], end_coords[1], end_coords[0],
            ticket.ticket_id, json.dumps(composite_route_data)
        ))
        conn.commit()

    return TicketResponse(
        status="success", tx_hash=tx_hash, fare=round(group_fare, 2),
        split=split_info, from_station=ticket.from_station,
        to_station=ticket.to_station, distance_km=round(dist, 2)
    )

# --- V4 GIG TRANSIT ENDPOINTS ---
    
@app.post("/book_private_legs")
def book_private_legs(request: BookPrivateLegsRequest):
    """V4: Handles decoupled Gig Transit requests from the frontend"""
    results = []
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        for leg in request.legs:
            # 1. Idempotency Shield (Append leg_id so it doesn't collide with the public ticket)
            leg_ticket_id = f"{request.ticket_id}_private_{leg.leg_id}"
            c.execute("SELECT 1 FROM ledger WHERE ticket_id = ? LIMIT 1", (leg_ticket_id,))
            if c.fetchone():
                continue # Skip if already processed

            actual_adults = request.passengers.adults
            actual_children = request.passengers.children + request.passengers.childrenWithSeats
            
            # 🔥 THE FIX: Calculate total pure headcount for the vehicle capacity
            total_humans = actual_adults + actual_children
            
            start_lat = leg.pickup_coords.lat if leg.pickup_coords else 19.0596
            start_lng = leg.pickup_coords.lng if leg.pickup_coords else 72.8400
            end_lat = leg.drop_coords.lat if leg.drop_coords else 19.1136
            end_lng = leg.drop_coords.lng if leg.drop_coords else 72.8697
            
            # Force OSRM to recalculate the true distance using exact coordinates
            dist, _ = pathfinder.fetch_route("auto", "", "", start_lat, start_lng, end_lat, end_lng)
            
            # 2. Financial Escrow Calculation (Securely re-calculated)
            # 🔥 THE FIX: Pass total_humans to the oracle so it can divide by vehicle capacity (3 for Autos).
            # We REMOVED the `* (actual_adults + 0.5 * actual_children)` multiplication here because
            # the calculate_private_fare function already calculates the total for ALL required vehicles!
            gross_fare = fare_oracle.calculate_private_fare(leg.mode, dist, total_humans)
            net_payout = gross_fare * 0.95
            
            # The 0x000 Placeholder Wallet!
            operators_array = ["0x0000000000000000000000000000000000000000"]
            amounts_array_wei = [int(net_payout * 10**18)]
            total_fare_wei = int(gross_fare * 10**18)
            
            split_info = _format_split_for_dashboard(operators_array, amounts_array_wei)
            
            # 3. Secure Web3 Lock
            tx_hash = settle_trip_on_chain(
                request.commuter_name,
                operators_array,
                amounts_array_wei,
                total_fare_wei
            )
            
            if tx_hash.startswith("ERR_"):
                raise HTTPException(status_code=500, detail=f"Blockchain Settlement Failed: {tx_hash}")
            
            composite_route_data = {
                "geometry": [[start_lng, start_lat], [end_lng, end_lat]], # [lng, lat] for PyDeck GeoJSON
                "escrow": {
                    "operators": operators_array,
                    "amounts_wei": amounts_array_wei,
                    "total_fare_wei": total_fare_wei
                }
            }
            
            c.execute("INSERT INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
                tx_hash, datetime.now(), request.commuter_name,
                leg.pickup_label, leg.drop_label, leg.mode,
                round(dist, 2), round(gross_fare, 2), split_info,
                start_lat, start_lng, end_lat, end_lng,
                leg_ticket_id, json.dumps(composite_route_data)
            ))
            results.append(leg_ticket_id)
        conn.commit()
        
    return {"status": "success", "private_legs_booked": results}


@app.post("/driver_scan")
def driver_handshake(scan: DriverScanRequest):
    """V4: Intercepts driver QR scan, assigns the 0x000 placeholder wallet to the real driver."""
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        
        # 🔥 V4 UPDATE: Search using LIKE to find the specific appended private leg!
        c.execute("SELECT route_path, operator_split, total_fare, ticket_id FROM ledger WHERE ticket_id LIKE ?", (f"{scan.ticket_id}%",))
        rows = c.fetchall()
        
        target_row = None
        for r in rows:
            try:
                rd = json.loads(r[0])
                # Check if this row has the 0x000 placeholder
                if "0x0000000000000000000000000000000000000000" in rd.get("escrow", {}).get("operators", []):
                    target_row = r
                    break
            except:
                continue
                
        if not target_row:
            raise HTTPException(status_code=404, detail="No pending private rides found for this ticket.")
        
        route_data = json.loads(target_row[0])
        escrow = route_data["escrow"]
        actual_ticket_id = target_row[3]  # The specific leg_id row
        
        operators = escrow["operators"]
        amounts = escrow["amounts_wei"]
        
        # Find the placeholder index
        placeholder_idx = operators.index("0x0000000000000000000000000000000000000000")
        
        # Perform Handshake
        operators[placeholder_idx] = scan.driver_wallet
        driver_cut = amounts[placeholder_idx] / 10**18
        
        # Update DB objects
        escrow["operators"] = operators
        route_data["escrow"] = escrow
        new_split_info = _format_split_for_dashboard(operators, amounts)
        
        c.execute("UPDATE ledger SET route_path = ?, operator_split = ? WHERE ticket_id = ?", 
                 (json.dumps(route_data), new_split_info, actual_ticket_id))
        conn.commit()

    return {
        "status": "handshake_complete", 
        "driver_assigned": scan.driver_wallet,
        "payout_locked_inr": round(driver_cut, 2)
    }

@app.post("/withdraw_fiat")
def withdraw_fiat(payload: FiatWithdrawal):
    """V3: Mocks the Instant IMPS Off-Ramp API."""
    return {
        "status": "success", 
        "amount_withdrawn": payload.amount_inr, 
        "bank_ref": f"IMPS-{uuid.uuid4().hex[:8].upper()}",
        "message": "Funds instantly settled to linked HDFC account."
    }

# --- OFFLINE SYNC ---

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

                # 🔥 V3 FIX: Removed strict Ghost Shield for custom offline Auto addresses
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
                    adults=ticket.get("adults", 1),
                    children=ticket.get("children", 0)
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
                
                # THE CIRCUIT BREAKER
                if tx_hash.startswith("ERR_"):
                    raise Exception(f"Blockchain Settlement Failed: {tx_hash}")
                
                # V3: Store the exact same composite JSON structure as book_ticket
                try:
                    geom = json.loads(route_path_json)
                except:
                    geom = [[start_coords[1], start_coords[0]], [end_coords[1], end_coords[0]]]
                    
                composite_route_data = json.dumps({
                    "geometry": geom,
                    "escrow": contract_payload
                })

                # 6. LEDGER COMMIT
                c.execute("INSERT OR IGNORE INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
                    tx_hash, datetime.now(), ticket["commuter_name"],
                    f_station, t_station, mode,
                    round(dist, 2), round(fare, 2), split_info,
                    start_coords[1], start_coords[0], end_coords[1], end_coords[0],
                    composite_ticket_id, composite_route_data # 🔥 Saved with composite ID!
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
class CancelRequest(BaseModel):
    ticket_id: str
    leg_id: str
    reason: str = "User requested cancellation"

@app.post("/driver_cancel")
def driver_cancel(payload: CancelRequest):
    """
    Triggered when a Gig Worker cancels the ride.
    Commuter gets 100% of their money back. TransitOS eats the gas cost.
    """
    leg_ticket_id = f"{payload.ticket_id}_private_{payload.leg_id}"
    
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        # 🔥 FIX: Querying route_path (the JSON column) instead of operator_split
        c.execute("SELECT total_fare, mode, route_path FROM ledger WHERE ticket_id = ?", (leg_ticket_id,))
        row = c.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Private Leg not found")
        if "CANCELLED" in row[1]:
            raise HTTPException(status_code=400, detail="Leg already cancelled")
            
        gross_fare = row[0]
        # Safely parse the JSON route data
        route_data = json.loads(row[2]) if row[2] else {}
        operators = route_data.get("escrow", {}).get("operators", [])
        
        # Verify it hasn't been handshaked by another driver yet
        if "0x0000000000000000000000000000000000000000" not in operators:
            raise HTTPException(status_code=400, detail="Cannot cancel: A driver has already claimed this escrow.")
            
        # The driver's specific 95% cut is what sits in the 0x000 wallet
        refund_amount_wei = int(gross_fare * 0.95 * 10**18) 
        
        # 1. Trigger the Smart Contract Sweep
        tx_hash = sweep_escrow_on_chain(refund_amount_wei)
        if tx_hash.startswith("ERR_"):
            raise HTTPException(status_code=500, detail="Blockchain sweep failed")
        
        # 2. Mark as Cancelled in the database so it can't be scanned
        new_mode = f"{row[1]} (CANCELLED)"
        c.execute("UPDATE ledger SET mode = ? WHERE ticket_id = ?", (new_mode, leg_ticket_id))
        conn.commit()
        
    return {
        "status": "refund_swept",
        "refund_amount_inr": gross_fare, # 100% Refund
        "message": "Funds returned to treasury. UI should credit commuter wallet."
    }

class CancelRequest(BaseModel):
    ticket_id: str
    leg_id: str = "1"
    reason: str = "User requested cancellation"

@app.post("/user_cancel")
def user_cancel(payload: CancelRequest):
    """
    Triggered when the Commuter cancels the ride before a driver arrives.
    Applies the ₹0.50 Gas-Pegged Micro-Fee to prevent network griefing.
    """
    # Handle both formats: with and without _private_ suffix
    leg_ticket_id = payload.ticket_id
    if "_private_" not in leg_ticket_id:
        leg_ticket_id = f"{payload.ticket_id}_private_{payload.leg_id}"
   
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        # Try exact match first, then search with LIKE
        c.execute("SELECT total_fare, mode, route_path FROM ledger WHERE ticket_id = ?", (leg_ticket_id,))
        row = c.fetchone()
       
        if not row:
            # Try searching without the _private_ suffix
            c.execute("SELECT total_fare, mode, route_path FROM ledger WHERE ticket_id LIKE ?", (f"%{payload.ticket_id}%",))
            row = c.fetchone()
       
        if not row:
            raise HTTPException(status_code=404, detail=f"Ticket not found: {leg_ticket_id}")
       
        if "CANCELLED" in row[1]:
            raise HTTPException(status_code=400, detail="Leg already cancelled")
       
        gross_fare = row[0]
        route_data = json.loads(row[2]) if row[2] else {}
        operators = route_data.get("escrow", {}).get("operators", [])
       
        # For regular tickets (not gig transit), allow cancellation
        # For gig transit tickets with driver assigned, block cancellation
        if operators and "0x0000000000000000000000000000000000000000" not in operators:
            raise HTTPException(status_code=400, detail="Cannot cancel: Driver is already assigned and en route.")
       
        # Mark as cancelled
        new_mode = f"{row[1]} (CANCELLED)"
        c.execute("UPDATE ledger SET mode = ? WHERE ticket_id = ? OR ticket_id LIKE ?",
                 (new_mode, leg_ticket_id, f"%{payload.ticket_id}%"))
        conn.commit()
   
    # Apply the ₹0.50 Anti-Griefing Micro-Fee
    net_refund = max(0, gross_fare - 0.50)
   
    return {
        "status": "success",
        "refund_amount": round(net_refund, 2),
        "cancellation_fee": 0.50,
        "message": "Ride cancelled. Micro-fee applied. Commuter wallet credited."
    }
class TripCompleteRequest(BaseModel):
    trip_id: str

class WithdrawRequest(BaseModel):
    amount: float = None

# Mock state for the hackathon demo
driver_mock_state = {
    "balance": 1250.00,
    "pending_escrow": 0.0,
    "lifetime_earnings": 4500.00
}

@app.get("/driver_wallet")
def get_driver_wallet():
    """Powers the Earnings tab for the Driver UI"""
    return driver_mock_state

@app.get("/active_trip")
def get_active_trip():
    """Checks if driver is currently assigned to a trip"""
    return {} # Return empty dict to show Scanner by default

@app.post("/complete_trip")
def complete_driver_trip(req: TripCompleteRequest):
    """Releases the smart contract escrow to the driver's wallet"""
    # In reality, this triggers Web3. For the UI demo:
    driver_mock_state["balance"] += 145.50
    return {"status": "success", "message": "Funds released from Escrow", "fare_released": 145.50}

@app.post("/withdraw_fiat")
def withdraw_driver_fiat(req: WithdrawRequest):
    """Triggers the Nodal Bank IMPS API to cash out the driver"""
    withdraw_amount = req.amount if req.amount else driver_mock_state["balance"]
    
    if withdraw_amount > driver_mock_state["balance"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
        
    driver_mock_state["balance"] -= withdraw_amount
    return {
        "status": "success", 
        "amount_credited": withdraw_amount,
        "message": "IMPS Transfer Initiated"
    }