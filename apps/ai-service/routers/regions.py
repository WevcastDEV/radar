from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.schemas import RegionRanking
from services.region_analyzer import RegionAnalyzer

router = APIRouter(prefix="/api/regions", tags=["Regions"])

@router.get("/ranking", response_model=List[RegionRanking])
async def get_region_ranking(db: AsyncSession = Depends(get_db)):
    service = RegionAnalyzer(db)
    return await service.rank_regions()
