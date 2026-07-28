# Hardcoded coordinates for major Mumbai transit hubs
# Format: [Longitude, Latitude]

MUMBAI_LOCATIONS = {
    # Western Line
    "Churchgate": [72.8264, 18.9322],
    "Marine Lines": [72.8239, 18.9447],
    "Charni Road": [72.8205, 18.9518],
    "Grant Road": [72.8159, 18.9625],
    "Mumbai Central": [72.8188, 18.9697],
    "Dadar (Western)": [72.8427, 19.0178],
    "Bandra": [72.8362, 19.0596],
    "Andheri": [72.8697, 19.1136],
    "Borivali": [72.8567, 19.2312],
    "Virar": [72.8105, 19.4565],
    "Dahisar": [72.8601, 19.2494],

    # Central Line
    "CST": [72.8347, 18.9401],
    "Byculla": [72.8326, 18.9746],
    "Dadar (Central)": [72.8478, 19.0178],
    "Kurla": [72.8809, 19.0649],
    "Ghatkopar": [72.9090, 19.0860],
    "Thane": [72.9781, 19.2183],
    "Kalyan": [73.1305, 19.2403],

    # Metro & Monorail
    "Versova (Metro)": [72.8105, 19.1326],
    "WEH": [72.8557, 19.1158],
    "Marol Naka": [72.8829, 19.1065],
    "Chembur (Monorail)": [72.8956, 19.0522],
    "Wadala Depot": [72.8696, 19.0330],
    
    # Harbour / Coastal
    "Vashi": [73.0033, 19.0745],
    "Panvel": [73.1107, 18.9894],
    "Gateway of India (Ferry)": [72.8347, 18.9220],
    "Alibaug (Jetty)": [72.8710, 18.6430],

    # 🚕 V3: GIG TRANSIT CUSTOM LOCATIONS (Deterministic Dictionary)
    "Home (Apartment)": [72.8400, 19.0596], # Maps to a spot near Bandra
    "Office (BKC)": [72.8650, 19.0660],     # Maps to BKC
    "Airport T2": [72.8743, 19.0974],
    "Phoenix Mall": [72.8222, 18.9953]
}

def get_coords(station_name):
    # Returns default coordinates if not found to prevent crashes
    return MUMBAI_LOCATIONS.get(station_name, [72.8427, 19.0178])

# Add this function to the bottom of your Backend/mumbai_data.py file

def get_coords(location_string: str):
    """
    V3 Update: Accepts station names OR raw "lat,lng" strings from the frontend map.
    Returns format: [longitude, latitude] for OSRM.
    """
    # 1. Check if it's a raw coordinate string from our Map UI (e.g. "19.0596,72.8400")
    if "," in location_string:
        try:
            parts = location_string.split(",")
            lat = float(parts[0].strip())
            lon = float(parts[1].strip())
            return [lon, lat] # OSRM needs [lon, lat]
        except Exception:
            pass # Fallback to dictionary if parsing fails
            
    # 2. Check if it's a known Station/Location string
    return MUMBAI_LOCATIONS.get(location_string, [72.8427, 19.0178]) # Default to Dadar if lost