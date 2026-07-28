import sys
import os

# Add the root directory to path so we can import from Backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from Backend.web3_bridge import contract
from Backend.fare_oracle import TransitFareOracle

def check_vault():
    print("🏦 Querying Polygon Amoy Smart Contract Vault...\n")
    
    oracle = TransitFareOracle()
    
    try:
        # 1. Query the Platform Revenue (Your 5% cut!)
        platform_revenue_wei = contract.functions.transitOsRevenue().call()
        platform_inr = platform_revenue_wei / 10**18
        print(f"🟢 TransitOS Platform Fees Accumulated: ₹{platform_inr:.2f}\n")

        # 2. Query the individual Operator Balances (The 95% payouts)
        print("🏢 Operator Escrow Balances:")
        for name, address in oracle.operator_wallets.items():
            balance_wei = contract.functions.operatorBalances(address).call()
            if balance_wei > 0:
                print(f"   - {name.upper()}: ₹{balance_wei / 10**18:.2f}")
                print(f"     (Wallet: {address})")
                
    except Exception as e:
        print(f"🚨 Error querying blockchain: {e}")
        print("Ensure your CONTRACT_ADDRESS in .env is correct and the contract is deployed.")

if __name__ == "__main__":
    check_vault()