import requests
import random
import time
import uuid

# Target the local endpoint (since this script runs on the same laptop as the API)
API_URL = "https://touchily-steamerless-alyssa.ngrok-free.dev/book_ticket"
STATIONS_URL = "https://touchily-steamerless-alyssa.ngrok-free.dev/stations"

def run_simulator(delay_seconds=3):
    print("🚦 Booting TransitOS Live Traffic Simulator...")
    
    # 1. Fetch valid stations from the Kernel
    try:
        valid_stations = requests.get(STATIONS_URL).json()
        print(f"✅ Loaded {len(valid_stations)} stations from the DB.")
    except Exception as e:
        print(f"🚨 Kernel unreachable! Is Uvicorn running? Error: {e}")
        return

    modes = ["Local Train", "Metro", "Hybrid", "AC Local"]

    print(f"⚡ Commencing infinite traffic loop ({delay_seconds}s delay). Press Ctrl+C to stop.\n")
    
    ticket_count = 0
    while True:
        try:
            start = random.choice(valid_stations)
            end = random.choice([s for s in valid_stations if s != start])
            
            # 2. The Idempotency Key (UUID)
            payload = {
                "ticket_id": uuid.uuid4().hex,  # Generates a unique ID every single loop!
                "commuter_name": f"SimNode_{random.randint(1000, 9999)}",
                "from_station": start,
                "to_station": end,
                "mode": random.choice(modes)
            }
            
            # 3. Fire the request
            res = requests.post(API_URL, json=payload)
            
            if res.status_code == 200:
                data = res.json()
                ticket_count += 1
                status = "💎" if "0x" in str(data.get('tx_hash')) else "✅"
                print(f"[{ticket_count}] {status} {start} -> {end} | Fare: ₹{data['fare']} | Tx: {data['tx_hash'][:12]}...")
            elif res.status_code == 429:
                print(f"⏳ Rate Limited! Slowing down...")
                time.sleep(5) # Back off if we hit the 30/min limit
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
    # Adjust this delay to control how fast the map updates
    run_simulator(delay_seconds=10)