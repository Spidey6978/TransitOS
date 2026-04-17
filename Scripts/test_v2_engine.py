import sys
import os
import time

# Add the root directory to path so we can import from Backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from Backend.fare_oracle import TransitFareOracle
from Backend.web3_bridge import settle_trip_on_chain, w3 # Imported w3 to check receipts

def run_v2_test():
    print("🚦 TransitOS V2 Engine Test Initiated...\n")
    
    # NEW: Telemetry Check
    target_contract = os.getenv("CONTRACT_ADDRESS")
    print(f"🎯 Target Contract Address: {target_contract}")
    if target_contract == "0x099439A86624942d2A151e0C81B698BA1a197A72":
        print("🚨 WARNING: You are still targeting the OLD V1 contract! Check your .env file!")
    
    # 1. Initialize Oracle
    oracle = TransitFareOracle()
    
    # 2. Mock a complex multi-jurisdiction trip
    mock_trip = [
        {"mode": "metro", "from": "DAHISAR", "to": "WEH", "class": "Standard"},
        {"mode": "train", "from": "ANDHERI", "to": "CHURCHGATE", "class": "1st"}
    ]
    
    print(f"🗺️  Simulating Route:")
    for leg in mock_trip:
        print(f"   - {leg['mode'].upper()}: {leg['from']} -> {leg['to']} ({leg['class']})")
        
    # 3. Process via Oracle
    print("\n🧠 Oracle Processing Split...")
    settlement_data = oracle.calculate_settlement_payload(mock_trip)
    payload = settlement_data["contract_payload"]
    
    total_inr = settlement_data["total_fare_inr"]
    print(f"   Total Commuter Fare: ₹{total_inr}")
    print(f"   Contract Payload Arrays Built:")
    print(f"   - Operators: {len(payload['operators'])} entities")
    
    # 4. Fire to Polygon
    print("\n⛓️ Firing dynamic arrays to Polygon Amoy...")
    tx_hash = settle_trip_on_chain(
        commuter_name="V2_Sandbox_Tester",
        operators=payload["operators"],
        amounts_wei=payload["amounts_wei"],
        total_fare_wei=payload["total_fare_wei"]
    )
    
    if tx_hash.startswith("ERR_"):
        print(f"\n❌ TEST FAILED TO SEND: {tx_hash}")
        return

    # 5. THE NEW ON-CHAIN RECEIPT CHECKER
    print(f"⏳ Broadcast successful! Waiting for Polygon block confirmation (tx: {tx_hash[:10]}...).")
    try:
        # Wait up to 30 seconds for the block to be mined
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
        
        if receipt.status == 1:
            print(f"\n✅ TEST PASSED ON-CHAIN! (Status 1: Success)")
            print(f"🔍 Verify here: https://amoy.polygonscan.com/tx/{tx_hash}")
        else:
            print(f"\n❌ ON-CHAIN REVERT DETECTED! (Status 0: Failed)")
            print(f"The EVM rejected the data. Check your Contract Address and ABI.")
            print(f"🔍 Inspect failure here: https://amoy.polygonscan.com/tx/{tx_hash}")
            
    except Exception as e:
        print(f"\n⚠️ Timeout waiting for receipt: {e}")
        print(f"Check manually: https://amoy.polygonscan.com/tx/{tx_hash}")

if __name__ == "__main__":
    run_v2_test()