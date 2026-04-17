import requests
import time

API_URL = "http://localhost:8000/book_ticket"

def trigger_replay_attack():
    print("🔄 Initiating V2 Replay Attack (Group Ticket Double-Charge Exploit)...")
    
    # A perfectly valid V2 ticket payload WITH a static Idempotency Key
    payload = {
        "ticket_id": "REPLAY_V2_UUID_999",
        "commuter_name": "Glitch_Commuter_01",
        "from_station": "Churchgate",
        "to_station": "Bandra",
        "mode": "Local Train",
        "ticket_class": "1st",
        "adults": 3,
        "children": 2
    }
    
    print("Spamming the EXACT same Family Ticket 5 times in a row...\n")
    
    for i in range(1, 6):
        try:
            res = requests.post(API_URL, json=payload)
            if res.status_code == 200:
                data = res.json()
                # 🛡️ In V2, the Idempotency Shield returns a 200 but flags "ALREADY_SYNCED" in the split!
                if "ALREADY_SYNCED" in data.get("split", ""):
                    print(f"🛡️ [Attempt {i}] BLOCKED BY IDEMPOTENCY: Wallet protected. (Status: 200, Split: ALREADY_SYNCED)")
                else:
                    print(f"⚠️ [Charge {i}] SUCCESS: User charged ₹{data['fare']}! Tx: {data['tx_hash'][:14]}...")
            elif res.status_code == 422:
                print(f"⚠️ [Attempt {i}] PYDANTIC BLOCK: Schema mismatch.")
            else:
                print(f"🛡️ [Attempt {i}] REJECTED: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"🚨 Network Error: {e}")
            
        time.sleep(0.2)  

if __name__ == "__main__":
    trigger_replay_attack()