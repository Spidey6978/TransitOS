import json
import os

class TransitFareOracle:
    def __init__(self):
        file_path = os.path.join(os.path.dirname(__file__), "mumbai_fares.json")
        try:
            with open(file_path, "r") as f:
                self.matrix = json.load(f)
            print("🟢 Fare Oracle: Initialized with static dataset.")
        except FileNotFoundError:
            print("🔴 Fare Oracle Error: mumbai_fares.json missing!")
            self.matrix = {"train": {}, "metro": {}, "bus": {}}

        # RESTORED: The true 4-operator cross-jurisdiction mapping!
        self.operator_wallets = {
            "Indian Railways": "0x1111111111111111111111111111111111111111",  # Federal
            "MMMOCL (State)": "0x2222222222222222222222222222222222222222",    # State Metro
            "MMOPL (Reliance)": "0x3333333333333333333333333333333333333333",  # Private Metro
            "bus": "0x4444444444444444444444444444444444444444"                # Municipal
        }

    def get_route_key(self, station_from: str, station_to: str) -> str:
        return f"{station_from.upper()}-{station_to.upper()}"

    def calculate_settlement_payload(self, trip_legs: list, adults: int = 1, children: int = 0) -> dict:
        total_fare = 0
        leg_fares = []
        
        # Calculate the multiplier (Children pay half fare)
        passenger_multiplier = adults + (children * 0.5)

        for leg in trip_legs:
            base_fare = 0
            operator_key = ""
            
            if leg["mode"] == "bus":
                bus_type = leg.get("type", "short")
                base_fare = self.matrix["bus"].get(bus_type, {}).get("non-ac", 5)
                operator_key = "bus"
                
            elif leg["mode"] == "train":
                route = self.get_route_key(leg["from"], leg["to"])
                # Fallback for reverse direction
                if route not in self.matrix["train"]:
                    route = self.get_route_key(leg["to"], leg["from"])
                    
                route_data = self.matrix["train"].get(route, {})
                base_fare = route_data.get(leg.get("class", "2nd"), 15) 
                operator_key = route_data.get("operator", "Indian Railways")
                
            elif leg["mode"] == "metro":
                route = self.get_route_key(leg["from"], leg["to"])
                # Fallback for reverse direction
                if route not in self.matrix["metro"]:
                    route = self.get_route_key(leg["to"], leg["from"])
                    
                route_data = self.matrix["metro"].get(route, {})
                base_fare = route_data.get("standard", 20) 
                operator_key = route_data.get("operator", "MMMOCL (State)")
            
            # Group Ticket Multiplier
            group_fare = base_fare * passenger_multiplier
            total_fare += group_fare
            
            # Save the EXACT operator, not just the mode
            leg_fares.append({"operator": operator_key, "gross_fare": group_fare})

        operators_array = []
        amounts_array_wei = []

        for leg in leg_fares:
            # Operator pays the 5% platform fee
            net_payout = leg["gross_fare"] * 0.95 
            net_payout_wei = int(net_payout * 10**18)
            
            # Secure lookup with a fallback to State Metro just in case
            wallet = self.operator_wallets.get(leg["operator"], self.operator_wallets["MMMOCL (State)"])
            
            operators_array.append(wallet)
            amounts_array_wei.append(net_payout_wei)

        return {
            "total_fare_inr": total_fare,
            "contract_payload": {
                "operators": operators_array,
                "amounts_wei": amounts_array_wei,
                "total_fare_wei": int(total_fare * 10**18)
            }
        }