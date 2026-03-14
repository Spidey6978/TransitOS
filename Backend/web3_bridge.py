# web3_bridge.py
# Phase 1: Stub file — functions exist but don't call blockchain yet.
# Phase 2: Fill in once Dev 1 hands over ABI.json + CONTRACT_ADDRESS

import os
from dotenv import load_dotenv

load_dotenv()

def settle_fare(commuter_name: str, fare: float) -> str:
    """
    Phase 1 stub — returns a mock hash.
    Phase 2 — this will sign and send a real transaction to Polygon Amoy.
    """
    # TODO: Replace with real Web3 logic in Phase 2
    return "0xSTUB_PENDING_WEB3_SETUP"

def get_contract_balance() -> float:
    """
    Phase 2 — will query the contract's balance on-chain.
    """
    # TODO: Implement in Phase 2
    return 0.0