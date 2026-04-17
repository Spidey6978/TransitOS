import os
import json
import threading
from web3 import Web3
from dotenv import load_dotenv, find_dotenv


# 1. Load variables from the .env file
env_path = find_dotenv()
print(f"🔍 Web3 Bridge located .env at: {env_path}")
load_dotenv(env_path, override=True)

# --- WEB3 CONFIGURATION ---
ALCHEMY_RPC_URL = os.getenv("ALCHEMY_RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0xf1826adBe982fb296d4426BEe5feaC981EB5Cf98")

# --- INITIALIZATION ---
w3 = Web3(Web3.HTTPProvider(ALCHEMY_RPC_URL, request_kwargs={"timeout": 30}))
if PRIVATE_KEY:
    account = w3.eth.account.from_key(PRIVATE_KEY)

# Load ABI dynamically from the adjacent abi.json file
try:
    abi_path = os.path.join(os.path.dirname(__file__), "abi.json")
    with open(abi_path, "r") as f:
        CONTRACT_ABI = json.load(f)
except Exception as e:
    print(f"🚨 CRITICAL: Could not load abi.json. Did you copy it from Hardhat? Error: {e}")
    CONTRACT_ABI = []

if not CONTRACT_ADDRESS:
    print("🚨 CRITICAL: CONTRACT_ADDRESS is missing from .env!")
else:
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)
# --- THE NONCE HEALER (Thread-Safe State Management) ---
_current_nonce = None
_nonce_lock = threading.Lock()

def get_next_nonce(w3, account_address):
    """Thread-safe nonce fetching to prevent collisions during offline sync bursts."""
    global _current_nonce
    with _nonce_lock:
        network_nonce = w3.eth.get_transaction_count(account_address, "pending")
        if _current_nonce is None or network_nonce > _current_nonce:
            _current_nonce = network_nonce
        else:
            _current_nonce += 1
        return _current_nonce

def settle_trip_on_chain(commuter_name: str, operators: list, amounts_wei: list, total_fare_wei: int) -> str:
    """
    Triggers the dynamic multi-operator revenue split on Polygon.
    """
    try:
        if not ALCHEMY_RPC_URL or not PRIVATE_KEY:
            raise Exception("Missing Environment Variables! Check your .env file.")

        max_retries = 3
        checksummed_operators = [Web3.to_checksum_address(op) for op in operators]


        # The Self-Healing Loop
        for attempt in range(max_retries):
            try:
                # FIX 1: Pass the required w3 and account.address arguments
                safe_nonce = get_next_nonce(w3, account.address)
                print(f"🔗 [Attempt {attempt+1}] Sending tx for {commuter_name} with Nonce {safe_nonce}...")
                
                # --- V2 DYNAMIC ARRAY SETTLEMENT ---
                tx = contract.functions.settleTrip(
                    commuter_name, 
                    checksummed_operators, 
                    amounts_wei, 
                    total_fare_wei
                ).build_transaction({
                    'chainId': 80002,
                    'gas': 800000, # Bumped slightly for dynamic arrays
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
                
                # 1. Nonce Collisions: Heal memory and retry
                if "nonce" in error_msg or "underpriced" in error_msg or "already known" in error_msg:
                    print(f"⚠️ Nonce sync error detected. Healing memory and retrying...")
                    global _current_nonce # Ensure we are targeting the global tracker
                    _current_nonce = None
                    continue
                
                # 2. THE ERROR SHIELD: Catch critical errors and abort immediately
                _current_nonce = None # Reset state just in case
                print(f"🚨 Critical Web3 Error Intercepted: {e}")
                
                if "insufficient funds" in error_msg:
                    return "ERR_INSUFFICIENT_FUNDS"
                elif "execution reverted" in error_msg:
                    return "ERR_CONTRACT_REVERT"
                elif "429" in error_msg or "too many requests" in error_msg:
                    return "ERR_RATE_LIMIT"
                elif "connection aborted" in error_msg or "remotedisconnected" in error_msg:
                    return "ERR_RPC_TIMEOUT"
                else:
                    return f"ERR_UNKNOWN_{str(e)}"
                
        # If the loop finishes without returning, it means we failed the nonce retry 3 times
        return "ERR_NONCE_COLLISION"

    except Exception as e:
        print(f"🚨 Fatal Bridge Error: {e}")
        return f"ERR_FATAL_{str(e)}"