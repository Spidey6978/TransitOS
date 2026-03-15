import requests
import time

API_URL = "http://localhost:8000/book_ticket"

def trigger_ghost_station():
    print("👻 Injecting Ghost Station data into the Kernel...")
    
    # Notice the fake stations
    poison_payload = {
        "commuter_name": "Phantom_User_99",
        "from_station": "Atlantis Sub-Level 4",
        "to_station": "Gotham City Central",
        "mode": "Metro"
    }
    
    try:
        res = requests.post(API_URL, json=poison_payload)
        
        if res.status_code == 200:
            print(f"❌ VULNERABILITY FOUND: The backend accepted fake stations!")
            print(res.json())
        elif res.status_code == 500:
            print(f"💥 CRASH SUCCESSFUL: The backend math engine exploded (500 Error).")
            print("Check Terminal 1 to see the Haversine traceback!")
        else:
            print(f"🛡️ SHIELD HELD: The backend cleanly rejected it. Status: {res.status_code}")
            print(f"Response: {res.text}")
            
    except Exception as e:
        print(f"🚨 Network Error: {e}")

if __name__ == "__main__":
    trigger_ghost_station()