import requests
import random
import time
from datetime import datetime

API_URL = "http://localhost:8000/sync_offline"
STATIONS = ["Churchgate", "Dadar", "Bandra", "Andheri", "Borivali"]

def trigger_avalanche(count=20):
    print(f"🌪️ Initiating Offline Avalanche: {count} tickets incoming...")
    
    tickets = []
    for i in range(count):
        tickets.append({
            "commuter_name": f"ChaosUser_{i}",
            "from_station": random.choice(STATIONS),
            "to_station": random.choice(STATIONS),
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
                print(f"  {status_icon} {result['commuter']}: {result['tx_hash']}")
            
            print(f"\n⏱️ Total Process Time: {round(end_time - start_time, 2)}s")
        else:
            print(f"💥 Avalanche Failed: {res.text}")
            
    except Exception as e:
        print(f"🚨 Connection Error: {e}")

if __name__ == "__main__":
    trigger_avalanche(20)