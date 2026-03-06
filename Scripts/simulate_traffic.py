import requests
import time
import random

API_URL = "http://localhost:8000/book_ticket"
STATIONS = ["Churchgate", "Dadar", "Bandra", "Andheri", "Borivali", "Ghatkopar", "Thane"]

def simulate_commuter():
    station = random.choice(STATIONS)
    mode = random.choice(["Hybrid", "Metro-Only", "Bus-Only"])
    
    payload = {
        "commuter_name": f"Bot_{random.randint(100,999)}",
        "from_station": station,
        "to_station": "Dadar", # Simplification
        "mode": mode
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 200:
            print(f"✅ Commuter at {station} | Mode: {mode}")
        else:
            print("❌ API Error")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    print("🚀 Starting TransitOS Traffic Simulator...")
    while True:
        simulate_commuter()
        time.sleep(random.uniform(0.5, 2.0))