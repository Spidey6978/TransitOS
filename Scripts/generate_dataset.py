import json
import itertools
import math

# Use the exact coordinates from mumbai_data.py to calculate cross-network routing
MUMBAI_LOCATIONS = {
    "Churchgate": [72.8264, 18.9322], "Marine Lines": [72.8239, 18.9447], "Charni Road": [72.8205, 18.9518],
    "Grant Road": [72.8159, 18.9625], "Mumbai Central": [72.8188, 18.9697], "Dadar (Western)": [72.8427, 19.0178],
    "Bandra": [72.8362, 19.0596], "Andheri": [72.8697, 19.1136], "Borivali": [72.8567, 19.2312],
    "Virar": [72.8105, 19.4565], "Dahisar": [72.8601, 19.2494], "CST": [72.8347, 18.9401],
    "Byculla": [72.8326, 18.9746], "Dadar (Central)": [72.8478, 19.0178], "Kurla": [72.8809, 19.0649],
    "Ghatkopar": [72.9090, 19.0860], "Thane": [72.9781, 19.2183], "Kalyan": [73.1305, 19.2403],
    "Vashi": [73.0033, 19.0745], "Panvel": [73.1107, 18.9894]
}

def calculate_modern_train_fare(distance_km):
    if distance_km <= 10: return (5, 50, 65)
    elif distance_km <= 20: return (10, 75, 100)
    elif distance_km <= 30: return (10, 105, 135)
    elif distance_km <= 40: return (15, 140, 180)
    elif distance_km <= 55: return (15, 165, 210)
    else: return (20, 190, 235)

def calculate_metro_fare(distance_km):
    if distance_km <= 3: return 10
    elif distance_km <= 12: return 20
    elif distance_km <= 18: return 30
    elif distance_km <= 24: return 40
    else: return 50

def haversine_dist(lon1, lat1, lon2, lat2):
    R = 6371 
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

def generate_fare_dataset():
    print("⚙️ Booting TransitOS Multi-Entity Matrix Generator (V3)...")

    # --- 1. PRECISE CHAINAGES (KMs from Origin) ---
    wr_stations = {
        "Churchgate": 0.0, "Marine Lines": 1.4, "Charni Road": 2.2, "Grant Road": 3.4,
        "Mumbai Central": 4.8, "Dadar (Western)": 5.9, "Bandra": 14.7, "Andheri": 21.9,
        "Borivali": 34.0, "Dahisar": 36.4, "Virar": 59.9
    }
    cr_stations = {
        "CST": 0.0, "Byculla": 4.6, "Dadar (Central)": 9.0, "Kurla": 15.3,
        "Ghatkopar": 19.3, "Thane": 33.6, "Kalyan": 53.2
    }
    hr_stations = {
        "CST": 0.0, "Kurla": 15.3, "Vashi": 29.5, "Panvel": 48.9
    }
    metro_stations = {
        "Versova (Metro)": 0.0, "Andheri": 3.0, "WEH": 4.1, "Marol Naka": 6.7, "Ghatkopar": 11.4
    }
    monorail_stations = {
        "Chembur (Monorail)": 0.0, "Wadala Depot": 8.9
    }

    dataset = {
        "train": {},
        "metro": {},
        "ferry": {},
        "bus": {
            "short": {"non-ac": 5, "ac": 6},
            "medium": {"non-ac": 10, "ac": 13},
            "long": {"non-ac": 15, "ac": 19},
            "max": {"non-ac": 20, "ac": 25}
        }
    }

    route_count = 0

    # --- PROCESS DIRECT RAIL LINES ---
    print("🔄 Processing Western, Central, and Harbour Networks...")
    def process_rail_line(station_dict):
        nonlocal route_count
        for st1, st2 in itertools.combinations(station_dict.keys(), 2):
            dist = abs(station_dict[st1] - station_dict[st2])
            f2, f1, fac = calculate_modern_train_fare(dist)
            route_key = f"{st1.upper()}-{st2.upper()}" if st1 < st2 else f"{st2.upper()}-{st1.upper()}"
            dataset["train"][route_key] = {"2nd": f2, "1st": f1, "AC": fac, "operator": "Indian Railways"}
            route_count += 1

    process_rail_line(wr_stations)
    process_rail_line(cr_stations)
    process_rail_line(hr_stations)

    # --- CROSS-NETWORK SYNTHESIZER ---
    # If someone travels from a WR station to a CR station, calculate via coordinates!
    print("🔗 Synthesizing Cross-Network Transfers...")
    all_train_stations = list(MUMBAI_LOCATIONS.keys())
    for st1, st2 in itertools.combinations(all_train_stations, 2):
        route_key = f"{st1.upper()}-{st2.upper()}" if st1 < st2 else f"{st2.upper()}-{st1.upper()}"
        if route_key not in dataset["train"]:
            lon1, lat1 = MUMBAI_LOCATIONS[st1]
            lon2, lat2 = MUMBAI_LOCATIONS[st2]
            # Multiply straight-line Haversine by 1.3 to estimate track curvature
            estimated_dist = haversine_dist(lon1, lat1, lon2, lat2) * 1.3 
            f2, f1, fac = calculate_modern_train_fare(estimated_dist)
            dataset["train"][route_key] = {"2nd": f2, "1st": f1, "AC": fac, "operator": "Indian Railways"}
            route_count += 1

    # --- PROCESS METRO & MONORAIL ---
    print("🔄 Processing Metro & Monorail networks...")
    for st1, st2 in itertools.combinations(metro_stations.keys(), 2):
        dist = abs(metro_stations[st1] - metro_stations[st2])
        route_key = f"{st1.upper()}-{st2.upper()}" if st1 < st2 else f"{st2.upper()}-{st1.upper()}"
        dataset["metro"][route_key] = {"standard": calculate_metro_fare(dist), "operator": "MMOPL (Reliance)"}
        route_count += 1

    for st1, st2 in itertools.combinations(monorail_stations.keys(), 2):
        dist = abs(monorail_stations[st1] - monorail_stations[st2])
        route_key = f"{st1.upper()}-{st2.upper()}" if st1 < st2 else f"{st2.upper()}-{st1.upper()}"
        # Treat Monorail exactly like Metro in the DB for UI simplicity
        dataset["metro"][route_key] = {"standard": calculate_metro_fare(dist), "operator": "MMRDA (State)"}
        route_count += 1

    # --- FERRY ROUTES ---
    print("⚓ Processing Coastal Routes...")
    ferry_key = "ALIBAUG (JETTY)-GATEWAY OF INDIA (FERRY)"
    dataset["ferry"][ferry_key] = {"standard": 200, "operator": "M2M Ferries"}
    route_count += 1

    # --- SAVE TO BACKEND ---
    with open("Backend/mumbai_fares.json", "w") as f:
        json.dump(dataset, f, indent=4)
        
    print(f"✅ Generated {route_count} exhaustive public transit routes!")
    print("📁 Saved to Backend/mumbai_fares.json")

if __name__ == "__main__":
    generate_fare_dataset()