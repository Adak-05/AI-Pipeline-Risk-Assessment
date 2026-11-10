"""
GIS Data Source Adapter Interface.

Probes official GIS endpoints and imports pipeline records where accessible.
Provides a clean adapter interface so alternative sources can be added easily.

Current supported adapters:
  - MIDCGISAdapter  (MIDC water infrastructure)
  - MCGMGISAdapter  (MCGM/BMC municipal water mains)
  - CSVImportAdapter (Manual CSV/Excel uploads)

IMPORTANT:
  - Never invent records. Only import what the GIS service actually returns.
  - Never silently overwrite engineer-verified records with source data.
  - Keep MIDC industrial records distinct from MCGM municipal records.
"""
import asyncio
import httpx
import re
from typing import Optional, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class GISSourceStatus:
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PARTIAL = "partial"
    UNKNOWN = "unknown"


class GISProbeResult:
    def __init__(self, source_name: str, endpoint: str):
        self.source_name = source_name
        self.endpoint = endpoint
        self.status = GISSourceStatus.UNKNOWN
        self.http_status: Optional[int] = None
        self.error: Optional[str] = None
        self.layer_count: int = 0
        self.geometry_type: Optional[str] = None
        self.field_count: int = 0
        self.available_fields: list[str] = []
        self.record_count_estimate: Optional[int] = None
        self.probed_at = datetime.now(timezone.utc)
        self.supports_query: bool = False
        self.geographic_coverage: Optional[str] = None


async def probe_gis_endpoint(
    source_name: str,
    endpoint: str,
    timeout: float = 12.0,
) -> GISProbeResult:
    """
    Probe a GIS REST endpoint for accessibility, metadata, and query capability.
    Returns a GISProbeResult describing what was found.
    Does NOT invent any data.
    """
    result = GISProbeResult(source_name=source_name, endpoint=endpoint)

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            # Try basic metadata fetch
            meta_url = f"{endpoint}?f=json"
            resp = await client.get(meta_url)
            result.http_status = resp.status_code

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    result.status = GISSourceStatus.AVAILABLE

                    # Extract layer metadata
                    fields = data.get("fields", [])
                    result.available_fields = [f.get("name", "") for f in fields]
                    result.field_count = len(fields)
                    result.geometry_type = data.get("geometryType")
                    result.layer_count = 1

                    # Check if it supports query operations
                    ops = data.get("capabilities", "")
                    if "Query" in ops or "query" in ops:
                        result.supports_query = True

                    # Try to get record count
                    if result.supports_query:
                        count_url = f"{endpoint}/query?where=1=1&returnCountOnly=true&f=json"
                        count_resp = await client.get(count_url)
                        if count_resp.status_code == 200:
                            count_data = count_resp.json()
                            result.record_count_estimate = count_data.get("count")

                except Exception as parse_err:
                    result.status = GISSourceStatus.PARTIAL
                    result.error = f"Response received but could not parse JSON: {parse_err}"
            else:
                result.status = GISSourceStatus.UNAVAILABLE
                result.error = f"HTTP {resp.status_code}: Service returned non-200 status"

    except httpx.TimeoutException:
        result.status = GISSourceStatus.UNAVAILABLE
        result.error = f"Connection timed out after {timeout}s — service may be offline or unreachable from this network"
    except httpx.ConnectError as ce:
        result.status = GISSourceStatus.UNAVAILABLE
        result.error = f"Connection refused or DNS failure: {ce}"
    except Exception as e:
        result.status = GISSourceStatus.UNAVAILABLE
        result.error = f"Unexpected error: {e}"

    return result


async def probe_all_sources() -> list[dict]:
    """
    Probe all configured GIS sources and return their status.
    """
    sources = [
        {
            "source_name": "MIDC Water Pipeline Layer",
            "endpoint": "https://gis.midcindia.org/server/rest/services/Application/Department_Main_Map_Service/MapServer/18",
            "infrastructure_type": "MIDC Industrial",
            "description": "MIDC industrial water supply pipeline network (Layer 18)",
        },
        {
            "source_name": "MCGM Water Distribution Network Layer 219",
            "endpoint": "https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers/MapServer/219",
            "infrastructure_type": "MCGM Municipal",
            "description": "BMC/MCGM municipal water distribution infrastructure (Layer 219)",
        },
    ]

    results = []
    probe_tasks = [
        probe_gis_endpoint(s["source_name"], s["endpoint"])
        for s in sources
    ]
    probe_results = await asyncio.gather(*probe_tasks, return_exceptions=True)

    for s, r in zip(sources, probe_results):
        if isinstance(r, Exception):
            result_dict = {
                "source_name": s["source_name"],
                "endpoint": s["endpoint"],
                "infrastructure_type": s["infrastructure_type"],
                "description": s["description"],
                "status": GISSourceStatus.UNAVAILABLE,
                "error": str(r),
                "http_status": None,
                "available_fields": [],
                "record_count_estimate": None,
                "supports_query": False,
                "probed_at": datetime.now(timezone.utc).isoformat(),
            }
        else:
            result_dict = {
                "source_name": r.source_name,
                "endpoint": r.endpoint,
                "infrastructure_type": s["infrastructure_type"],
                "description": s["description"],
                "status": r.status,
                "error": r.error,
                "http_status": r.http_status,
                "available_fields": r.available_fields,
                "field_count": r.field_count,
                "geometry_type": r.geometry_type,
                "record_count_estimate": r.record_count_estimate,
                "supports_query": r.supports_query,
                "probed_at": r.probed_at.isoformat(),
            }
        results.append(result_dict)

    return results


def _parse_year(val: Any) -> Optional[int]:
    """Extract 4-digit installation year from int epoch, float, or string."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        # Epoch timestamp in milliseconds (e.g. 1428624000000)
        if val > 10000000000:
            try:
                return datetime.fromtimestamp(val / 1000, tz=timezone.utc).year
            except Exception:
                return None
        # Epoch in seconds
        if val > 300000000:
            try:
                return datetime.fromtimestamp(val, tz=timezone.utc).year
            except Exception:
                return None
        # Raw year like 2015
        if 1850 <= val <= 2030:
            return int(val)
    if isinstance(val, str):
        val = val.strip()
        m = re.search(r"\b(19\d\d|20\d\d)\b", val)
        if m:
            return int(m.group(1))
        # Handle "Jul-15" month-year abbreviations
        m2 = re.search(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-/\s](\d{2})\b", val, re.IGNORECASE)
        if m2:
            yy = int(m2.group(1))
            return 2000 + yy if yy < 50 else 1900 + yy
    return None


def _clean_float(val: Any) -> Optional[float]:
    """Safely convert numeric string or number to float."""
    if val is None:
        return None
    try:
        f = float(val)
        return f if f == f else None  # avoid NaN
    except (ValueError, TypeError):
        return None


MATERIAL_NORMALIZATION = {
    "DI": "Ductile Iron",
    "MS": "Mild Steel",
    "CI": "Cast Iron",
    "HDPE": "HDPE",
    "GI": "Galvanized Iron",
    "PVC": "PVC",
    "RCC": "Reinforced Concrete",
    "PSC": "Prestressed Concrete",
    "MILD STEEL": "Mild Steel",
    "DUCTILE IRON": "Ductile Iron",
    "CAST IRON": "Cast Iron",
}


def _normalize_material(val: Any) -> Optional[str]:
    if not val:
        return None
    clean = str(val).strip()
    return MATERIAL_NORMALIZATION.get(clean.upper(), clean)


async def fetch_gis_records(
    endpoint: str,
    source_name: str,
    field_map: dict,
    max_records: int = 100,
    offset: int = 0,
) -> tuple[list[dict], Optional[str]]:
    """
    Fetch actual pipeline records from an official ArcGIS REST endpoint.
    Extracts real attributes and calculates coordinates from LineString or Point geometries.
    Never invents coordinates or attributes.
    """
    query_url = (
        f"{endpoint}/query"
        f"?where=1=1"
        f"&outFields=*"
        f"&resultOffset={offset}"
        f"&resultRecordCount={max_records}"
        f"&outSR=4326"
        f"&f=geojson"
    )

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(query_url)

            if resp.status_code != 200:
                return [], f"GIS query returned HTTP {resp.status_code}"

            data = resp.json()
            if "error" in data:
                err_detail = data["error"].get("message", "Unknown ArcGIS server error")
                return [], f"ArcGIS server error: {err_detail}"

            features = data.get("features", [])
            if not features:
                return [], None  # Empty but valid response

            records = []
            for feat in features:
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})

                record = {
                    "source_name": source_name,
                    "source_record_id": None,
                    "latitude": None,
                    "longitude": None,
                }

                # Find source record ID (e.g. OBJECTID)
                for id_field in ["OBJECTID", "FID", "ID", "objectid"]:
                    if id_field in props and props[id_field] is not None:
                        record["source_record_id"] = str(props[id_field])
                        break

                # Apply mapping
                for gis_field, internal_field in field_map.items():
                    if gis_field in props and props[gis_field] is not None:
                        record[internal_field] = props[gis_field]

                # Specific source adjustments
                if "MIDC" in source_name:
                    if "WPLINE_CODE" in props and props["WPLINE_CODE"]:
                        record["pipeline_id"] = str(props["WPLINE_CODE"]).strip()
                    elif not record.get("pipeline_id") and record["source_record_id"]:
                        record["pipeline_id"] = f"MIDC-{record['source_record_id']}"

                    if "IA_NAME" in props and props["IA_NAME"]:
                        record["location"] = str(props["IA_NAME"]).strip()

                    if "TYPE_OF_PIPE" in props and props["TYPE_OF_PIPE"]:
                        record["material"] = _normalize_material(props["TYPE_OF_PIPE"])

                    if "DIAMETER" in props:
                        record["diameter_mm"] = _clean_float(props["DIAMETER"])

                    if "LENGTH" in props:
                        l = _clean_float(props["LENGTH"])
                        record["length_m"] = round(l, 2) if l is not None else None

                    if "DATE_OF_INSTALLATION" in props:
                        record["installation_year"] = _parse_year(props["DATE_OF_INSTALLATION"])

                elif "MCGM" in source_name:
                    if "ID" in props and props["ID"]:
                        record["pipeline_id"] = str(props["ID"]).strip()
                    elif not record.get("pipeline_id") and record["source_record_id"]:
                        record["pipeline_id"] = f"MCGM-{record['source_record_id']}"

                    loc = str(props.get("LOCATION") or "").strip()
                    ward = str(props.get("WARD") or "").strip()
                    if ward and ward.upper() != "NA" and ward.upper() != "NONE":
                        record["location"] = f"{loc} (Ward {ward})" if loc else f"Ward {ward}"
                    else:
                        record["location"] = loc or "MCGM Municipal Area"

                    if "MATERIAL" in props and props["MATERIAL"]:
                        record["material"] = _normalize_material(props["MATERIAL"])

                    if "DIAMETER_MM" in props:
                        record["diameter_mm"] = _clean_float(props["DIAMETER_MM"])

                    if "MEASURED_LENGTH_MTR" in props:
                        l = _clean_float(props["MEASURED_LENGTH_MTR"])
                        record["length_m"] = round(l, 2) if l is not None else None

                    if "DATE_OF_LAYING" in props:
                        record["installation_year"] = _parse_year(props["DATE_OF_LAYING"])

                    if "WORKING_PRESSURE" in props:
                        record["operating_pressure_bar"] = _clean_float(props["WORKING_PRESSURE"])

                # Handle geometries: LineString, MultiLineString, and Point
                if geom and isinstance(geom, dict):
                    gtype = geom.get("type")
                    coords = geom.get("coordinates", [])
                    valid_pts = []

                    if gtype == "LineString" and isinstance(coords, list):
                        for pt in coords:
                            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                                lng, lat = pt[0], pt[1]
                                if isinstance(lng, (int, float)) and isinstance(lat, (int, float)):
                                    if -180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0:
                                        valid_pts.append((float(lng), float(lat)))

                    elif gtype == "MultiLineString" and isinstance(coords, list):
                        for line in coords:
                            if isinstance(line, list):
                                for pt in line:
                                    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                                        lng, lat = pt[0], pt[1]
                                        if isinstance(lng, (int, float)) and isinstance(lat, (int, float)):
                                            if -180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0:
                                                valid_pts.append((float(lng), float(lat)))

                    elif gtype == "Point" and isinstance(coords, list) and len(coords) >= 2:
                        lng, lat = coords[0], coords[1]
                        if isinstance(lng, (int, float)) and isinstance(lat, (int, float)):
                            if -180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0:
                                valid_pts.append((float(lng), float(lat)))

                    # Calculate centroid from actual pipeline geometry
                    if valid_pts:
                        record["longitude"] = round(sum(p[0] for p in valid_pts) / len(valid_pts), 6)
                        record["latitude"] = round(sum(p[1] for p in valid_pts) / len(valid_pts), 6)
                    # Note: If no valid points found, latitude and longitude remain None (no fabrication)

                records.append(record)

            return records, None

    except httpx.TimeoutException:
        return [], "GIS query timed out — service temporarily unavailable"
    except Exception as e:
        return [], f"GIS query error: {e}"


# Field mapping definitions for each source
MIDC_FIELD_MAP = {
    "WPLINE_CODE": "pipeline_id",
    "IA_NAME": "location",
    "TYPE_OF_PIPE": "material",
    "DIAMETER": "diameter_mm",
    "LENGTH": "length_m",
    "DATE_OF_INSTALLATION": "installation_year",
}

MCGM_FIELD_MAP = {
    "ID": "pipeline_id",
    "LOCATION": "location",
    "WARD": "ward",
    "MATERIAL": "material",
    "DIAMETER_MM": "diameter_mm",
    "MEASURED_LENGTH_MTR": "length_m",
    "DATE_OF_LAYING": "installation_year",
    "WORKING_PRESSURE": "operating_pressure_bar",
}
