from web3 import Web3
import json
import os
from dotenv import load_dotenv

# 1. Load variables from the .env file
load_dotenv()

# --- WEB3 CONFIGURATION ---
ALCHEMY_RPC_URL = os.getenv("ALCHEMY_RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x099439A86624942d2A151e0C81B698BA1a197A72")

# The ABI
CONTRACT_ABI = json.loads('[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"commuterName","type":"string"},{"indexed":false,"internalType":"string","name":"fromStation","type":"string"},{"indexed":false,"internalType":"string","name":"toStation","type":"string"},{"indexed":false,"internalType":"string","name":"mode","type":"string"},{"indexed":false,"internalType":"uint256","name":"totalFare","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transitOsShare","type":"uint256"}],"name":"TripSettled","type":"event"},{"inputs":[{"internalType":"string","name":"operatorName","type":"string"}],"name":"getOperatorBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"operatorBalances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"commuterName","type":"string"},{"internalType":"string","name":"fromStation","type":"string"},{"internalType":"string","name":"toStation","type":"string"},{"internalType":"string","name":"mode","type":"string"},{"internalType":"uint256","name":"totalFare","type":"uint256"}],"name":"settleTrip","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"transitOsRevenue","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]')

def settle_trip_on_chain(commuter_name: str, from_station: str, to_station: str, mode: str, fare: float) -> str:
    """
    Triggers the 60/40 revenue split on the Polygon blockchain.
    """
    try:
        if not ALCHEMY_RPC_URL or not PRIVATE_KEY:
            raise Exception("Missing Environment Variables! Check your .env file.")

        # 1. Connect
        w3 = Web3(Web3.HTTPProvider(ALCHEMY_RPC_URL))
        
        # 2. Setup Account
        account = w3.eth.account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

        # 3. Format Fare
        fare_int = int(float(fare) * 100)

        # 4. Build Transaction
        print(f"🔗 Sending secure transaction for {commuter_name}...")
        tx = contract.functions.settleTrip(
            commuter_name, from_station, to_station, mode, fare_int
        ).build_transaction({
            'chainId': 80002,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })

        # 5. Sign and Send
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        
        # FIX: Changed rawTransaction -> raw_transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        receipt_hash = w3.to_hex(tx_hash)
        print(f"✅ Transaction Sent! Hash: {receipt_hash}")
        return receipt_hash
        
    except Exception as e:
        print(f"🚨 Web3 Bridge Error: {e}")
        return f"ERROR_{str(e)}"

if __name__ == "__main__":
    print("🧪 Testing Secure Python Bridge...")
    test_tx = settle_trip_on_chain("Secure_User", "Dadar", "Churchgate", "Metro", 25.00)
    print(f"Check status: https://amoy.polygonscan.com/tx/{test_tx}")