/**
 * AI-Style Ageing Pipeline Risk Assessment Engine
 * 
 * Modular risk scoring algorithm designed to mirror multi-criteria ML feature weighting.
 * Can be directly substituted with a REST API endpoint calling a trained XGBoost/RandomForest model.
 * 
 * Score Range: 0 - 100
 * Risk Categories:
 *   - LOW: 0 - 39
 *   - MEDIUM: 40 - 69
 *   - HIGH: 70 - 100
 */

// Material baseline vulnerability coefficients (based on water utility empirical failure rates)
export const MATERIAL_RISK_WEIGHTS = {
  'Cast Iron': 0.88,        // Highly prone to graphitization, internal tuberculation, brittleness
  'Mild Steel': 0.72,       // Susceptible to external galvanic corrosion if coating compromised
  'Reinforced Concrete': 0.55, // Sulfate attack, microcracking under pressure cycles
  'Ductile Iron': 0.38,     // Good tensile strength, moderate corrosion resistance with zinc coating
  'uPVC': 0.28,             // Joint displacement, susceptible to cyclic surge fatigue
  'HDPE': 0.12,             // Highly ductile, fused joints, negligible chemical corrosion
};

// Soil corrosivity ratings
export const SOIL_RISK_WEIGHTS = {
  'Saline Coastal': 0.92,
  'Saline Clay': 0.88,
  'Coastal Marsh': 0.85,
  'Saline Marsh': 0.85,
  'Corrosive Clay': 0.80,
  'Clay Marsh': 0.75,
  'Moist Clay': 0.60,
  'Clay Loam': 0.50,
  'Saline Loam': 0.55,
  'Moist Loam': 0.40,
  'Sandy Loam': 0.25,
  'Sandy Dry': 0.20,
  'Rocky Loam': 0.18,
  'Rocky Stable': 0.12,
  'Engineered Fill': 0.10,
};

/**
 * Calculates normalized risk score (0-100) for a given pipeline
 */
export function calculatePipelineRisk(pipeline) {
  const age = Number(pipeline.Age_Years || pipeline.Pipeline_Age || 0);
  const conditionScore = Number(pipeline.Condition_Score || 5); // 1 (worst) to 10 (best)
  const previousLeaks = Number(pipeline.Previous_Leaks ?? pipeline.Previous_Failures ?? 0);
  const repairCount = Number(pipeline.Repair_Count ?? 0);
  const operatingPressure = Number(pipeline.Operating_Pressure_bar ?? pipeline.Operating_Pressure ?? 3.5);
  const material = (pipeline.Material || 'Ductile Iron').trim();
  const soil = (pipeline.Soil_Type || pipeline['Soil/Environmental Condition'] || 'Sandy Loam').trim();

  // 1. Age Factor (Weight: 26%)
  // Baseline assumption: Designed lifespan is typically 40-50 years for older mains
  const ageFactor = Math.min(1.0, Math.max(0, age / 55));

  // 2. Physical Condition Deterioration Factor (Weight: 22%)
  // Condition score 1-10 -> 1 is critical failure, 10 is pristine new
  const conditionFactor = Math.min(1.0, Math.max(0, (10 - conditionScore) / 9.0));

  // 3. Historical Failure & Leak Frequency Factor (Weight: 22%)
  // Multiple leaks and repeat repairs indicate localized metallurgical decay
  const leakFactor = Math.min(1.0, (previousLeaks * 0.12) + (repairCount * 0.08));

  // 4. Operating Hydraulic Pressure Stress Factor (Weight: 14%)
  // Standard distribution pressure is 2.5 - 3.5 bar. High pressure (> 4.5 bar) induces hoop stress on weakened walls
  const pressureFactor = Math.min(1.0, Math.max(0, (operatingPressure - 2.5) / 3.0));

  // 5. Material Susceptibility Factor (Weight: 10%)
  const matFactor = MATERIAL_RISK_WEIGHTS[material] ?? 0.50;

  // 6. Soil Environment Corrosivity Factor (Weight: 6%)
  const soilFactor = SOIL_RISK_WEIGHTS[soil] ?? 0.40;

  // Weighted composite score (0.0 to 1.0)
  const compositeScore = (
    (ageFactor * 0.26) +
    (conditionFactor * 0.22) +
    (leakFactor * 0.22) +
    (pressureFactor * 0.14) +
    (matFactor * 0.10) +
    (soilFactor * 0.06)
  );

  // Scaled to integer 0 - 100
  let calculatedScore = Math.round(compositeScore * 100);
  calculatedScore = Math.min(99, Math.max(5, calculatedScore));

  // Classification
  let riskLevel = 'LOW';
  if (calculatedScore >= 70) {
    riskLevel = 'HIGH';
  } else if (calculatedScore >= 40) {
    riskLevel = 'MEDIUM';
  }

  // Model confidence index (Dynamic estimate based on data completeness & recency)
  const inspectionYear = Number(pipeline.Inspection_Year || 2023);
  const yearsSinceInspection = Math.max(0, 2026 - inspectionYear);
  let confidence = 94 - (yearsSinceInspection * 2);
  if (previousLeaks > 0 && repairCount > 0) confidence += 2;
  if (!soil || soil === 'Unknown') confidence -= 4;
  confidence = Math.min(96, Math.max(82, confidence));

  // Factor contributions
  const factors = identifyRiskFactors({
    age,
    conditionScore,
    previousLeaks,
    repairCount,
    operatingPressure,
    material,
    soil,
    calculatedScore,
    riskLevel
  });

  return {
    riskScore: calculatedScore,
    riskLevel,
    confidence,
    factors,
    breakdown: {
      ageContribution: Math.round(ageFactor * 26),
      conditionContribution: Math.round(conditionFactor * 22),
      leakContribution: Math.round(leakFactor * 22),
      pressureContribution: Math.round(pressureFactor * 14),
      materialContribution: Math.round(matFactor * 10),
      soilContribution: Math.round(soilFactor * 6),
    }
  };
}

/**
 * Extracts human-readable risk and positive factors for explanatory AI output
 */
function identifyRiskFactors({
  age,
  conditionScore,
  previousLeaks,
  repairCount,
  operatingPressure,
  material,
  soil,
  riskLevel
}) {
  const critical = [];
  const positive = [];

  // Age analysis
  if (age >= 40) {
    critical.push({
      type: 'warning',
      title: 'Severe Material Ageing',
      description: `Pipeline age of ${age} years exceeds municipal recommended threshold (40 yrs), resulting in wall thinning and fatigue.`
    });
  } else if (age >= 25) {
    critical.push({
      type: 'warning',
      title: 'Moderate Service Lifespan',
      description: `Pipeline has reached ${age} years in service; mid-life joint degradation possible.`
    });
  } else {
    positive.push({
      type: 'positive',
      title: 'Modern Asset Age',
      description: `Installed relatively recently (${age} years in service); baseline metallurgical integrity remains high.`
    });
  }

  // Leakage & Repairs
  if (previousLeaks >= 5) {
    critical.push({
      type: 'warning',
      title: 'Frequent Structural Failures',
      description: `Recorded ${previousLeaks} previous leaks and ${repairCount} major repair interventions; strong indicator of recurring stress points.`
    });
  } else if (previousLeaks >= 2) {
    critical.push({
      type: 'warning',
      title: 'Moderate Leak History',
      description: `${previousLeaks} prior leak incidents detected, requiring active acoustic monitoring.`
    });
  } else {
    positive.push({
      type: 'positive',
      title: 'Clean Failure History',
      description: `Low or zero leak incidents (${previousLeaks}) reported historically.`
    });
  }

  // Physical Condition
  if (conditionScore <= 3.5) {
    critical.push({
      type: 'warning',
      title: 'Critical Condition Score Degradation',
      description: `Condition rating of ${conditionScore}/10 indicates acute internal tuberculation and severe structural wear.`
    });
  } else if (conditionScore >= 8.0) {
    positive.push({
      type: 'positive',
      title: 'High Structural Integrity',
      description: `Condition score is ${conditionScore}/10 with smooth hydraulic flow profile.`
    });
  }

  // Pressure
  if (operatingPressure >= 4.5) {
    critical.push({
      type: 'warning',
      title: 'Elevated Operating Pressure',
      description: `Operating at ${operatingPressure} bar; high hydraulic pressure surges heighten rupture probability on aged pipe sections.`
    });
  }

  // Material & Soil
  if (material === 'Cast Iron') {
    critical.push({
      type: 'warning',
      title: 'Brittle Cast Iron Composition',
      description: 'Cast Iron assets are susceptible to circumferential fracturing and internal graphitization in corrosive soil.'
    });
  } else if (material === 'HDPE') {
    positive.push({
      type: 'positive',
      title: 'Flexible Modern Material (HDPE)',
      description: 'High-Density Polyethylene provides corrosion-free service with elastic ground-settlement resilience.'
    });
  }

  if (soil.includes('Saline') || soil.includes('Marsh') || soil.includes('Corrosive')) {
    critical.push({
      type: 'warning',
      title: 'Aggressive Soil Environment',
      description: `${soil} exhibits high resistivity/chloride content accelerating exterior galvanic pitting.`
    });
  }

  return { critical, positive };
}

/**
 * Generates actionable municipal engineering recommendations
 */
export function getMaintenanceRecommendations(riskLevel, pipeline) {
  if (riskLevel === 'HIGH') {
    return {
      priority: 'HIGH PRIORITY',
      badgeColor: 'red',
      summary: 'Schedule detailed physical inspection and preventive rehabilitation/replacement immediately.',
      actions: [
        '1. Deploy acoustic listening sticks and ground-penetrating radar for localized leak verification.',
        '2. Conduct step-testing and hydraulic pressure modulation to decrease surge stress.',
        '3. Inspect internal pipe condition via closed-circuit television (CCTV) or acoustic resonance inspection.',
        '4. Review historical weld and coupling repair records in GIS maintenance archive.',
        '5. Flag for capital expenditure asset replacement if wall-thickness loss exceeds 40%.'
      ],
      quickButtons: [
        { label: 'Schedule Urgent Inspection', action: 'INSPECT', variant: 'primary' },
        { label: 'Flag for Pipeline Replacement', action: 'REPLACE', variant: 'danger' },
        { label: 'Download Engineering Work Order', action: 'REPORT', variant: 'outline' }
      ]
    };
  } else if (riskLevel === 'MEDIUM') {
    return {
      priority: 'MEDIUM PRIORITY',
      badgeColor: 'amber',
      summary: 'Schedule preventive inspection and maintain continuous acoustic leak monitoring.',
      actions: [
        '1. Implement quarterly acoustic leak detection audits along critical distribution nodes.',
        '2. Verify pressure relief valve calibration to prevent transient pressure spikes (> 4.2 bar).',
        '3. Inspect adjacent soil moisture levels for early indicators of pinhole permeation.',
        '4. Review historical joint repair logs and prioritize cathodic protection checks.',
        '5. Schedule non-destructive ultrasonic wall thickness testing before next monsoon season.'
      ],
      quickButtons: [
        { label: 'Schedule Preventive Audit', action: 'AUDIT', variant: 'primary' },
        { label: 'Deploy Temporary Sensors', action: 'SENSOR', variant: 'secondary' },
        { label: 'Export Risk Profile', action: 'REPORT', variant: 'outline' }
      ]
    };
  } else {
    return {
      priority: 'LOW PRIORITY',
      badgeColor: 'green',
      summary: 'Continue routine baseline surveillance and adhere to standard municipal inspection schedule.',
      actions: [
        '1. Continue regular SCADA hydraulic flow rate telemetry and telemetry log checks.',
        '2. Maintain standard bi-annual valve exercising and air-valve servicing.',
        '3. Retain current operating pressure parameters (approx 3.0 - 3.4 bar).',
        '4. Schedule periodic visual chamber inspection during routine ward maintenance rounds.',
        '5. Reassess risk classification after next scheduled triennial infrastructure review.'
      ],
      quickButtons: [
        { label: 'Log Routine Check', action: 'LOG', variant: 'secondary' },
        { label: 'Export Assessment', action: 'REPORT', variant: 'outline' }
      ]
    };
  }
}

/**
 * Enriches a raw pipeline array with calculated AI risk properties
 */
export function enrichPipelinesWithRisk(pipelines) {
  return pipelines.map(p => {
    const risk = calculatePipelineRisk(p);
    return {
      ...p,
      Calculated_Risk_Score: risk.riskScore,
      Calculated_Risk_Level: risk.riskLevel,
      AI_Confidence: risk.confidence,
      Risk_Factors: risk.factors,
      Risk_Breakdown: risk.breakdown,
      Recommendations: getMaintenanceRecommendations(risk.riskLevel, p)
    };
  });
}
