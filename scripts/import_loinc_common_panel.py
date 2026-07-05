#!/usr/bin/env python3
"""Build data/vocabularies/loinc.json from the bundled Top 2000+ common panel CSV.

Source: OHDSI StudyProtocolSandbox mirror of Regenstrief LOINC Top 2000+ (SI units).
See data/vocabularies/sources/loinc_top2000_common_si.csv and DATA_SOURCES.md.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = ROOT / "data" / "vocabularies" / "sources" / "loinc_top2000_common_us.csv"
EXISTING_JSON = ROOT / "data" / "vocabularies" / "loinc.json"
OUTPUT_JSON = ROOT / "data" / "vocabularies" / "loinc.json"
METADATA_JSON = ROOT / "data" / "vocabularies" / "source-metadata.json"
DEFAULT_LIMIT = 600


def load_hebrew_labels() -> dict[str, str]:
    if not EXISTING_JSON.exists():
        return {}
    try:
        rows = json.loads(EXISTING_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    labels: dict[str, str] = {}
    for row in rows:
        code = str(row.get("code", "")).strip()
        name_he = row.get("name_he")
        if code and isinstance(name_he, str) and name_he.strip():
            labels[code] = name_he.strip()
    return labels


def import_panel(limit: int = DEFAULT_LIMIT) -> list[dict]:
    hebrew = load_hebrew_labels()
    rows: list[dict] = []
    seen: set[str] = set()

    with SOURCE_CSV.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for record in reader:
            code = (record.get("LOINC #") or "").strip()
            name_en = (record.get("Long Common Name") or "").strip()
            if not code or not name_en or code in seen:
                continue
            seen.add(code)
            rows.append(
                {
                    "code": code,
                    "name_en": name_en,
                    "name_he": hebrew.get(code),
                }
            )
            if len(rows) >= limit:
                break

    return rows


def update_source_metadata(record_count: int) -> None:
    metadata = json.loads(METADATA_JSON.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    for source in metadata.get("sources", []):
        if source.get("dataset") != "loinc":
            continue
        source["dataset_version"] = "LOINC Top 2000+ common panel (US)"
        source["source_revision"] = (
            "Regenstrief LOINC Top 2000+ via OHDSI StudyProtocolSandbox US CSV; "
            f"imported top {record_count} ranked observations"
        )
        source["record_count"] = record_count
        source["coverage"] = "partial"
        source["last_updated_utc"] = now
        source["retrieved_at_utc"] = now
        source["license_text"] = (
            "LOINC/Regenstrief license terms apply. "
            "Subset derived from the public Top 2000+ common lab observations list."
        )
        source["attribution_text"] = (
            "LOINC® (https://loinc.org) — Regenstrief Institute. "
            "Common panel subset per LOINC Top 2000+ US list."
        )
        break
    metadata["generated_at_utc"] = now
    METADATA_JSON.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not SOURCE_CSV.exists():
        raise FileNotFoundError(f"Missing source CSV: {SOURCE_CSV}")

    panel = import_panel()
    OUTPUT_JSON.write_text(json.dumps(panel, indent=2) + "\n", encoding="utf-8")
    update_source_metadata(len(panel))
    print(f"Wrote {len(panel)} LOINC entries to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
