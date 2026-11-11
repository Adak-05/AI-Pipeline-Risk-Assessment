import { supabase } from '../lib/supabase';

/**
 * Data Access Layer for Pipeline infrastructure records and assessments.
 * Interacts with Supabase PostgreSQL database while handling network errors gracefully.
 */

/**
 * Transform DB row (snake_case) to UI domain model (PascalCase / formatted)
 */
export function formatPipelineFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    Pipeline_ID: row.pipeline_id,
    Location: row.location || '—',
    Material: row.material || 'Ductile Iron',
    Diameter_mm: Number(row.diameter_mm) || 400,
    Length_m: Number(row.length_m) || 500,
    Installation_Year: row.installation_year || 1990,
    Inspection_Year: row.inspection_year || 2024,
    Age_Years: Number(row.age_years) || (2026 - (row.installation_year || 1990)),
    Previous_Leaks: Number(row.previous_leaks) || 0,
    Repair_Count: Number(row.repair_count) || 0,
    Operating_Pressure_bar: Number(row.operating_pressure_bar) || 3.5,
    Soil_Type: row.soil_type || 'Sandy Loam',
    Condition_Score: Number(row.condition_score) || 5.0,
    Latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    Longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    Calculated_Risk_Score: row.risk_score !== null && row.risk_score !== undefined ? Number(row.risk_score) : null,
    Calculated_Risk_Level: row.risk_level || 'PENDING',
    Risk_Level: row.risk_level || 'PENDING',
    Source_Name: row.source_name || 'Manual Upload',
    // Phase 3 Provenance & Freshness fields
    Provenance: row.provenance || (row.is_synthetic ? 'SYNTHETIC_DEMO' : 'ENGINEER_SUBMITTED'),
    Source_Type: row.source_type || 'manual_entry',
    Source_Record_ID: row.source_record_id || null,
    Is_Synthetic: Boolean(row.is_synthetic),
    Data_Freshness_Label: row.data_freshness_label || 'Current',
    Retrieved_At: row.retrieved_at || null,
    Last_Sync_At: row.last_sync_at || null
  };
}

/**
 * Transform UI domain model (PascalCase) to DB insert payload (snake_case)
 */
export function formatPipelineForDb(pipeline, userId = null) {
  const payload = {
    pipeline_id: String(pipeline.Pipeline_ID || '').trim(),
    location: String(pipeline.Location || '').trim(),
    material: String(pipeline.Material || '').trim() || 'Ductile Iron',
    diameter_mm: Number(pipeline.Diameter_mm) || 400,
    length_m: Number(pipeline.Length_m) || 500,
    installation_year: Number(pipeline.Installation_Year) || 1990,
    inspection_year: Number(pipeline.Inspection_Year) || 2024,
    age_years: Number(pipeline.Age_Years) || 0,
    previous_leaks: Number(pipeline.Previous_Leaks) || 0,
    repair_count: Number(pipeline.Repair_Count) || 0,
    operating_pressure_bar: Number(pipeline.Operating_Pressure_bar) || 3.5,
    soil_type: String(pipeline.Soil_Type || '').trim() || 'Sandy Loam',
    condition_score: Number(pipeline.Condition_Score) || 5.0,
    risk_score: pipeline.Calculated_Risk_Score !== undefined ? pipeline.Calculated_Risk_Score : null,
    risk_level: pipeline.Calculated_Risk_Level || pipeline.Risk_Level || 'PENDING'
  };

  // Only include optional columns if they exist / have values
  if (pipeline.Latitude !== null && pipeline.Latitude !== undefined && !isNaN(pipeline.Latitude)) {
    payload.latitude = Number(pipeline.Latitude);
  }
  if (pipeline.Longitude !== null && pipeline.Longitude !== undefined && !isNaN(pipeline.Longitude)) {
    payload.longitude = Number(pipeline.Longitude);
  }
  if (pipeline.Source_Name) {
    payload.source_name = pipeline.Source_Name;
  }
  if (pipeline.Provenance) {
    payload.provenance = pipeline.Provenance;
  }
  if (pipeline.Source_Type) {
    payload.source_type = pipeline.Source_Type;
  }
  if (pipeline.Source_Record_ID) {
    payload.source_record_id = pipeline.Source_Record_ID;
  }
  if (pipeline.Is_Synthetic !== undefined) {
    payload.is_synthetic = Boolean(pipeline.Is_Synthetic);
  }
  if (pipeline.Data_Freshness_Label) {
    payload.data_freshness_label = pipeline.Data_Freshness_Label;
  }
  if (pipeline.Retrieved_At) {
    payload.retrieved_at = pipeline.Retrieved_At;
  }
  if (pipeline.Last_Sync_At) {
    payload.last_sync_at = pipeline.Last_Sync_At;
  }
  // created_by must be a UUID (auth.users.id), not a name string.
  // Only include if userId is a valid non-empty UUID string.
  if (userId && typeof userId === 'string' && userId.length > 10) {
    payload.created_by = userId;
  }

  return payload;
}

/**
 * Fetch all registered pipelines from Supabase.
 * Returns { data: Pipeline[], error: string | null }
 */
export async function fetchPipelinesFromDb() {
  try {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const formatted = (data || []).map(formatPipelineFromDb);
    return { data: formatted, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

/**
 * Persist an array of pipeline records into Supabase.
 * Deduplicates by pipeline_id to avoid unique constraint violations.
 * Handles row-level errors and reports status accurately.
 */
export async function persistPipelinesToDb(pipelines, userId = null) {
  if (!pipelines || pipelines.length === 0) {
    return { success: true, count: 0, error: null };
  }

  try {
    // 1. Fetch existing pipeline IDs from DB to prevent collisions
    const { data: existingRows, error: fetchErr } = await supabase
      .from('pipelines')
      .select('pipeline_id');

    if (fetchErr) {
      return { success: false, count: 0, error: fetchErr.message };
    }

    const existingIdSet = new Set((existingRows || []).map(r => String(r.pipeline_id).toLowerCase()));

    // 2. Filter out records that already exist in DB
    const newRecords = [];
    const skippedIds = [];

    for (const p of pipelines) {
      const pid = String(p.Pipeline_ID || '').trim().toLowerCase();
      if (!pid) continue;
      if (existingIdSet.has(pid)) {
        skippedIds.push(p.Pipeline_ID);
      } else {
        newRecords.push(formatPipelineForDb(p, userId));
        existingIdSet.add(pid); // prevent in-batch duplicates
      }
    }

    if (newRecords.length === 0) {
      return {
        success: true,
        count: 0,
        skipped: skippedIds.length,
        error: null,
        message: `All ${pipelines.length} records already exist in the database.`
      };
    }

    // 3. Batch insert new records
    const { data: inserted, error: insertErr } = await supabase
      .from('pipelines')
      .insert(newRecords)
      .select();

    if (insertErr) {
      // If the error is about the created_by column not existing (pre-migration),
      // retry the insert without the created_by field so uploads still work.
      if (
        insertErr.message &&
        (insertErr.message.includes('created_by') || insertErr.message.includes('schema cache'))
      ) {
        const recordsWithoutCreatedBy = newRecords.map(r => {
          const copy = { ...r };
          delete copy.created_by;
          return copy;
        });
        const { data: inserted2, error: insertErr2 } = await supabase
          .from('pipelines')
          .insert(recordsWithoutCreatedBy)
          .select();

        if (insertErr2) {
          return { success: false, count: 0, error: insertErr2.message };
        }
        return {
          success: true,
          count: inserted2 ? inserted2.length : recordsWithoutCreatedBy.length,
          skipped: skippedIds.length,
          error: null,
          notice: 'Records saved. Run the database migration to enable full ownership tracking.'
        };
      }
      return { success: false, count: 0, error: insertErr.message };
    }

    return {
      success: true,
      count: inserted ? inserted.length : newRecords.length,
      skipped: skippedIds.length,
      error: null
    };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Update risk score and risk level for a pipeline in Supabase.
 */
export async function updatePipelineRiskInDb(pipelineId, score, level) {
  try {
    const { data, error } = await supabase
      .from('pipelines')
      .update({
        risk_score: score,
        risk_level: level
      })
      .eq('pipeline_id', pipelineId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete ONLY synthetic demonstration records.
 * Strictly guarantees that official and engineer-submitted pipelines are NEVER deleted.
 */
export async function clearSyntheticDemoData() {
  try {
    const { data, error } = await supabase
      .from('pipelines')
      .delete()
      .eq('is_synthetic', true)
      .eq('provenance', 'SYNTHETIC_DEMO')
      .select('id, pipeline_id');

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: data ? data.length : 0, error: null };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Fetch immutable sync logs from Supabase audit table.
 */
export async function fetchSyncLogsFromDb(limit = 25) {
  try {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

/**
 * Query backend for live GIS source accessibility and probe results.
 */
export async function fetchGisSourcesApi(backendUrl = 'http://localhost:8000') {
  try {
    const response = await fetch(`${backendUrl}/api/sync/sources`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Probe check failed: HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    return {
      sources: [
        {
          source_name: 'MIDC Water Pipeline Layer',
          endpoint: 'https://gis.midcindia.org/server/rest/services/Application/Department_Main_Map_Service/MapServer/18',
          infrastructure_type: 'MIDC Industrial',
          status: 'unavailable',
          error: `Backend unreachable: ${err.message}`
        },
        {
          source_name: 'MCGM Water Distribution Network Layer 219',
          endpoint: 'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers/MapServer/219',
          infrastructure_type: 'MCGM Municipal',
          status: 'unavailable',
          error: `Backend unreachable: ${err.message}`
        }
      ],
      error: err.message
    };
  }
}

/**
 * Trigger official GIS synchronization via FastAPI backend with bearer token.
 */
export async function triggerGisSyncApi(_sourceKey, _token, _maxRecords = 50, _backendUrl = 'http://localhost:8000') {
  throw new Error(
    "Direct automated GIS synchronization is disabled by policy. " +
    "Official ArcGIS layers lack essential risk parameters (condition scores, historical leaks, pipe age). " +
    "Please upload verified field survey data through the Pipeline Data Upload module."
  );
}
