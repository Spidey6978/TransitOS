class QRMinifier:
    """
    Expands ultra-compressed offline QR strings back into full Pydantic payloads.
    Example Input: "TKT|a1b2c3d4|AND|CHU|M|2|1"
    """
    
    # Station Code Dictionary (Maps 3-letter substrings back to full DB names)
    # WARNING: These MUST match the first 3 letters of the stations in mumbai_data.py
    # because the React frontend uses .substring(0, 3).toUpperCase() to generate them!
    STATION_MAP = {
        # Western Line
        "CHU": "Churchgate", 
        "MAR": "Marine Lines",     # COLLISION: Marol Naka also yields MAR
        "CHA": "Charni Road", 
        "GRA": "Grant Road", 
        "MUM": "Mumbai Central", 
        "DAD": "Dadar (Western)",  # COLLISION: Dadar (Central) also yields DAD
        "BAN": "Bandra", 
        "AND": "Andheri", 
        "BOR": "Borivali",
        "VIR": "Virar",
        "DAH": "Dahisar",
        
        # Central/Harbour Line
        "CST": "CST", 
        "BYC": "Byculla", 
        "KUR": "Kurla",
        "GHA": "Ghatkopar", 
        "THA": "Thane", 
        "KAL": "Kalyan",
        "VAS": "Vashi", 
        "PAN": "Panvel",
        
        # Metro & Monorail
        "VER": "Versova (Metro)", 
        "WEH": "WEH", 
        # "MAR": "Marol Naka",     # Commented out to prevent overwriting Marine Lines
        "CHE": "Chembur (Monorail)", 
        "WAD": "Wadala Depot",
        
        # Ferry
        "GAT": "Gateway of India (Ferry)", 
        "ALI": "Alibaug (Jetty)"
    }

    @staticmethod
    def decode_scanned_qr(raw_qr_string: str, commuter_name: str) -> dict:
        parts = raw_qr_string.split('|')
        
        # Security: Reject malformed or tampered QR strings instantly
        if len(parts) != 7 or parts[0] != 'TKT':
            raise ValueError(f"Invalid TransitOS Signature: {raw_qr_string}")
            
        # Map the mode code back to the backend schema
        mode_char = parts[4].upper()
        if mode_char == 'M': mode = "Metro"
        elif mode_char == 'B': mode = "Bus"
        else: mode = "Local Train"
            
        return {
            "ticket_id": parts[1],
            "commuter_name": commuter_name,
            
            # Map codes back, fallback to raw string if not in dict
            "from_station": QRMinifier.STATION_MAP.get(parts[2], parts[2]),
            "to_station": QRMinifier.STATION_MAP.get(parts[3], parts[3]),
            
            "mode": mode,
            "ticket_class": "Standard", # Default
            "adults": int(parts[5]),
            "children": int(parts[6])
        }

# --- Quick Local Test ---
if __name__ == "__main__":
    # Test string using the exact substring format from the React frontend
    test_qr = "TKT|f8a9b2c1|DAH|WEH|M|2|1"
    print("📥 Raw QR Scan:", test_qr)
    expanded = QRMinifier.decode_scanned_qr(test_qr, "Offline_User")
    print("📤 Expanded Payload:", expanded)