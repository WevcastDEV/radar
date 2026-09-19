from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
from models.schemas import HeatmapData, HeatmapPoint

router = APIRouter(prefix="/api/heatmap", tags=["Heatmap"])

@router.get("/", response_model=HeatmapData)
async def get_heatmap(db: AsyncSession = Depends(get_db)):
    query = text("""
        SELECT a.latitude, a.longitude, 
               COUNT(l.id) as count, 
               AVG(COALESCE(l.potential_value, 50)) as avg_score
        FROM addresses a
        JOIN leads l ON a.lead_id = l.id
        WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
        GROUP BY ROUND(a.latitude::numeric, 3), ROUND(a.longitude::numeric, 3), a.latitude, a.longitude
    """)
    result = await db.execute(query)
    rows = result.fetchall()
    
    points = []
    for row in rows:
        count = row.count
        avg_score = row.avg_score
        # Calculate an intensity based on count and avg_score
        intensity = min(1.0, (count * 0.5 + (avg_score / 100) * 0.5) / 10.0)
        
        points.append(HeatmapPoint(
            lat=float(row.latitude),
            lng=float(row.longitude),
            intensity=intensity
        ))
        
    return HeatmapData(points=points)
