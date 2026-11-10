import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  ArrowRight,
  RotateCcw,
  Upload,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import RiskBadge from '../components/RiskBadge';
import ProvenanceBadge from '../components/ProvenanceBadge';

// Helper to create custom color-coded map pin DivIcons
const createRiskIcon = (level, score) => {
  const isHigh = level === 'HIGH';
  const isMed = level === 'MEDIUM';

  const color = isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#10b981';

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 28px;
        height: 28px;
        background-color: ${color};
        opacity: ${isHigh ? '0.35' : '0.25'};
        border-radius: 50%;
        animation: ${isHigh ? 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'};
      "></div>
      <div style="
        width: 22px;
        height: 22px;
        background-color: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 10px;
        font-family: sans-serif;
      ">
        ${score}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-risk-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export default function RiskMap() {
  const { pipelines, stats, clearDataset } = usePipelines();
  const navigate = useNavigate();

  // Filters state
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterMaterial, setFilterMaterial] = useState('ALL');
  const [filterAge, setFilterAge] = useState('ALL'); // ALL, '>35', '20-35', '<20'
  const [filterArea, setFilterArea] = useState('ALL');
  const [filterProvenance, setFilterProvenance] = useState('ALL');

  // Extract distinct materials and areas
  const materials = useMemo(() => {
    return Array.from(new Set(pipelines.map((p) => p.Material))).filter(Boolean);
  }, [pipelines]);

  const areas = useMemo(() => {
    return Array.from(new Set(pipelines.map((p) => (p.Location || '').split(' ')[0]))).filter(Boolean);
  }, [pipelines]);

  // Filtered pipelines for map
  const filteredPipelines = useMemo(() => {
    return pipelines.filter((p) => {
      const level = p.Calculated_Risk_Level || p.Risk_Level || 'LOW';
      const age = Number(p.Age_Years) || 0;
      const prov = p.Provenance || (p.Is_Synthetic ? 'SYNTHETIC_DEMO' : 'ENGINEER_SUBMITTED');

      const matchesLevel = filterLevel === 'ALL' || level === filterLevel;
      const matchesMaterial = filterMaterial === 'ALL' || p.Material === filterMaterial;
      const matchesArea = filterArea === 'ALL' || (p.Location || '').toLowerCase().includes(filterArea.toLowerCase());
      const matchesProvenance = filterProvenance === 'ALL' || prov === filterProvenance;

      let matchesAge = true;
      if (filterAge === '>35') matchesAge = age > 35;
      else if (filterAge === '<20') matchesAge = age < 20;
      else if (filterAge === '20-35') matchesAge = age >= 20 && age <= 35;

      return matchesLevel && matchesMaterial && matchesArea && matchesAge && matchesProvenance;
    });
  }, [pipelines, filterLevel, filterMaterial, filterAge, filterArea, filterProvenance]);

  // Extract only pipelines from the uploaded dataset that have valid geographic coordinates
  const geoPipelines = useMemo(() => {
    return filteredPipelines.filter(
      (p) =>
        typeof p.Latitude === 'number' &&
        !isNaN(p.Latitude) &&
        typeof p.Longitude === 'number' &&
        !isNaN(p.Longitude) &&
        (p.Latitude !== 0 || p.Longitude !== 0)
    );
  }, [filteredPipelines]);

  const allUploadedHaveCoords = useMemo(() => {
    return pipelines.some(
      (p) =>
        typeof p.Latitude === 'number' &&
        !isNaN(p.Latitude) &&
        typeof p.Longitude === 'number' &&
        !isNaN(p.Longitude) &&
        (p.Latitude !== 0 || p.Longitude !== 0)
    );
  }, [pipelines]);

  // Reset filters
  const handleResetFilters = () => {
    setFilterLevel('ALL');
    setFilterMaterial('ALL');
    setFilterAge('ALL');
    setFilterArea('ALL');
    setFilterProvenance('ALL');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
      navigate('/dashboard');
    }
  };

  // If no dataset uploaded, display required empty state
  if (pipelines.length === 0) {
    return (
      <div className="space-y-4">
        <div className="pb-2 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pipeline Risk Map
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Geospatial visualization of water mains vulnerability across the municipal network
          </p>
        </div>

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Pipeline Assessment Data</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Upload a dataset to display assessed pipelines.
          </p>
          <button
            onClick={() => navigate('/pipeline-data')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate dynamic center from uploaded pipelines with coordinates
  const defaultCenter =
    geoPipelines.length > 0
      ? [geoPipelines[0].Latitude, geoPipelines[0].Longitude]
      : [19.0760, 72.8777];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pipeline Risk Map
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Geospatial visualization of water mains vulnerability from uploaded dataset
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg shadow-xs transition"
            title="Clear dataset and reset to empty state"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dataset</span>
          </button>
          <span className="bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">
            Showing {geoPipelines.length} of {pipelines.length} Assets
          </span>
        </div>
      </div>

      {/* Graceful notification if coordinates are not available */}
      {!allUploadedHaveCoords && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-950">Map coordinates are unavailable in the uploaded dataset.</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              The uploaded CSV does not contain valid <code>Latitude</code> and <code>Longitude</code> columns for geospatial plotting. All risk scores, statistics, recommendations, and reports remain fully functional. To view pipelines on the interactive map, include latitude and longitude columns in your dataset.
            </p>
            <button
              onClick={() => navigate('/pipeline-data')}
              className="mt-2.5 inline-flex items-center gap-1.5 font-bold text-amber-900 hover:text-amber-950 underline"
            >
              Upload a dataset with coordinates →
            </button>
          </div>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Risk Level Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Risk Level:</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Levels ({pipelines.length})</option>
                <option value="HIGH">High Risk ({stats.highRiskPipelines})</option>
                <option value="MEDIUM">Medium Risk ({stats.mediumRiskPipelines})</option>
                <option value="LOW">Low Risk ({stats.lowRiskPipelines})</option>
              </select>
            </div>

            {/* Pipeline Age Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Asset Age:</span>
              <select
                value={filterAge}
                onChange={(e) => setFilterAge(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Ages</option>
                <option value=">35">&gt; 35 Years (High Ageing)</option>
                <option value="20-35">20 – 35 Years (Mid-Life)</option>
                <option value="<20">&lt; 20 Years (Recent)</option>
              </select>
            </div>

            {/* Material Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Material:</span>
              <select
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Materials</option>
                {materials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Area Filter */}
            {areas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Area:</span>
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Locations</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Provenance Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Provenance:</span>
              <select
                value={filterProvenance}
                onChange={(e) => setFilterProvenance(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Provenance</option>
                <option value="OFFICIAL_SOURCE">Official GIS ({stats.officialPipelines || 0})</option>
                <option value="ENGINEER_SUBMITTED">Engineer ({stats.engineerPipelines || 0})</option>
                <option value="SYNTHETIC_DEMO">Demo ({stats.syntheticPipelines || 0})</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-md transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Map Container + Legend */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-[540px]">
        {geoPipelines.length > 0 ? (
          <MapContainer
            center={defaultCenter}
            zoom={11}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geoPipelines.map((pipeline) => {
              const score = pipeline.Calculated_Risk_Score ?? (pipeline.Risk_Level === 'HIGH' ? 88 : pipeline.Risk_Level === 'MEDIUM' ? 52 : 22);
              const level = pipeline.Calculated_Risk_Level || pipeline.Risk_Level || 'LOW';

              return (
                <Marker
                  key={pipeline.Pipeline_ID}
                  position={[pipeline.Latitude, pipeline.Longitude]}
                  icon={createRiskIcon(level, score)}
                >
                  <Popup>
                    <div className="p-1 min-w-[210px] space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">
                            {pipeline.Pipeline_ID}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {pipeline.Location}
                          </span>
                          <div className="mt-1">
                            <ProvenanceBadge
                              provenance={pipeline.Provenance}
                              sourceName={pipeline.Source_Name}
                              size="xs"
                            />
                          </div>
                        </div>
                        <RiskBadge level={level} size="sm" />
                      </div>

                      <div className="space-y-1 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pipeline Age:</span>
                          <span className="font-bold text-slate-800">{pipeline.Age_Years} yrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Material:</span>
                          <span className="font-semibold text-slate-800">{pipeline.Material}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Prev. Failures:</span>
                          <span className="font-semibold text-slate-800">{pipeline.Previous_Leaks} leaks</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Operating Press.:</span>
                          <span className="font-semibold text-slate-800">{pipeline.Operating_Pressure_bar} bar</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-bold">Risk Score:</span>
                          <span className="font-black text-slate-900">{score} / 100</span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/pipeline/${pipeline.Pipeline_ID}`)}
                        className="w-full mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                      >
                        <span>View Full Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50">
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3">
              <MapPin className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Geospatial Coordinates Unavailable</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              The uploaded dataset does not contain geographic coordinates for mapping. Upload a CSV with Latitude and Longitude columns to view assets on the interactive map.
            </p>
            <button
              onClick={() => navigate('/pipeline-data')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Upload Dataset with Coordinates
            </button>
          </div>
        )}

        {/* Floating Map Legend */}
        {geoPipelines.length > 0 && (
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-300 rounded-xl p-3 shadow-lg text-xs space-y-2 pointer-events-auto max-w-xs">
            <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>Risk Classification Legend</span>
              <span className="text-[10px] text-slate-500 font-normal">Score Pin</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-600 border border-white shadow-xs shrink-0 flex items-center justify-center text-[9px] text-white font-bold">
                  !
                </span>
                <span className="font-semibold text-slate-800">High Risk (70 – 100)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 border border-white shadow-xs shrink-0 flex items-center justify-center text-[9px] text-white font-bold">
                  •
                </span>
                <span className="font-semibold text-slate-800">Medium Risk (40 – 69)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 border border-white shadow-xs shrink-0 flex items-center justify-center text-[9px] text-white font-bold">
                  ✓
                </span>
                <span className="font-semibold text-slate-800">Low Risk (0 – 39)</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              Click any pin marker to inspect asset metadata
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
