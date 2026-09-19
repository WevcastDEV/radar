from typing import List, Dict, Any, Tuple
from utils.geo import haversine_distance

class RouteOptimizer:
    def nearest_neighbor(self, start_lat: float, start_lng: float, leads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        unvisited = leads.copy()
        current_lat, current_lng = start_lat, start_lng
        route = []

        while unvisited:
            best_idx = 0
            min_dist = float('inf')
            
            for i, lead in enumerate(unvisited):
                dist = haversine_distance(current_lat, current_lng, lead['lat'], lead['lng'])
                if dist < min_dist:
                    min_dist = dist
                    best_idx = i
                    
            next_node = unvisited.pop(best_idx)
            next_node['distance_from_prev_km'] = min_dist
            route.append(next_node)
            current_lat, current_lng = next_node['lat'], next_node['lng']
            
        return route

    def calculate_total_distance(self, route: List[Dict[str, Any]], start_lat: float, start_lng: float) -> float:
        if not route:
            return 0.0
        total = route[0]['distance_from_prev_km']
        for i in range(1, len(route)):
            total += haversine_distance(route[i-1]['lat'], route[i-1]['lng'], route[i]['lat'], route[i]['lng'])
        return total

    def two_opt_improve(self, route: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Basic 2-opt implementation for TSP optimization
        best_route = route
        improved = True
        
        while improved:
            improved = False
            for i in range(1, len(best_route) - 2):
                for j in range(i + 1, len(best_route)):
                    if j - i == 1:
                        continue
                    
                    new_route = best_route[:]
                    new_route[i:j] = best_route[j-1:i-1:-1]
                    
                    # Note: We need a dummy start to accurately recalculate 2-opt, 
                    # but for simplicity we only check internal distances.
                    old_dist = self.calculate_total_distance(best_route, 0, 0)
                    new_dist = self.calculate_total_distance(new_route, 0, 0)
                    
                    if new_dist < old_dist:
                        best_route = new_route
                        improved = True
        
        # Recalculate distance_from_prev_km for the final route
        if best_route:
            # We assume the first node's distance_from_prev_km was calculated from start point in nearest_neighbor
            for i in range(1, len(best_route)):
                best_route[i]['distance_from_prev_km'] = haversine_distance(
                    best_route[i-1]['lat'], best_route[i-1]['lng'],
                    best_route[i]['lat'], best_route[i]['lng']
                )
                
        return best_route

    def estimate_travel_time(self, distance_km: float) -> float:
        # Assume 30km/h average speed in city
        speed_km_h = 30.0
        return (distance_km / speed_km_h) * 60.0 # in minutes

    def optimize_route(self, start_lat: float, start_lng: float, leads: List[Dict[str, Any]], max_visits: int) -> Tuple[List[Dict[str, Any]], float, float]:
        if not leads:
            return [], 0.0, 0.0
            
        # 1. Generate initial route with Nearest Neighbor
        initial_route = self.nearest_neighbor(start_lat, start_lng, leads)
        
        # Limit to max visits
        limited_route = initial_route[:max_visits]
        
        # 2. Optimize with 2-opt
        optimized_route = self.two_opt_improve(limited_route)
        
        # 3. Calculate metrics
        total_distance = self.calculate_total_distance(optimized_route, start_lat, start_lng)
        estimated_time = self.estimate_travel_time(total_distance)
        
        return optimized_route, total_distance, estimated_time
