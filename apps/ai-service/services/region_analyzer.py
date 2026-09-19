from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from models.schemas import RegionRanking

class RegionAnalyzer:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_region_stats(self) -> List[Dict[str, Any]]:
        query = text("""
            SELECT 
                a.neighborhood,
                COUNT(l.id) as lead_count,
                AVG(COALESCE(l.potential_value, 0)) as avg_value,
                SUM(CASE WHEN l.status IN ('NEW', 'CONTACTED', 'QUALIFIED') THEN 1 ELSE 0 END) as opportunities,
                SUM(CASE WHEN l.status = 'WON' THEN 1 ELSE 0 END) as previous_sales,
                SUM(CASE WHEN l.status IN ('WON', 'LOST') THEN 1 ELSE 0 END) as total_closed
            FROM addresses a
            JOIN leads l ON a.lead_id = l.id
            WHERE a.neighborhood IS NOT NULL
            GROUP BY a.neighborhood
        """)
        result = await self.db.execute(query)
        return [dict(row._mapping) for row in result]

    def calculate_conversion_potential(self, stats: Dict[str, Any]) -> float:
        total_closed = stats.get('total_closed', 0)
        previous_sales = stats.get('previous_sales', 0)
        
        if total_closed == 0:
            return 50.0 # Default baseline if no history
            
        win_rate = (previous_sales / total_closed) * 100
        return min(100.0, win_rate)

    async def rank_regions(self) -> List[RegionRanking]:
        stats_list = await self.get_region_stats()
        rankings = []
        
        for stats in stats_list:
            conv_potential = self.calculate_conversion_potential(stats)
            
            # Simple average score mock based on value and conversion
            avg_score = min(100.0, (stats['avg_value'] / 1000) * 0.5 + conv_potential * 0.5)
            
            rankings.append(RegionRanking(
                neighborhood=stats['neighborhood'],
                lead_count=stats['lead_count'],
                avg_score=round(avg_score, 2),
                distance_km=None, # Requires a reference point which isn't provided in the basic ranking
                opportunities=stats['opportunities'],
                previous_sales=stats['previous_sales'],
                conversion_potential=round(conv_potential, 2)
            ))
            
        # Rank by opportunities and conversion potential
        rankings.sort(key=lambda x: (x.opportunities * x.conversion_potential), reverse=True)
        return rankings[:10]
