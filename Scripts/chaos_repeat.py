import requests
import time

API_URL = "http://localhost:8000/book_ticket"

def trigger_replay_attack():
    print("🔄 Initiating Replay Attack (Double-Charge Exploit)...")
    
    payload = {
        "ticket_id": "REPLAY_TEST_UUID_SILVER_WOLF_999",  
        "commuter_name": "Glitch_Commuter_01",
        "from_station": "Churchgate",
        "to_station": "Bandra",
        "mode": "Local Train"
    }
    
    print("Spamming the EXACT same ticket 5 times in a row...\n")
    
    for i in range(1, 6):
        try:
            res = requests.post(API_URL, json=payload)
            if res.status_code == 200:
                data = res.json()
                print(f"⚠️ [Charge {i}] SUCCESS: User charged ₹{data['fare']}! Tx: {data['tx_hash'][:14]}...")
            else:
                print(f"🛡️ [Attempt {i}] REJECTED: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"🚨 Network Error: {e}")
            
        time.sleep(0.2)  # Tiny delay just to ensure the requests fire sequentially

if __name__ == "__main__":
    trigger_replay_attack()