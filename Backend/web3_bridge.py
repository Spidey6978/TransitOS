import os
import json
import threading
from web3 import Web3
from dotenv import load_dotenv

# 1. Load variables from the .env file
load_dotenv()

# --- WEB3 CONFIGURATION ---
ALCHEMY_RPC_URL = os.getenv("ALCHEMY_RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x099439A86624942d2A151e0C81B698BA1a197A72")

# --- INITIALIZATION ---
w3 = Web3(Web3.HTTPProvider(ALCHEMY_RPC_URL, request_kwargs={"timeout": 30}))
if PRIVATE_KEY:
    account = w3.eth.account.from_key(PRIVATE_KEY)

# Load ABI dynamically from the adjacent abi.json file
abi_path = os.path.join(os.path.dirname(__file__), "abi.json")
with open(abi_path) as f:
    CONTRACT_ABI = json.load(f)

contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)

# --- THE NONCE HEALER (Thread-Safe State Management) ---
_current_nonce = None
_nonce_lock = threading.Lock()

def get_next_nonce() -> int:
    """Thread-safe nonce tracker to handle rapid offline batching without network collisions."""
    global _current_nonce
    with _nonce_lock:
        if _current_nonce is None:
            # Fetch the true pending nonce from the Polygon network
            _current_nonce = w3.eth.get_transaction_count(account.address, "pending")
        else:
            # Increment locally (instantaneous, avoids network delay & race conditions)
            _current_nonce += 1
        return _current_nonce

def settle_trip_on_chain(commuter_name: str, from_station: str, to_station: str, mode: str, fare: float) -> str:
    """
    Triggers the 60/40 revenue split on the Polygon blockchain with auto-healing retries.
    """
    global _current_nonce
    
    try:
        if not ALCHEMY_RPC_URL or not PRIVATE_KEY:
            raise Exception("Missing Environment Variables! Check your .env file.")

        fare_int = int(round(float(fare) * 100))
        max_retries = 3
        
        # The Self-Healing Loop
        for attempt in range(max_retries):
            try:
                safe_nonce = get_next_nonce()
                print(f"🔗 [Attempt {attempt+1}] Sending tx for {commuter_name} with Nonce {safe_nonce}...")
                
                tx = contract.functions.settleTrip(
                    commuter_name, from_station, to_station, mode, fare_int
                ).build_transaction({
                    'chainId': 80002,
                    'gas': 500000,
                    'gasPrice': w3.eth.gas_price,
                    'nonce': safe_nonce,
                })

                signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
                tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                
                receipt_hash = w3.to_hex(tx_hash)
                print(f"✅ Transaction Sent! Hash: {receipt_hash}")
                return receipt_hash
                
            except Exception as e:
                error_msg = str(e).lower()
                # Catch specific EVM nonce collision errors
                if "nonce" in error_msg or "underpriced" in error_msg or "already known" in error_msg:
                    print(f"⚠️ Nonce sync error detected: {error_msg}")
                    print("🔄 Healing memory and retrying...")
                    # Nuke the local memory so it re-fetches from Alchemy on the next loop
                    _current_nonce = None
                    continue
                
                # If it's a completely different error (e.g. out of gas), crash immediately
                _current_nonce = None
                print(f"🚨 Critical Web3 Error: {e}")
                return f"ERROR_{str(e)}"
                
        return "ERROR_MAX_RETRIES_EXCEEDED"

    except Exception as e:
        print(f"🚨 Setup Error: {e}")
        return f"ERROR_{str(e)}"

if __name__ == "__main__":
    print("🧪 Testing Secure Python Bridge with Nonce Healing...")
    test_tx = settle_trip_on_chain("Secure_User", "Dadar", "Churchgate", "Metro", 25.00)
    print(f"Check status: https://amoy.polygonscan.com/tx/{test_tx}")