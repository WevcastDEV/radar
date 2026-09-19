from typing import List, Optional
from pydantic import BaseModel, Field

class RecommendationRequest(BaseModel):
    seller_latitude: float
    seller_longitude: float
    max_results: int = 10
    segment_id: Optional[str] = None
    min_score: Optional[float] = 0.0

class RecommendationResponse(BaseModel):
    lead_id: str
    lead_name: str
    score: float
    distance_km: float
    segment: str
    reasons: List[str]
    priority_rank: int

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    max_distance_km: float = 50.0
    max_visits: int = 10
    segment_id: Optional[str] = None
    min_score: Optional[float] = 0.0

class RouteStop(BaseModel):
    lead_id: str
    lead_name: str
    address: str
    lat: float
    lng: float
    score: float
    distance_from_prev_km: float
    order: int

class RouteResponse(BaseModel):
    stops: List[RouteStop]
    total_distance_km: float
    estimated_time_min: float
    total_score: float

class RegionRanking(BaseModel):
    neighborhood: str
    lead_count: int
    avg_score: float
    distance_km: Optional[float] = None
    opportunities: int
    previous_sales: int
    conversion_potential: float

class ScoreFactor(BaseModel):
    factor: str
    points: float
    label: str

class ScoreCalculation(BaseModel):
    lead_id: Optional[str] = None
    factors: List[ScoreFactor]
    total_score: float
    level: str

class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float

class HeatmapData(BaseModel):
    points: List[HeatmapPoint]

class ScoreCalculateRequest(BaseModel):
    lead_id: Optional[str] = None
    estimated_employees: Optional[int] = None
    is_night_operation: bool = False
    is_24h_operation: bool = False
    has_high_traffic: bool = False
    has_large_exterior: bool = False
    is_new_business: bool = False
    segment_slug: Optional[str] = None
    last_contact_days_ago: Optional[int] = None
