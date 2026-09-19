import math
from typing import Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2)**2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * (math.sin(dlon / 2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    R = 6371.0
    
    # coordinate offsets in radians
    dlat = radius_km / R
    dlon = radius_km / (R * math.cos(math.radians(lat)))
    
    # offset in degrees
    dlat = math.degrees(dlat)
    dlon = math.degrees(dlon)
    
    min_lat = lat - dlat
    max_lat = lat + dlat
    min_lon = lon - dlon
    max_lon = lon + dlon
    
    return min_lat, max_lat, min_lon, max_lon
