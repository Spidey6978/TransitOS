import requests
import random
import time
import uuid

API_URL = "http://localhost:8000/sync_offline"
STATIONS_URL = "http://localhost:8000/stations"

def trigger_avalanche(count=10):
    print(f"🌪️ Initiating Offline Avalanche: {count} tickets incoming...")
    
    # --- NEW: Dynamically fetch the official station list from the Kernel ---
    try:
        valid_stations = requests.get(STATIONS_URL).json()
    except Exception as e:
        print(f"🚨 Failed to fetch stations. Is the backend running? Error: {e}")
        return
        
    tickets = []
    for i in range(count):
        # We ensure from_station and to_station are not the same
        start = random.choice(valid_stations)
        end = random.choice([s for s in valid_stations if s != start])
        
        tickets.append({
            "ticket_id": uuid.uuid4().hex,  
            "commuter_name": f"SilverWolf999_{i}",
            "from_station": start,
            "to_station": end,
            "mode": "Hybrid"
        })
    
    payload = {"tickets": tickets}
    
    try:
        start_time = time.time()
        res = requests.post(API_URL, json=payload)
        end_time = time.time()
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ Sync Batch Received. Total: {data['total_received']}")
            for result in data['results']:
                status_icon = "💎" if "0x" in str(result['tx_hash']) else "❌"
                
                if status_icon == "❌":
                    print(f"  {status_icon} {result['commuter']} FAILED: {result.get('status', 'Unknown Error')}")
                else:
                    print(f"  {status_icon} {result['commuter']}: {result['tx_hash']}")
            
            print(f"\n⏱️ Total Process Time: {round(end_time - start_time, 2)}s")
        else:
            print(f"💥 Avalanche Failed: {res.text}")
            
    except Exception as e:
        print(f"🚨 Connection Error: {e}")

if __name__ == "__main__":
    trigger_avalanche(10)