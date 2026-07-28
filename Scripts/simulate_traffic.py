import requests
import random
import time
import uuid

# Use localhost to avoid spamming your own Ngrok tunnel limits during stress tests
API_URL = "http://localhost:8000/book_ticket"
STATIONS_URL = "http://localhost:8000/stations"

# The "Golden Routes" - The exact paths we hardcoded in osrm_routing.py
# Hitting these ensures the Streamlit dashboard draws the curvy GTFS tracks!
GOLDEN_ROUTES = [
    {"from": "Dahisar", "to": "WEH", "mode": "Metro", "classes": ["Standard"]},
    {"from": "WEH", "to": "Dahisar", "mode": "Metro", "classes": ["Standard"]},
    {"from": "Andheri", "to": "Churchgate", "mode": "Local Train", "classes": ["1st", "2nd", "AC"]},
    {"from": "Churchgate", "to": "Andheri", "mode": "Local Train", "classes": ["1st", "2nd", "AC"]}
]

def run_v2_simulator(delay_seconds=3):
    print("🚦 Booting TransitOS V2 Traffic Simulator...")
    print("🧠 Features Active: Group Ticketing, GTFS Bias, Dynamic EVM Arrays\n")
    
    # 1. Fetch valid stations from the Kernel
    try:
        valid_stations = requests.get(STATIONS_URL).json()
        print(f"✅ Loaded {len(valid_stations)} stations from the DB.")
    except Exception as e:
        print(f"🚨 Kernel unreachable! Is Uvicorn running on port 8000? Error: {e}")
        return

    print(f"⚡ Commencing infinite traffic loop ({delay_seconds}s delay). Press Ctrl+C to stop.\n")
    
    ticket_count = 0
    while True:
        try:
            # 80% chance to use a Golden Route for maximum 3D visual impact on the map
            if random.random() < 0.8:
                route = random.choice(GOLDEN_ROUTES)
                start = route["from"]
                end = route["to"]
                mode = route["mode"]
                ticket_class = random.choice(route["classes"])
            else:
                # 20% random chaos for background heatmaps
                start = random.choice(valid_stations)
                end = random.choice([s for s in valid_stations if s != start])
                mode = random.choice(["Local Train", "Metro", "Bus"])
                ticket_class = random.choice(["1st", "2nd", "Standard", "AC"])

            # V2 Group Ticketing Logic (Adults + Children)
            adults = random.randint(1, 4)
            children = random.randint(0, 3)

            # 2. The V2 Idempotency Payload
            payload = {
                "ticket_id": uuid.uuid4().hex,
                "commuter_name": f"SimNode_{random.randint(1000, 9999)}",
                "from_station": start,
                "to_station": end,
                "mode": mode,
                "ticket_class": ticket_class,
                "adults": adults,
                "children": children
            }
            
            # 3. Fire the request
            res = requests.post(API_URL, json=payload)
            
            if res.status_code == 200:
                data = res.json()
                ticket_count += 1
                status = "💎" if "0x" in str(data.get('tx_hash')) else "✅"
                
                # V2 Terminal Output
                group_str = f"{adults}A/{children}C"
                print(f"[{ticket_count}] {status} {start} -> {end} | {mode} ({ticket_class}) | Group: {group_str} | Fare: ₹{data['fare']} | Tx: {data['tx_hash'][:10]}...")
                
            elif res.status_code == 429:
                print(f"⏳ Rate Limited! Slowing down for 5 seconds...")
                time.sleep(5) 
            else:
                print(f"⚠️ Blocked: {res.status_code} - {res.text}")
                
            time.sleep(delay_seconds)
            
        except KeyboardInterrupt:
            print("\n🛑 Simulator terminated by user.")
            break
        except Exception as e:
            print(f"🚨 Network drop: {e}")
            time.sleep(5) 

if __name__ == "__main__":
    # Fast 2-second delay to quickly populate the map for the presentation video
    run_v2_simulator(delay_seconds=2)