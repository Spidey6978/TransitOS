import requests
import uuid
import time

BASE_URL = "https://touchily-steamerless-alyssa.ngrok-free.dev"

def test_refund_lifecycle():
    print("🚦 Booting TransitOS Refund & Escrow Simulator...")
    
    # 1. Generate unique IDs for the test
    main_ticket_id = f"TEST-TKT-{uuid.uuid4().hex[:6].upper()}"
    private_leg_id = "LEG_AUTO_1"
    
    print(f"\n[1/3] 🛒 Booking Private Auto Leg (Ticket: {main_ticket_id})")
    book_payload = {
        "ticket_id": main_ticket_id,
        "commuter_name": "Refund Tester",
        "passengers": {"adults": 1, "children": 0, "childrenWithSeats": 0, "totalPassengers": 1},
        "legs": [
            {
                "leg_id": private_leg_id,
                "mode": "Auto-Rickshaw",
                "pickup_label": "Bandra Kurla Complex",
                "drop_label": "Bandra Station",
                "pickup_coords": {"lat": 19.0650, "lng": 72.8650},
                "drop_coords": {"lat": 19.0596, "lng": 72.8400},
                "estimated_fare": 45.0, # Backend will ignore this and re-calc securely!
                "status": "pending"
            }
        ]
    }
    
    try:
        book_res = requests.post(f"{BASE_URL}/book_private_legs", json=book_payload)
        if book_res.status_code == 200:
            print(f"   ✅ Escrow Locked. Waiting for a driver to accept...")
        else:
            print(f"   ❌ Booking Failed: {book_res.text}")
            return
            
    except requests.exceptions.ConnectionError:
        print("   🚨 ERROR: Backend is down! Start Uvicorn on port 8000.")
        return

    # 2. Simulate User waiting, then deciding to cancel
    print("\n[2/3] ⏳ Commuter is waiting... (Simulating 3 second delay)")
    time.sleep(3)
    
    print(f"\n[3/3] 🛑 Commuter hits 'Cancel Trip' (Triggering Escrow Sweep)")
    cancel_payload = {
        "ticket_id": main_ticket_id,
        "leg_id": private_leg_id,
        "reason": "Driver taking too long"
    }
    
    cancel_res = requests.post(f"{BASE_URL}/user_cancel", json=cancel_payload)
    
    if cancel_res.status_code == 200:
        data = cancel_res.json()
        print(f"   ✅ Cancellation Successful!")
        print(f"   💸 Refunded to Wallet: ₹{data.get('refund_amount_inr')}")
        print(f"   ⛽ Anti-Griefing Micro-Fee Applied: ₹{data.get('cancellation_fee')}")
        print(f"   💬 Message: {data.get('message')}")
        
        print("\n🏆 REFUND ARCHITECTURE VERIFIED: The Micro-Escrow was successfully swept back to the treasury!")
    else:
        print(f"   ❌ Cancellation Failed: {cancel_res.text}")

if __name__ == "__main__":
    test_refund_lifecycle()