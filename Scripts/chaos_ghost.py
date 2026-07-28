import requests
import uuid

API_URL = "http://localhost:8000/book_ticket"

def trigger_ghost_station():
    print("👻 Injecting Ghost Station data into the V2 Kernel...")
    
    # Notice the fake stations, but mathematically perfect V2 payload structure
    poison_payload = {
        "ticket_id": uuid.uuid4().hex,
        "commuter_name": "Phantom_User_99",
        "from_station": "Atlantis Sub-Level 4",
        "to_station": "Gotham City Central",
        "mode": "Metro",
        "ticket_class": "Standard",
        "adults": 1,
        "children": 0
    }
    
    try:
        res = requests.post(API_URL, json=poison_payload)
        
        if res.status_code == 200:
            print(f"❌ VULNERABILITY FOUND: The backend accepted fake stations!")
            print(res.json())
        elif res.status_code == 500:
            print(f"💥 CRASH SUCCESSFUL: The backend math engine exploded (500 Error).")
        elif res.status_code == 422:
            print(f"⚠️ PYDANTIC BLOCK: Your schema is wrong. It didn't even reach the Ghost Shield.")
            print(res.json())
        else:
            print(f"🛡️ SHIELD HELD: The backend cleanly rejected it. Status: {res.status_code}")
            print(f"Response: {res.text}")
            
    except Exception as e:
        print(f"🚨 Network Error: {e}")

if __name__ == "__main__":
    trigger_ghost_station()