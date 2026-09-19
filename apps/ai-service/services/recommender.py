from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from utils.geo import haversine_distance
from models.schemas import RecommendationResponse

class RecommenderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_leads_with_scores(self) -> List[Dict[str, Any]]:
        query = text("""
            SELECT l.id, l.name, s.slug as segment, a.latitude, a.longitude,
                   l.is_night_operation, l.is_24h_operation, l.has_high_traffic,
                   l.has_large_exterior, l.is_new_business, l.estimated_employees,
                   l.last_contact_at
            FROM leads l
            LEFT JOIN segments s ON l.segment_id = s.id
            LEFT JOIN addresses a ON l.id = a.lead_id
            WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
              AND l.status NOT IN ('WON', 'LOST', 'INACTIVE')
        """)
        result = await self.db.execute(query)
        return [dict(row._mapping) for row in result]

    def calculate_recency_score(self, last_contact_at: Optional[Any]) -> float:
        if not last_contact_at:
            return 100.0
        # Simple placeholder logic, assumes we get a datetime
        # Ideally, we calculate days since last contact
        # For now, return a generic score
        return 50.0

    def get_segment_value(self, segment_slug: str) -> float:
        high_value = ['condominio', 'industria', 'hospital', 'banco', 'centro-logistico']
        medium_value = ['comercio', 'escola', 'supermercado', 'hotel']
        if not segment_slug:
            return 30.0
        if segment_slug in high_value:
            return 100.0
        if segment_slug in medium_value:
            return 70.0
        return 40.0

    def calculate_security_score(self, lead: Dict[str, Any]) -> float:
        score = 0.0
        if lead.get('is_24h_operation'): score += 30.0
        if lead.get('is_night_operation'): score += 20.0
        if lead.get('has_high_traffic'): score += 20.0
        if lead.get('has_large_exterior'): score += 15.0
        if lead.get('is_new_business'): score += 15.0
        return min(100.0, score)

    def generate_reasons(self, lead: Dict[str, Any]) -> List[str]:
        reasons = []
        if lead.get('is_24h_operation'): reasons.append('Alto potencial para monitoramento 24h')
        if lead.get('is_night_operation'): reasons.append('Funcionamento noturno')
        if lead.get('has_high_traffic'): reasons.append('Grande circulação de pessoas')
        if lead.get('has_large_exterior'): reasons.append('Área externa ampla')
        if lead.get('is_new_business'): reasons.append('Empreendimento recém-aberto')
        emp = lead.get('estimated_employees')
        if emp and emp > 50: reasons.append('Estabelecimento de grande porte')
        return reasons

    async def get_recommendations(self, seller_lat: float, seller_lng: float, max_results: int, filters: Dict[str, Any]) -> List[RecommendationResponse]:
        leads = await self.get_leads_with_scores()
        scored_leads = []
        
        segment_filter = filters.get('segment_id')
        min_score = filters.get('min_score', 0.0)

        for lead in leads:
            # We don't have segment_id in the simple query but we have segment slug
            # Assuming filter could just be skipped for this boilerplate or implemented properly
            
            dist_km = haversine_distance(seller_lat, seller_lng, lead['latitude'], lead['longitude'])
            
            # Normalize distance score (closer is better, max 50km for points)
            proximity_score = max(0.0, 100.0 - (dist_km * 2))
            
            sec_score = self.calculate_security_score(lead)
            recency_score = self.calculate_recency_score(lead.get('last_contact_at'))
            seg_score = self.get_segment_value(lead.get('segment'))
            
            total_score = (sec_score * 0.4) + (proximity_score * 0.25) + (recency_score * 0.2) + (seg_score * 0.15)
            
            if total_score >= min_score:
                scored_leads.append({
                    'lead': lead,
                    'score': total_score,
                    'dist_km': dist_km,
                    'reasons': self.generate_reasons(lead)
                })

        scored_leads.sort(key=lambda x: x['score'], reverse=True)
        top_leads = scored_leads[:max_results]
        
        results = []
        for i, item in enumerate(top_leads):
            lead = item['lead']
            results.append(RecommendationResponse(
                lead_id=str(lead['id']),
                lead_name=lead['name'],
                score=round(item['score'], 2),
                distance_km=round(item['dist_km'], 2),
                segment=lead.get('segment', 'Outros'),
                reasons=item['reasons'],
                priority_rank=i + 1
            ))
            
        return results
