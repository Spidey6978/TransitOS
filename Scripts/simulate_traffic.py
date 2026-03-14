import requests
import time
import random

# Pointing to Dev 2's FastAPI backend
API_URL = "http://localhost:8000/book_ticket"
STATIONS = ["Churchgate", "Dadar", "Bandra", "Andheri", "Borivali", "Ghatkopar", "Thane"]
MODES = ["Local Train", "Metro", "AC Metro", "Hybrid", "Ferry"]

def send_commuter():
    start = random.choice(STATIONS)
    end = random.choice(STATIONS)
    while start == end: 
        end = random.choice(STATIONS)
        
    payload = {
        "commuter_name": f"DemoUser_{random.randint(1000,9999)}",
        "from_station": start,
        "to_station": end,
        "mode": random.choice(MODES)
    }
    
    try:
        print(f"📡 Routing {payload['commuter_name']} ({start} -> {end}) via {payload['mode']}...")
        res = requests.post(API_URL, json=payload)
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ Settled! Hash: {data.get('tx_hash')} | Fare: ₹{data.get('fare')}")
        elif res.status_code == 429:
            print("⚠️ Rate Limit Hit! Throttling down...")
            time.sleep(5) # Penalty sleep
        else:
            print(f"❌ Server Error: {res.text}")
            
    except Exception as e:
        print(f"🚨 Network Error: {e}")

if __name__ == "__main__":
    print("🚀 Booting TransitOS Load Tester (Rate Limit Compliant)...")
    while True:
        send_commuter()
        # Sleep for 2.5 seconds (Guarantees max 24 requests/minute, safely under the 30 limit)
        time.sleep(2.5)