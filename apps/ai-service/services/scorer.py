from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from models.schemas import ScoreCalculation, ScoreFactor

class ScoringService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_rules_from_db(self) -> List[Dict[str, Any]]:
        # Mocking rules for now. In a real scenario, this queries a `scoring_rules` table.
        return [
            {"factor": "is_24h_operation", "points": 30.0, "label": "Operação 24 horas"},
            {"factor": "is_night_operation", "points": 20.0, "label": "Operação Noturna"},
            {"factor": "has_high_traffic", "points": 20.0, "label": "Alto Tráfego de Pessoas"},
            {"factor": "has_large_exterior", "points": 15.0, "label": "Área Externa Grande"},
            {"factor": "is_new_business", "points": 15.0, "label": "Novo Negócio"},
            {"factor": "employees_over_50", "points": 20.0, "label": "Mais de 50 Funcionários"},
        ]

    def get_score_level(self, total: float) -> str:
        if total >= 80: return "PRIORITY"
        if total >= 60: return "HIGH"
        if total >= 40: return "GOOD"
        if total >= 20: return "MEDIUM"
        return "LOW"

    async def calculate_score(self, lead_attributes: Dict[str, Any]) -> ScoreCalculation:
        rules = await self.get_rules_from_db()
        factors: List[ScoreFactor] = []
        total_score = 0.0

        for rule in rules:
            factor_key = rule["factor"]
            apply_rule = False
            
            if factor_key == "employees_over_50":
                emp = lead_attributes.get("estimated_employees")
                if emp and emp > 50:
                    apply_rule = True
            elif lead_attributes.get(factor_key):
                apply_rule = True

            if apply_rule:
                total_score += rule["points"]
                factors.append(ScoreFactor(
                    factor=factor_key,
                    points=rule["points"],
                    label=rule["label"]
                ))
                
        total_score = min(100.0, total_score)
        
        return ScoreCalculation(
            lead_id=lead_attributes.get("lead_id"),
            factors=factors,
            total_score=total_score,
            level=self.get_score_level(total_score)
        )
