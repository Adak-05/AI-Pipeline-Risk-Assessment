"""
Rule-based risk scoring engine (Python port of frontend riskEngine.js).
Used by the backend to score pipelines and store results in Supabase.

This is clearly labelled as a preliminary rule-based priority score,
NOT a validated ML failure-prediction model.
"""
from typing import Optional
import math

MODEL_VERSION = "rule_based_v1.0"
ASSESSMENT_TYPE = "rule_based"

MATERIAL_RISK_WEIGHTS = {
    "Cast Iron": 0.88,
    "Mild Steel": 0.72,
    "Reinforced Concrete": 0.55,
    "Ductile Iron": 0.38,
    "uPVC": 0.28,
    "HDPE": 0.12,
}

SOIL_RISK_WEIGHTS = {
    "Saline Coastal": 0.92,
    "Saline Clay": 0.88,
    "Coastal Marsh": 0.85,
    "Saline Marsh": 0.85,
    "Corrosive Clay": 0.80,
    "Clay Marsh": 0.75,
    "Moist Clay": 0.60,
    "Clay Loam": 0.50,
    "Saline Loam": 0.55,
    "Moist Loam": 0.40,
    "Sandy Loam": 0.25,
    "Sandy Dry": 0.20,
    "Rocky Loam": 0.18,
    "Rocky Stable": 0.12,
    "Engineered Fill": 0.10,
}


def calculate_risk(
    age_years: float,
    condition_score: float,
    previous_leaks: int,
    repair_count: int,
    operating_pressure_bar: float,
    material: str,
    soil_type: str,
    inspection_year: Optional[int] = None,
) -> dict:
    """
    Calculate a rule-based risk priority score (0-100).

    Returns a dict with: risk_score, risk_level, confidence,
    risk_breakdown, risk_factors.

    NOTE: This is a rule-based preliminary score for prioritisation only.
    It does NOT represent a validated ML model or certified failure probability.
    """
    # 1. Age Factor (26%)
    age_factor = min(1.0, max(0.0, age_years / 55.0))

    # 2. Physical Condition Factor (22%) — condition_score 1 (worst) to 10 (best)
    condition_score_clamped = max(1.0, min(10.0, condition_score))
    condition_factor = min(1.0, max(0.0, (10.0 - condition_score_clamped) / 9.0))

    # 3. Historical Leak/Repair Factor (22%)
    leak_factor = min(1.0, (previous_leaks * 0.12) + (repair_count * 0.08))

    # 4. Operating Pressure Factor (14%)
    pressure_factor = min(1.0, max(0.0, (operating_pressure_bar - 2.5) / 3.0))

    # 5. Material Susceptibility Factor (10%)
    mat_factor = MATERIAL_RISK_WEIGHTS.get(material.strip(), 0.50)

    # 6. Soil Corrosivity Factor (6%)
    soil_factor = SOIL_RISK_WEIGHTS.get(soil_type.strip(), 0.40)

    composite = (
        age_factor * 0.26
        + condition_factor * 0.22
        + leak_factor * 0.22
        + pressure_factor * 0.14
        + mat_factor * 0.10
        + soil_factor * 0.06
    )

    risk_score = min(99, max(5, round(composite * 100)))

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Confidence (data-density metric, not certified probability)
    years_since_inspection = max(0, 2026 - (inspection_year or 2023))
    confidence = 94 - (years_since_inspection * 2)
    if previous_leaks > 0 and repair_count > 0:
        confidence += 2
    if not soil_type or soil_type == "Unknown":
        confidence -= 4
    confidence = min(96, max(82, confidence))

    breakdown = {
        "age_contribution": round(age_factor * 26),
        "condition_contribution": round(condition_factor * 22),
        "leak_contribution": round(leak_factor * 22),
        "pressure_contribution": round(pressure_factor * 14),
        "material_contribution": round(mat_factor * 10),
        "soil_contribution": round(soil_factor * 6),
    }

    critical_factors = []
    positive_factors = []

    if age_years >= 40:
        critical_factors.append({
            "title": "Severe Material Ageing",
            "description": f"Pipeline age of {age_years} years exceeds recommended threshold (40 yrs)."
        })
    elif age_years >= 25:
        critical_factors.append({
            "title": "Moderate Service Lifespan",
            "description": f"Pipeline has reached {age_years} years; mid-life degradation possible."
        })
    else:
        positive_factors.append({
            "title": "Modern Asset Age",
            "description": f"Installed {age_years} years ago; baseline integrity remains high."
        })

    if previous_leaks >= 5:
        critical_factors.append({
            "title": "Frequent Structural Failures",
            "description": f"Recorded {previous_leaks} previous leaks and {repair_count} repair interventions."
        })
    elif previous_leaks >= 2:
        critical_factors.append({
            "title": "Moderate Leak History",
            "description": f"{previous_leaks} prior leak incidents detected."
        })
    else:
        positive_factors.append({
            "title": "Clean Failure History",
            "description": f"Low or zero leak incidents ({previous_leaks}) historically."
        })

    if condition_score_clamped <= 3.5:
        critical_factors.append({
            "title": "Critical Condition Score",
            "description": f"Condition rating {condition_score_clamped}/10 indicates severe structural wear."
        })
    elif condition_score_clamped >= 8.0:
        positive_factors.append({
            "title": "High Structural Integrity",
            "description": f"Condition score {condition_score_clamped}/10."
        })

    if operating_pressure_bar >= 4.5:
        critical_factors.append({
            "title": "Elevated Operating Pressure",
            "description": f"Operating at {operating_pressure_bar} bar; heightened rupture risk."
        })

    if material == "Cast Iron":
        critical_factors.append({
            "title": "Brittle Cast Iron Composition",
            "description": "Cast Iron is susceptible to circumferential fracturing and graphitization."
        })
    elif material == "HDPE":
        positive_factors.append({
            "title": "Flexible Modern Material (HDPE)",
            "description": "HDPE provides corrosion-free service with ground-settlement resilience."
        })

    if any(x in soil_type for x in ["Saline", "Marsh", "Corrosive"]):
        critical_factors.append({
            "title": "Aggressive Soil Environment",
            "description": f"{soil_type} accelerates galvanic pitting."
        })

    return {
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "confidence": float(confidence),
        "model_version": MODEL_VERSION,
        "assessment_type": ASSESSMENT_TYPE,
        "risk_breakdown": breakdown,
        "risk_factors": {"critical": critical_factors, "positive": positive_factors},
        "feature_inputs": {
            "age_years": age_years,
            "condition_score": condition_score_clamped,
            "previous_leaks": previous_leaks,
            "repair_count": repair_count,
            "operating_pressure_bar": operating_pressure_bar,
            "material": material,
            "soil_type": soil_type,
        }
    }
