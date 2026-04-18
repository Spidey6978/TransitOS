import json
import os
import math

class TransitFareOracle:
    def __init__(self):
        # 1. Load Public Transit Slabs
        file_path = os.path.join(os.path.dirname(__file__), "mumbai_fares.json")
        try:
            with open(file_path, "r") as f:
                self.matrix = json.load(f)
            print("🟢 Fare Oracle: Initialized with static dataset.")
        except FileNotFoundError:
            print("🔴 Fare Oracle Error: mumbai_fares.json missing!")
            self.matrix = {"train": {}, "metro": {}, "bus": {}}

        self.operator_wallets = {
            "train": "0x1111111111111111111111111111111111111111",
            "metro": "0x2222222222222222222222222222222222222222",
            "bus":   "0x3333333333333333333333333333333333333333"
        }
        
        # 2. Base RTO Configs for Private Gig Vehicles
        self.private_configs = {
            "auto": {"base": 23.0, "km": 15.33, "min_km": 1.5, "capacity": 3},
            "taxi": {"base": 28.0, "km": 18.66, "min_km": 1.5, "capacity": 4},
            "bike": {"base": 15.0, "km": 8.00,  "min_km": 2.0, "capacity": 1}
        }

    def get_route_key(self, station_from: str, station_to: str) -> str:
        """🚨 FIX: Enforce uppercase alphabetical lookup to match generator"""
        st1 = str(station_from).strip().upper()
        st2 = str(station_to).strip().upper()
        return f"{st1}-{st2}" if st1 < st2 else f"{st2}-{st1}"

    def calculate_private_fare(self, mode: str, distance_km: float, total_passengers: int, congestion: str = "moderate") -> float:
        """Calculates Gig fare PER VEHICLE needed based on capacity"""
        m = mode.lower()
        key = "auto"
        if "taxi" in m or "cab" in m: key = "taxi"
        elif "bike" in m: key = "bike"
        
        conf = self.private_configs[key]
        num_vehicles = max(1, math.ceil(total_passengers / conf["capacity"]))
        
        if distance_km <= conf["min_km"]:
            single_vehicle_fare = conf["base"]
        else:
            billable_dist = distance_km - conf["min_km"]
            single_vehicle_fare = conf["base"] + (billable_dist * conf["km"])

        multiplier = {"clear": 1.0, "moderate": 1.15, "heavy": 1.45, "jam": 1.80}.get(congestion.lower(), 1.1)
        return float(round(single_vehicle_fare * multiplier * num_vehicles))

    def build_escrow_payload(self, trip_legs: list, passenger_data: dict) -> dict:
        total_fare = 0
        leg_fares = []
        
        adults = passenger_data.get("adults", 1)
        children_seats = passenger_data.get("childrenWithSeats", 0)
        
        # Public transit charges per human (Kids are 50%)
        total_public_passengers = adults + (children_seats * 0.5) 
        # Private transit counts pure headshots to determine vehicle limits
        total_human_count = adults + children_seats + passenger_data.get("children", 0)

        for leg in trip_legs:
            # Handle Pydantic models or Dicts safely
            raw_mode = (leg.mode if hasattr(leg, 'mode') else leg.get("mode", "")).lower()
            origin = leg.from_station if hasattr(leg, 'from_station') else leg.get("from", "")
            dest = leg.to_station if hasattr(leg, 'to_station') else leg.get("to", "")
            t_class = leg.ticket_class if hasattr(leg, 'ticket_class') else leg.get("class", "2nd")
            
            fare = 0
            
            # 1. PRIVATE MODE (Scaling by Vehicles)
            if any(m in raw_mode for m in ["auto", "taxi", "bike", "cab"]):
                dist = getattr(leg, 'distance_km', leg.get("distance_km", 5.0)) 
                cong = getattr(leg, 'congestion', leg.get("congestion", "moderate"))
                fare = self.calculate_private_fare(raw_mode, dist, total_human_count, cong)
                operator_wallet = "0x0000000000000000000000000000000000000000" # Awaiting driver handshake
                
            # 2. PUBLIC MODE (Scaling by Headcount)
            else:
                if "bus" in raw_mode:
                    base_fare = self.matrix["bus"].get("medium", {}).get("non-ac", 10)
                    operator_wallet = self.operator_wallets["bus"]
                elif "train" in raw_mode or "rail" in raw_mode:
                    route = self.get_route_key(origin, dest)
                    t_class_key = "1st" if "1st" in str(t_class) else "2nd"
                    # 🚨 Database lookup with 15 INR fallback
                    base_fare = self.matrix["train"].get(route, {}).get(t_class_key, 15)
                    operator_wallet = self.operator_wallets["train"]
                elif "metro" in raw_mode or "mono" in raw_mode:
                    route = self.get_route_key(origin, dest)
                    base_fare = self.matrix["metro"].get(route, {}).get("standard", 20)
                    operator_wallet = self.operator_wallets["metro"]
                else:
                    base_fare = 15 # Absolute fallback
                    operator_wallet = self.operator_wallets["train"]
                    
                fare = round(base_fare * total_public_passengers)

            total_fare += fare
            leg_fares.append({"mode": raw_mode, "gross_fare": fare, "wallet": operator_wallet})

        transit_os_cut = total_fare * 0.05
        operators_array = [leg["wallet"] for leg in leg_fares]
        amounts_array_wei = [int((leg["gross_fare"] * 0.95) * 10**18) for leg in leg_fares]

        return {
            "total_escrow": total_fare,
            "transit_os_revenue_inr": transit_os_cut,
            "contract_operators": operators_array,
            "contract_amounts": amounts_array_wei,
            "total_fare_wei": int(total_fare * 10**18)
        }

    def calculate_settlement_payload(self, trip_legs: list, adults: int = 1, children: int = 0) -> dict:
        """
        Legacy Adapter: Prevents main.py from crashing by catching the old method 
        calls and translating them into the new V4 Escrow Payload format.
        """
        passenger_data = {"adults": adults, "children": children, "childrenWithSeats": 0}
        escrow_data = self.build_escrow_payload(trip_legs, passenger_data)
        
        return {
            "total_fare_inr": escrow_data["total_escrow"],
            "contract_payload": {
                "operators": escrow_data["contract_operators"],
                "amounts_wei": escrow_data["contract_amounts"],
                "total_fare_wei": escrow_data["total_fare_wei"]
            }
        }