import requests
import random
import time
import uuid

API_URL = "http://localhost:8000/sync_offline"
STATIONS_URL = "http://localhost:8000/stations"

def trigger_avalanche(count=10):
    print(f"🌪️ Initiating V2 Offline Avalanche: {count} minified QRs incoming...")
    
    try:
        valid_stations = requests.get(STATIONS_URL).json()
    except Exception as e:
        print(f"🚨 Failed to fetch stations. Is the backend running? Error: {e}")
        return
        
    scanned_qrs = []
    for i in range(count):
        start = random.choice(valid_stations)
        end = random.choice([s for s in valid_stations if s != start])
        mode = random.choice(["Metro", "Local Train", "Bus"])
        
        short_id = uuid.uuid4().hex[:8]
        f_code = start[:3].upper()
        t_code = end[:3].upper()
        m_code = mode[0].upper()
        adults = random.randint(1, 4)
        children = random.randint(0, 3)
        
        qr_string = f"TKT|{short_id}|{f_code}|{t_code}|{m_code}|{adults}|{children}"
        scanned_qrs.append(qr_string)
    
    payload = {
        "scanner_mode": "Metro", 
        "scanned_qrs": scanned_qrs
    }
    
    try:
        start_time = time.time()
        res = requests.post(API_URL, json=payload)
        end_time = time.time()
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ Sync Batch Received. Total: {data['total_received']}")
            for result in data['results']:
                status_icon = "💎" if result.get('tx_hash') else "❌"
                
                if status_icon == "❌":
                    print(f"  {status_icon} [QR: {result['qr']}] FAILED: {result.get('status', 'Unknown Error')}")
                else:
                    print(f"  {status_icon} [QR: {result['qr']}]: {result['tx_hash'][:14]}...")
            
            print(f"\n⏱️ Total Process Time: {round(end_time - start_time, 2)}s")
        else:
            print(f"💥 Avalanche Failed: {res.text}")
            
    except Exception as e:
        print(f"🚨 Connection Error: {e}")

if __name__ == "__main__":
    trigger_avalanche(10)