from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
from models.schemas import RouteRequest, RouteResponse, RouteStop
from services.route_optimizer import RouteOptimizer
from utils.geo import haversine_distance

router = APIRouter(prefix="/api/route", tags=["Routing"])

@router.post("/optimize", response_model=RouteResponse)
async def optimize_route(request: RouteRequest, db: AsyncSession = Depends(get_db)):
    # 1. Fetch leads
    query_str = """
        SELECT l.id, l.name, a.latitude as lat, a.longitude as lng, a.formatted_address,
               COALESCE(l.potential_value, 0) as score
        FROM leads l
        JOIN addresses a ON l.id = a.lead_id
        WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
          AND l.status NOT IN ('WON', 'LOST', 'INACTIVE')
    """
    
    # Optional filtering
    params = {}
    if request.segment_id:
        query_str += " AND l.segment_id = :segment_id"
        params['segment_id'] = request.segment_id
        
    query = text(query_str)
    result = await db.execute(query, params)
    all_leads = [dict(row._mapping) for row in result]
    
    # Filter by distance and min_score
    qualifying_leads = []
    for lead in all_leads:
        # Assuming score here is proportional to value, in a real scenario use ScoringService
        if lead['score'] < request.min_score:
            continue
            
        dist = haversine_distance(request.start_lat, request.start_lng, lead['lat'], lead['lng'])
        if dist <= request.max_distance_km:
            lead['address'] = lead['formatted_address'] or f"{lead['lat']}, {lead['lng']}"
            qualifying_leads.append(lead)
            
    # 2. Optimize Route
    optimizer = RouteOptimizer()
    optimized_route, total_distance, estimated_time = optimizer.optimize_route(
        start_lat=request.start_lat,
        start_lng=request.start_lng,
        leads=qualifying_leads,
        max_visits=request.max_visits
    )
    
    # 3. Format Response
    stops = []
    total_score = 0.0
    for i, lead in enumerate(optimized_route):
        stops.append(RouteStop(
            lead_id=str(lead['id']),
            lead_name=lead['name'],
            address=lead['address'],
            lat=lead['lat'],
            lng=lead['lng'],
            score=lead['score'],
            distance_from_prev_km=round(lead.get('distance_from_prev_km', 0), 2),
            order=i + 1
        ))
        total_score += lead['score']
        
    return RouteResponse(
        stops=stops,
        total_distance_km=round(total_distance, 2),
        estimated_time_min=round(estimated_time, 2),
        total_score=round(total_score, 2)
    )
