import requests
import json
import math
from functools import lru_cache

class TransitPathfinder:
    def __init__(self):
        self.osrm_url = "http://router.project-osrm.org/route/v1/driving"
        
        # --- LIGHTWEIGHT GTFS MOCK ---
        # Instead of parsing 500MB of CSVs, we hardcode the topographic "shapes" 
        # of our Golden Demo train/metro routes.
        self.fixed_transit_shapes = {
            # Dahisar to WEH (Metro Line 7) - Curving along the highway
            "DAHISAR_WEH": [
                [72.8601, 19.2494], # Dahisar East
                [72.8620, 19.2210], # Borivali Overshoot
                [72.8585, 19.1626], # Goregaon curve
                [72.8557, 19.1158]  # WEH Station
            ],
            # Andheri to Churchgate (Western Railway) - Curving along the coast
            "ANDHERI_CHURCHGATE": [
                [72.8697, 19.1136], # Andheri
                [72.8397, 19.0616], # Bandra curve
                [72.8222, 18.9953], # Lower Parel curve
                [72.8264, 18.9322]  # Churchgate
            ]
        }
        print("🗺️ Hybrid Pathfinder Initialized (OSRM + GTFS Mock).")

    def _haversine(self, coord1, coord2):
        """Fallback distance calculation"""
        R = 6371 
        dlat, dlon = math.radians(coord2[1] - coord1[1]), math.radians(coord2[0] - coord1[0])
        a = math.sin(dlat/2)**2 + math.cos(math.radians(coord1[1])) * math.cos(math.radians(coord2[1])) * math.sin(dlon/2)**2
        return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

    @lru_cache(maxsize=1024)
    def fetch_route(self, mode: str, station_from: str, station_to: str, olat: float, olng: float, dlat: float, dlng: float):
        """
        Returns (distance_km, geojson_path_string) based on the transit mode.
        """
        # 1. FIXED RAIL LOGIC (Simulated GTFS)
        if mode in ["train", "metro"]:
            route_key = f"{station_from.upper()}_{station_to.upper()}"
            reverse_key = f"{station_to.upper()}_{station_from.upper()}"
            
            # Check if we have the precise track geometry
            if route_key in self.fixed_transit_shapes:
                geom = self.fixed_transit_shapes[route_key]
                return round(self._haversine((olng, olat), (dlng, dlat)), 2), json.dumps(geom)
            elif reverse_key in self.fixed_transit_shapes:
                geom = list(reversed(self.fixed_transit_shapes[reverse_key]))
                return round(self._haversine((olng, olat), (dlng, dlat)), 2), json.dumps(geom)
            
            # Fallback for unmapped trains (straight line)
            return round(self._haversine((olng, olat), (dlng, dlat)), 2), json.dumps([[olng, olat], [dlng, dlat]])

        # 2. DYNAMIC ROAD LOGIC (OSRM for Buses)
        try:
            url = f"{self.osrm_url}/{olng},{olat};{dlng},{dlat}?overview=full&geometries=geojson"
            res = requests.get(url, timeout=5)
            
            if res.status_code == 200:
                data = res.json()
                route = data['routes'][0]
                distance_km = round(route['distance'] / 1000.0, 2)
                geometry = route['geometry']['coordinates'] 
                return distance_km, json.dumps(geometry)
                
        except Exception as e:
            print(f"⚠️ OSRM API Error: {e}")
            
        # 3. ABSOLUTE FALLBACK
        dist = round(self._haversine((olng, olat), (dlng, dlat)), 2)
        return dist, json.dumps([[olng, olat], [dlng, dlat]])