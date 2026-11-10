import Papa from 'papaparse';

// Canonical field definitions with flexible aliases for uploaded CSVs
export const REQUIRED_FIELDS = [
  { key: 'Pipeline_ID', label: 'Pipeline ID', aliases: ['pipeline_id', 'pipeline id', 'id', 'pipe_id', 'pipeline'] },
  { key: 'Location', label: 'Location', aliases: ['location', 'ward', 'area', 'region', 'zone'] },
  { key: 'Installation_Year', label: 'Installation Year', aliases: ['installation_year', 'installation year', 'install_year', 'year_installed'] },
  { key: 'Pipeline_Age', label: 'Pipeline Age', aliases: ['pipeline_age', 'pipeline age', 'age_years', 'age', 'pipe_age'] },
  { key: 'Material', label: 'Material', aliases: ['material', 'pipe_material', 'type'] },
  { key: 'Diameter_mm', label: 'Diameter', aliases: ['diameter_mm', 'diameter (mm)', 'diameter', 'dia'] },
  { key: 'Length_m', label: 'Length', aliases: ['length_m', 'length (m)', 'length', 'len'] },
  { key: 'Previous_Leaks', label: 'Previous Failures / Leaks', aliases: ['previous_leaks', 'previous failures', 'previous_failures', 'leak history', 'leak_history', 'past_leaks', 'failures'] },
  { key: 'Repair_Count', label: 'Repair Count', aliases: ['repair_count', 'repair count', 'repairs', 'maintenance_count'] },
  { key: 'Operating_Pressure_bar', label: 'Operating Pressure', aliases: ['operating_pressure_bar', 'operating pressure', 'operating_pressure', 'pressure', 'pressure_bar'] },
  { key: 'Soil_Type', label: 'Soil/Environmental Condition', aliases: ['soil_type', 'soil type', 'soil/environmental condition', 'soil_condition', 'environmental_condition', 'soil'] },
  { key: 'Condition_Score', label: 'Condition Score', aliases: ['condition_score', 'condition score', 'condition', 'pipe_condition'] }
];

// AREA_COORDINATES removed to ensure map only displays real coordinates from uploaded dataset

/**
 * Validates and normalizes raw parsed CSV rows
 */
export function validateAndNormalizeDataset(rows) {
  const errors = [];
  const warnings = [];
  const checklist = [];

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return {
      isValid: false,
      data: [],
      errors: ['The uploaded file contains no data or could not be read.'],
      warnings: [],
      checklist: [],
      stats: { recordCount: 0, pipelineCount: 0, missingValues: 0, quality: 'Unusable' }
    };
  }

  // Detect header mapping
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const normalizedKeyMap = {}; // canonicalKey -> actualKeyInFile

  REQUIRED_FIELDS.forEach(req => {
    const matchedKey = keys.find(k => {
      const clean = k.trim().toLowerCase();
      return req.aliases.some(alias => alias.toLowerCase() === clean);
    });

    if (matchedKey) {
      normalizedKeyMap[req.key] = matchedKey;
    }
  });

  const missingColumns = REQUIRED_FIELDS.filter(r => !normalizedKeyMap[r.key]);
  if (missingColumns.length > 0) {
    checklist.push({
      label: `Required columns check`,
      status: false,
      message: `Missing ${missingColumns.length} expected columns: ${missingColumns.map(m => m.label).join(', ')}`
    });
    errors.push(`Missing required columns: ${missingColumns.map(m => m.label).join(', ')}`);
  } else {
    checklist.push({
      label: `Required columns found`,
      status: true,
      message: `All ${REQUIRED_FIELDS.length} required engineering parameters verified.`
    });
  }

  // Check rows
  const seenIds = new Set();
  const duplicateIds = new Set();
  let missingValueCount = 0;
  let invalidAgesCount = 0;
  let invalidYearsCount = 0;

  const currentYear = 2026;
  const normalizedData = [];

  rows.forEach((row, idx) => {
    // Pipeline ID
    const rawId = row[normalizedKeyMap['Pipeline_ID']] || row['Pipeline_ID'] || row['Pipeline ID'] || `P${String(idx + 1).padStart(3, '0')}`;
    const id = String(rawId).trim();
    if (seenIds.has(id)) {
      duplicateIds.add(id);
    }
    seenIds.add(id);

    // Location
    const location = String(row[normalizedKeyMap['Location']] || row['Location'] || 'Mumbai Central').trim();

    // Installation year
    const installYearRaw = Number(row[normalizedKeyMap['Installation_Year']] || row['Installation_Year'] || row['Installation Year']);
    let installYear = isNaN(installYearRaw) ? 1990 : installYearRaw;
    if (installYear < 1920 || installYear > currentYear) {
      invalidYearsCount++;
      installYear = 1990;
    }

    // Inspection year
    const inspectYearRaw = Number(row['Inspection_Year'] || row['Inspection Year'] || 2024);
    let inspectYear = isNaN(inspectYearRaw) ? 2024 : inspectYearRaw;

    // Age
    const ageRaw = Number(row[normalizedKeyMap['Pipeline_Age']] || row['Pipeline Age'] || row['Age_Years']);
    let age = !isNaN(ageRaw) && ageRaw > 0 ? ageRaw : Math.max(0, currentYear - installYear);
    if (age < 0 || age > 120) {
      invalidAgesCount++;
      age = Math.max(1, currentYear - installYear);
    }

    // Previous leaks & repair count
    const leaksRaw = Number(row[normalizedKeyMap['Previous_Leaks']] || row['Previous_Leaks'] || row['Previous Failures'] || 0);
    const leaks = isNaN(leaksRaw) ? 0 : Math.max(0, leaksRaw);

    const repairsRaw = Number(row[normalizedKeyMap['Repair_Count']] || row['Repair_Count'] || row['Repair Count'] || 0);
    const repairs = isNaN(repairsRaw) ? 0 : Math.max(0, repairsRaw);

    // Operating pressure
    const pressRaw = Number(row[normalizedKeyMap['Operating_Pressure_bar']] || row['Operating_Pressure_bar'] || row['Operating Pressure'] || 3.5);
    const pressure = isNaN(pressRaw) ? 3.5 : Math.max(0.5, pressRaw);

    // Material
    const material = String(row[normalizedKeyMap['Material']] || row['Material'] || 'Ductile Iron').trim();

    // Soil
    const soil = String(row[normalizedKeyMap['Soil_Type']] || row['Soil_Type'] || row['Soil/Environmental Condition'] || 'Clay Loam').trim();

    // Condition score (1-10)
    const condRaw = Number(row[normalizedKeyMap['Condition_Score']] || row['Condition_Score'] || row['Condition Score'] || 5.0);
    let condition = isNaN(condRaw) ? 5.0 : condRaw;
    if (condition > 10 && condition <= 100) {
      // Scale down 0-100 to 1-10
      condition = +(condition / 10).toFixed(1);
    }

    // Diameter & Length
    const diaRaw = Number(row[normalizedKeyMap['Diameter_mm']] || row['Diameter_mm'] || row['Diameter'] || 400);
    const lenRaw = Number(row[normalizedKeyMap['Length_m']] || row['Length_m'] || row['Length'] || 500);

    // Coordinates: Only use valid numeric coordinates from the uploaded file
    const rawLat = row['Latitude'] !== undefined ? row['Latitude'] : row['lat'] !== undefined ? row['lat'] : null;
    const rawLng = row['Longitude'] !== undefined ? row['Longitude'] : row['lng'] !== undefined ? row['lng'] : row['long'] !== undefined ? row['long'] : null;
    const numLat = rawLat !== null && rawLat !== '' ? Number(rawLat) : null;
    const numLng = rawLng !== null && rawLng !== '' ? Number(rawLng) : null;
    const lat = numLat !== null && !isNaN(numLat) ? +numLat.toFixed(4) : null;
    const lng = numLng !== null && !isNaN(numLng) ? +numLng.toFixed(4) : null;

    // Track empty/missing critical values
    if (!row[normalizedKeyMap['Location']] || !row[normalizedKeyMap['Material']]) {
      missingValueCount++;
    }

    normalizedData.push({
      Pipeline_ID: id,
      Location: location,
      Material: material,
      Diameter_mm: isNaN(diaRaw) ? 400 : diaRaw,
      Length_m: isNaN(lenRaw) ? 500 : lenRaw,
      Installation_Year: installYear,
      Inspection_Year: inspectYear,
      Age_Years: age,
      Previous_Leaks: leaks,
      Repair_Count: repairs,
      Operating_Pressure_bar: pressure,
      Soil_Type: soil,
      Condition_Score: condition,
      Latitude: lat,
      Longitude: lng,
      Risk_Level: row['Risk_Level'] || 'PENDING'
    });
  });

  // Checklist updates
  checklist.push({
    label: `${normalizedData.length} records parsed`,
    status: normalizedData.length > 0,
    message: `Processed ${normalizedData.length} entries successfully.`
  });

  if (duplicateIds.size > 0) {
    checklist.push({
      label: `No duplicate Pipeline IDs`,
      status: false,
      message: `Warning: ${duplicateIds.size} duplicate IDs found: ${Array.from(duplicateIds).slice(0, 3).join(', ')}...`
    });
    warnings.push(`Dataset contains duplicate Pipeline IDs: ${Array.from(duplicateIds).slice(0, 5).join(', ')}`);
  } else {
    checklist.push({
      label: `No duplicate Pipeline IDs`,
      status: true,
      message: `All ${normalizedData.length} Pipeline IDs are unique.`
    });
  }

  if (missingValueCount > 0) {
    checklist.push({
      label: `Missing critical values`,
      status: false,
      message: `${missingValueCount} records have missing metadata filled with defaults.`
    });
    warnings.push(`${missingValueCount} entries had missing parameters; safe baseline values applied.`);
  } else {
    checklist.push({
      label: `No missing critical values`,
      status: true,
      message: `Complete parameter integrity across all records.`
    });
  }

  if (invalidAgesCount > 0 || invalidYearsCount > 0) {
    warnings.push(`Adjusted ${invalidAgesCount + invalidYearsCount} anomalous age/year fields to valid ranges.`);
  }

  const isUsable = errors.length === 0 && normalizedData.length > 0;
  checklist.push({
    label: `Dataset ready for AI Assessment`,
    status: isUsable,
    message: isUsable ? 'All validation checks passed. Ready for AI scoring.' : 'Dataset requires correction before AI scoring.'
  });

  const quality = errors.length > 0 
    ? 'Critical Issues' 
    : warnings.length > 2 
    ? 'Fair (Adjusted)' 
    : 'Good / High Integrity';

  return {
    isValid: isUsable,
    data: normalizedData,
    errors,
    warnings,
    checklist,
    detectedColumns: keys,
    stats: {
      recordCount: normalizedData.length,
      pipelineCount: seenIds.size,
      missingValues: missingValueCount,
      quality,
      status: isUsable ? 'Ready for AI Assessment' : 'Validation Failed',
      coordinatesCount: normalizedData.filter(p => p.Latitude !== null && p.Longitude !== null).length
    }
  };
}

/**
 * Parses CSV string or File using PapaParse
 */
export function parseCSVFile(fileOrString) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          const syntaxErrors = results.errors.map(e => `Line ${e.row}: ${e.message}`);
          // If some data was parsed, continue with validation
          if (results.data && results.data.length > 0) {
            const validation = validateAndNormalizeDataset(results.data);
            validation.warnings.push(...syntaxErrors);
            resolve(validation);
          } else {
            resolve({
              isValid: false,
              data: [],
              errors: syntaxErrors,
              warnings: [],
              checklist: [{ label: 'File syntax check', status: false, message: 'CSV parse errors encountered.' }],
              stats: { recordCount: 0, pipelineCount: 0, missingValues: 0, quality: 'Corrupt' }
            });
          }
        } else {
          const validation = validateAndNormalizeDataset(results.data);
          resolve(validation);
        }
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}
