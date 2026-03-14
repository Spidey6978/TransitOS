# web3_bridge.py
# Phase 1: Stub file — functions exist but don't call blockchain yet.
# Phase 2 — Real Web3 bridge to Polygon Amoy
# Contract function: settleTrip(commuterName, fromStation, toStation, mode, totalFare)
# Phase 4: Optimized — cached connection, better error handling

import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# ── Connect to Polygon Amoy via Alchemy ──────────────────
# Phase 4: Connection created once at startup, reused for all requests
w3 = Web3(Web3.HTTPProvider(
    os.getenv("ALCHEMY_RPC_URL"),
    request_kwargs={"timeout": 30}  # Phase 4: 30 second timeout prevents hanging
))

# ── Load your wallet ─────────────────────────────────────
account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))

# ── Load the ABI ─────────────────────────────────────────
with open("ABI.json") as f:
    abi = json.load(f)

# ── Load the contract ────────────────────────────────────
contract = w3.eth.contract(
    address=Web3.to_checksum_address(os.getenv("CONTRACT_ADDRESS")),
    abi=abi
)


def check_connection() -> bool:
    """Returns True if successfully connected to Polygon Amoy"""
    try:
        return w3.is_connected()
    except Exception:
        return False


def settle_trip(
    commuter_name: str,
    from_station: str,
    to_station: str,
    mode: str,
    fare: float
) -> str:
    """
    Calls settleTrip() on the deployed TransitSettlement contract.
    Phase 4: Uses 'pending' nonce to handle rapid consecutive transactions.
    Returns the real Polygon Amoy transaction hash.
    """
    try:
        # Convert fare to paise (1 INR = 100 paise) for on-chain storage
        fare_wei = int(round(fare * 100))

        # Phase 4: Use "pending" nonce — handles rapid back-to-back transactions
        # without nonce collision errors
        nonce = w3.eth.get_transaction_count(account.address, "pending")

        # Build transaction matching exact contract signature
        tx = contract.functions.settleTrip(
            commuter_name,   # string commuterName
            from_station,    # string fromStation
            to_station,      # string toStation
            mode,            # string mode
            fare_wei         # uint256 totalFare
        ).build_transaction({
            "from":     account.address,
            "nonce":    nonce,
            "gas":      300000,
            "gasPrice": w3.to_wei("30", "gwei")
        })

        # Sign with private key
        signed_tx = w3.eth.account.sign_transaction(
            tx, os.getenv("PRIVATE_KEY")
        )

        # Broadcast to Polygon Amoy
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        return w3.to_hex(tx_hash)

    except Exception as e:
        raise Exception(f"Web3 Bridge Error: {str(e)}")


def get_operator_balance(operator_name: str) -> int:
    """
    Phase 4: Reads operator balance directly from contract.
    Used by /stats endpoint to show on-chain revenue.
    e.g. get_operator_balance("Railways")
    """
    try:
        return contract.functions.getOperatorBalance(operator_name).call()
    except Exception:
        return 0


def get_transitOS_revenue() -> int:
    """
    Phase 4: Returns TransitOS platform revenue stored on-chain.
    """
    try:
        return contract.functions.transitOsRevenue().call()
    except Exception:
        return 0