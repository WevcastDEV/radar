from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.schemas import RecommendationRequest, RecommendationResponse
from services.recommender import RecommenderService

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.post("/", response_model=List[RecommendationResponse])
async def get_recommendations(request: RecommendationRequest, db: AsyncSession = Depends(get_db)):
    service = RecommenderService(db)
    
    filters = {}
    if request.segment_id:
        filters['segment_id'] = request.segment_id
    if request.min_score:
        filters['min_score'] = request.min_score
        
    return await service.get_recommendations(
        seller_lat=request.seller_latitude,
        seller_lng=request.seller_longitude,
        max_results=request.max_results,
        filters=filters
    )
