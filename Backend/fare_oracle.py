import json
import os
import math
from Backend.mumbai_data import MUMBAI_LOCATIONS

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

        # V3 Operator Wallets
        self.operator_wallets = {
            "Indian Railways": "0x1111111111111111111111111111111111111111",
            "MMMOCL (State)": "0x2222222222222222222222222222222222222222",
            "MMOPL (Reliance)": "0x3333333333333333333333333333333333333333",
            "bus": "0x4444444444444444444444444444444444444444"
        }

    def _haversine_distance(self, lon1, lat1, lon2, lat2):
        R = 6371 
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

    def get_route_key(self, station_from: str, station_to: str) -> str:
        return f"{station_from.upper()}-{station_to.upper()}"

    def calculate_private_fare(self, mode: str, distance_km: float) -> float:
        """Official Mumbai Rates: Base fare + per/km."""
        if "taxi" in mode.lower():
            base, per_km = 28.0, 18.0
        elif "bike" in mode.lower():
            base, per_km = 10.0, 8.0
        else: # Auto-Rickshaw
            base, per_km = 26.0, 15.0

        if distance_km <= 1.5:
            return base
        return base + ((distance_km - 1.5) * per_km)

    def calculate_settlement_payload(self, trip_legs: list, adults: int = 1, children: int = 0) -> dict:
        total_fare = 0
        leg_fares = []
        passenger_multiplier = adults + (children * 0.5)

        for leg in trip_legs:
            mode = leg.get("mode", "train").lower()
            base_fare = 0
            operator_key = ""
            
            # --- V3 GIG TRANSIT LEG ---
            if "auto" in mode or "taxi" in mode or "bike" in mode:
                # Calculate distance using coordinates
                c1 = MUMBAI_LOCATIONS.get(leg.get("from"))
                c2 = MUMBAI_LOCATIONS.get(leg.get("to"))
                dist = self._haversine_distance(c1[0], c1[1], c2[0], c2[1]) * 1.3 # 1.3x routing multiplier
                dist = min(dist, 25.0) # 25km cap
                
                base_fare = self.calculate_private_fare(mode, dist)
                operator_key = "GIG_WORKER_PENDING"
                
            # --- PUBLIC TRANSIT LEG ---
            elif mode == "bus":
                base_fare = self.matrix["bus"].get("short", {}).get("non-ac", 5)
                operator_key = "bus"
            elif mode == "train":
                route = self.get_route_key(leg.get("from", ""), leg.get("to", ""))
                route_data = self.matrix["train"].get(route, self.matrix["train"].get(self.get_route_key(leg.get("to", ""), leg.get("from", "")), {}))
                base_fare = route_data.get(leg.get("class", "2nd"), 15) 
                operator_key = route_data.get("operator", "Indian Railways")
            elif "metro" in mode:
                route = self.get_route_key(leg.get("from", ""), leg.get("to", ""))
                route_data = self.matrix["metro"].get(route, self.matrix["metro"].get(self.get_route_key(leg.get("to", ""), leg.get("from", "")), {}))
                base_fare = route_data.get("standard", 20) 
                operator_key = route_data.get("operator", "MMMOCL (State)")
            
            group_fare = base_fare * passenger_multiplier
            total_fare += group_fare
            leg_fares.append({"operator": operator_key, "gross_fare": group_fare})

        operators_array = []
        amounts_array_wei = []

        for leg in leg_fares:
            net_payout = leg["gross_fare"] * 0.95 
            net_payout_wei = int(net_payout * 10**18)
            
            # If gig worker, inject the placeholder address!
            if leg["operator"] == "GIG_WORKER_PENDING":
                wallet = "0x0000000000000000000000000000000000000000"
            else:
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