from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.schemas import ScoreCalculateRequest, ScoreCalculation
from services.scorer import ScoringService

router = APIRouter(prefix="/api/score", tags=["Scoring"])

@router.post("/calculate", response_model=ScoreCalculation)
async def calculate_score(request: ScoreCalculateRequest, db: AsyncSession = Depends(get_db)):
    service = ScoringService(db)
    return await service.calculate_score(request.model_dump())
