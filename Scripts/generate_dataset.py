import json
import itertools

def calculate_modern_train_fare(distance_km):
    """
    Simulates the modern telescopic fare structure of Mumbai Local Trains.
    Returns: (2nd_Class, 1st_Class, AC_Class)
    """
    if distance_km <= 10: return (5, 50, 65)
    elif distance_km <= 20: return (10, 75, 100)
    elif distance_km <= 30: return (10, 105, 135)
    elif distance_km <= 40: return (15, 140, 180)
    elif distance_km <= 55: return (15, 165, 210)
    else: return (20, 190, 235)

def calculate_metro_fare(distance_km):
    """
    Standard slab for Mumbai Metro (Approximate modern tiers)
    Returns: Standard Fare
    """
    if distance_km <= 3: return 10
    elif distance_km <= 12: return 20
    elif distance_km <= 18: return 30
    elif distance_km <= 24: return 40
    else: return 50

def generate_fare_dataset():
    print("⚙️ Booting TransitOS Multi-Entity Matrix Generator...")

    # --- 1. LOCAL TRAINS (Western Railway) ---
    wr_stations = {
        "Churchgate": 0.0, "Mumbai Central": 4.8, "Dadar": 5.9,
        "Bandra": 14.7, "Andheri": 21.9, "Goregaon": 26.8,
        "Malad": 29.5, "Kandivali": 31.5, "Borivali": 34.0,
        "Dahisar": 36.4, "Vasai Road": 51.8, "Virar": 59.9
    }

    # --- 2. MUMBAI METRO LINES (Separate Entities) ---
    
    # Line 1 (Blue) - Operated by MMOPL (Reliance JV)
    metro_line_1 = {
        "Versova": 0.0, "DN Nagar": 1.0, "Azad Nagar": 1.8,
        "Andheri": 3.0, "WEH": 4.1, "Chakala": 5.4,
        "Airport Road": 6.1, "Marol Naka": 6.7, "Saki Naka": 7.8,
        "Asalpha": 8.9, "Ghatkopar": 11.4
    }

    # Line 2A (Yellow) - Operated by MMMOCL
    metro_line_2a = {
        "Dahisar East": 0.0, "Anand Nagar": 1.2, "Kandarpada": 2.1,
        "Mandapeshwar": 3.0, "Eksar": 3.9, "Borivali West": 5.1,
        "Kandivali West": 7.2, "Dahanukarwadi": 8.0, "Valnai": 8.9,
        "Malad West": 9.8, "Goregaon West": 12.1, "Oshiwara": 14.2,
        "Andheri West": 18.6
    }

    # Line 7 (Red) - Operated by MMMOCL
    metro_line_7 = {
        "Dahisar East": 0.0, "Ovaripada": 1.0, "National Park": 2.0,
        "Devipada": 2.8, "Magathane": 3.6, "Poisar": 4.5,
        "Akurli": 5.4, "Kurar": 6.4, "Dindoshi": 7.3,
        "Aarey": 8.3, "Goregaon E": 9.4, "Jogeshwari E": 10.7,
        "Gundavali": 16.5
    }

    dataset = {
        "train": {},
        "metro": {},
        "bus": {
            "short": {"non-ac": 5, "ac": 6},
            "medium": {"non-ac": 10, "ac": 13},
            "long": {"non-ac": 15, "ac": 19},
            "max": {"non-ac": 20, "ac": 25}
        }
    }

    route_count = 0

    # --- PROCESS LOCAL TRAINS ---
    print("🔄 Processing Western Railway network...")
    for st1, st2 in itertools.combinations(wr_stations.keys(), 2):
        dist = abs(wr_stations[st1] - wr_stations[st2])
        f2, f1, fac = calculate_modern_train_fare(dist)
        route_key = f"{st1.upper()}-{st2.upper()}" if st1 < st2 else f"{st2.upper()}-{st1.upper()}"
        dataset["train"][route_key] = {"2nd": f2, "1st": f1, "AC": fac, "operator": "Indian Railways"}
        route_count += 1

    # --- PROCESS METRO NETWORKS ---
    print("🔄 Processing fragmented Metro networks...")
    
    def process_metro_line(station_dict, operator_name):
        nonlocal route_count
        for st1, st2 in itertools.combinations(station_dict.keys(), 2):
            dist = abs(station_dict[st1] - station_dict[st2])
            fare = calculate_metro_fare(dist)
            route_key = f"{st1.upper()}-{st2.upper()}" if st1 < st2 else f"{st2.upper()}-{st1.upper()}"
            dataset["metro"][route_key] = {"standard": fare, "operator": operator_name}
            route_count += 1

    # Process each line with its specific corporate entity
    process_metro_line(metro_line_1, "MMOPL (Reliance)")
    process_metro_line(metro_line_2a, "MMMOCL (State)")
    process_metro_line(metro_line_7, "MMMOCL (State)")

    # 3. Load Phase
    with open("Backend/mumbai_fares.json", "w") as f:
        json.dump(dataset, f, indent=4)
        
    print(f"✅ Automatically generated {route_count} multi-entity routes!")
    print("📁 Saved to Backend/mumbai_fares.json")

if __name__ == "__main__":
    generate_fare_dataset()