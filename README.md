# AI-Powered Ageing Pipeline Risk Assessment System
### College Capstone Project Prototype — Municipal Water Infrastructure Risk Monitoring

A responsive web application for urban water infrastructure management, focused specifically on predicting and assessing the vulnerability of ageing water distribution pipelines using historical inspection data and an AI/ML-style multi-criteria risk assessment engine.

---

## 🌟 Key Features

1. **Authentication Portal (`/login`)**:
   - Municipal Engineer role-based demo gateway.
   - Direct pass-through for evaluation and demonstration.

2. **Executive Overview Dashboard (`/dashboard`)**:
   - Dynamic KPIs: Total Pipelines (50), High-Risk, Medium-Risk, Low-Risk pipelines, and Average Asset Age.
   - **Pipeline Risk Distribution**: Interactive Recharts Donut Chart with center total counter.
   - **Pipeline Age vs. Risk Score**: Interactive Recharts Scatter Chart showing degradation clustering.
   - **Priority Intervention Queue**: Highest-risk distribution mains prioritized with 1-click inspection action.

3. **Historical Data Upload & Validation (`/pipeline-data`)**:
   - Drag & drop CSV dataset upload.
   - **"Use Sample Dataset"** 1-click button loading the bundled 50-record municipal dataset (`/public/data/ageing_pipeline_50_records.csv`).
   - Automated 5-point data integrity validation:
     - Required parameter check (15 attributes)
     - Empty values & null checks
     - Anomaly detection for ages and installation years
     - Duplicate Pipeline ID detection
     - Data quality & readiness indicator

4. **AI Risk Assessment Results (`/ai-risk-prediction`)**:
   - Large Circular Risk Gauge (0–100 scale).
   - Dynamic Prediction Confidence metric.
   - Multi-criteria deterministic feature weighting:
     - Pipeline Age (26%)
     - Physical Condition Score (22%)
     - Historical Failure & Leak Frequency (22%)
     - Operating Hydraulic Pressure Stress (14%)
     - Material Brittleness (Cast Iron vs HDPE) (10%)
     - Soil Environment Corrosivity (6%)
   - Sortable & filterable table with real-time search.

5. **Individual Pipeline Risk Diagnostic (`/pipeline/:id`)**:
   - Comprehensive asset metadata sheet (Installation year, material, diameter, length, soil type, previous leaks, pressure).
   - Large horizontal segmented **Risk Meter** (`0 ── LOW ── MEDIUM ── HIGH ── 100`) with pointer marker.
   - **AI Risk Factors**: Explanatory breakdown showing positive vs. negative contributing risk factors.

6. **Maintenance Recommendations (`/recommendations`)**:
   - Grouped prescriptive engineering work orders:
     - **HIGH PRIORITY**: Physical acoustic leak detection, pressure transient mitigation, and capital replacement review.
     - **MEDIUM PRIORITY**: Quarterly acoustic sensor audits and pressure relief valve calibration.
     - **LOW PRIORITY**: Routine SCADA telemetry monitoring.
   - Interactive action logging buttons ("Schedule Inspection", "Mark for Replacement", "Download Risk Report").

7. **Geospatial Pipeline Risk Map (`/risk-map`)**:
   - Leaflet + React Leaflet demonstration map centered on Mumbai municipal regions (Andheri, Bandra, Dadar, Colaba, Kurla, Chembur, etc.).
   - Color-coded pin markers (Red = High, Amber = Medium, Green = Low).
   - Popups showing pipeline specs and direct link to asset details.
   - Multi-parameter map filtering by Risk Level, Asset Age, Pipe Material, and Ward/Area.

8. **Official Engineering Reports (`/reports`)**:
   - Formal municipal report view with executive summary and high-risk listing.
   - One-click **Download CSV** containing all scored attributes.
   - One-click **Download Risk Report** text dossier.
   - One-click **Print Assessment Report** (`window.print()`).

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Charts**: Recharts
- **Icons**: Lucide React
- **Geospatial Maps**: Leaflet + React Leaflet
- **Data Parsing**: PapaParse

---

## 🚀 How to Run Locally

Navigate to the project directory:
```bash
cd "c:\Users\arpita adak\Documents\AI ML\pipeline-risk-system"
```

Install dependencies:
```bash
npm install
# or on Windows PowerShell:
npm.cmd install
```

Start the Vite development server:
```bash
npm run dev
# or on Windows PowerShell:
npm.cmd run dev
```

Open your browser at:
```
http://localhost:5173
```

---

## 📁 Project Structure

```
pipeline-risk-system/
├── public/
│   └── data/
│       └── ageing_pipeline_50_records.csv   # 50-record sample dataset
├── src/
│   ├── components/
│   │   ├── Header.jsx                       # Municipal Engineer header & alert bell
│   │   ├── Sidebar.jsx                      # Fixed / collapsible sidebar navigation
│   │   ├── StatCard.jsx                     # KPI metrics cards
│   │   ├── RiskBadge.jsx                    # HIGH/MEDIUM/LOW badges
│   │   ├── RiskScoreCircle.jsx              # Circular AI score visualization
│   │   ├── RiskMeter.jsx                    # Horizontal segmented risk gauge
│   │   ├── DataTable.jsx                    # Reusable sortable table with search
│   │   ├── ChartCard.jsx                    # Reusable Recharts card container
│   │   ├── RecommendationCard.jsx           # Prescriptive engineering action cards
│   │   └── WorkflowProgress.jsx             # 8-step academic demonstration stepper
│   ├── context/
│   │   └── PipelineContext.jsx              # Global pipeline state & authentication
│   ├── data/
│   │   └── samplePipelines.js               # Embedded benchmark pipeline dataset
│   ├── pages/
│   │   ├── Login.jsx                        # Screen 1: Portal Login
│   │   ├── Dashboard.jsx                    # Screen 2: Infrastructure Overview
│   │   ├── HistoricalDataUpload.jsx         # Screen 3: Data Upload & Validation
│   │   ├── AiRiskPrediction.jsx             # Screen 4: AI Risk Assessment Results
│   │   ├── PipelineRiskDetails.jsx          # Screen 5: Detailed Asset Diagnostic
│   │   ├── MaintenanceRecommendations.jsx   # Screen 6: Prioritized Work Orders
│   │   ├── RiskMap.jsx                      # Screen 7: Geospatial Risk Map
│   │   └── Reports.jsx                      # Screen 8: Printable Engineering Reports
│   ├── utils/
│   │   ├── riskEngine.js                    # Deterministic AI risk calculation engine
│   │   └── csvParser.js                     # PapaParse wrapper & dataset validator
│   ├── App.jsx                              # Router & layout setup
│   ├── index.css                            # Tailwind & Leaflet styles
│   └── main.jsx                             # React bootstrap entrypoint
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🤖 Future Real ML Backend Integration

The risk calculation engine in `src/utils/riskEngine.js` is built with a standard feature dictionary:
```js
{
  Age_Years,
  Condition_Score,
  Previous_Leaks,
  Repair_Count,
  Operating_Pressure_bar,
  Material,
  Soil_Type
}
```

To connect a real Python/FastAPI ML model (e.g. trained with Random Forest or XGBoost), replace the call in `runAiAssessment` with a standard `fetch` call:
```js
const response = await fetch('http://localhost:8000/api/predict-risk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pipelines: rawPipelines })
});
const scoredPipelines = await response.json();
```
