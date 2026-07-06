#!/usr/bin/env python3
"""Merge staged Hebrew ICD-10 labels into data/vocabularies/icd10.json.

Stage A uses curated high-frequency translations in
data/vocabularies/sources/icd10_hebrew_stage_a.csv. CSV codes may be
category prefixes (e.g. J45); the importer applies each label to every
bundled ICD-10-CM code that starts with that prefix.

Full authoritative Hebrew ICD-10-CM from the Israeli Ministry of Health
requires separate license review — see DATA_SOURCES.md.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = ROOT / "data" / "vocabularies" / "sources" / "icd10_hebrew_stage_a.csv"
ICD10_JSON = ROOT / "data" / "vocabularies" / "icd10.json"
METADATA_JSON = ROOT / "data" / "vocabularies" / "source-metadata.json"


def normalize_code(value: str) -> str:
    return value.strip().upper().replace(".", "")


def load_labels() -> list[tuple[str, str]]:
    labels: list[tuple[str, str]] = []
    with SOURCE_CSV.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            code = (row.get("code") or "").strip().upper()
            name_he = (row.get("name_he") or "").strip()
            if code and name_he:
                labels.append((code, name_he))
    labels.sort(key=lambda item: len(normalize_code(item[0])), reverse=True)
    return labels


def merge_labels(entries: list[dict], labels: list[tuple[str, str]]) -> tuple[int, set[str]]:
    updated = 0
    matched_prefixes: set[str] = set()
    for row in entries:
        code = str(row.get("code", "")).strip().upper()
        normalized = normalize_code(code)
        for prefix, name_he in labels:
            if not normalized.startswith(normalize_code(prefix)):
                continue
            if row.get("name_he") == name_he:
                matched_prefixes.add(prefix)
                break
            row["name_he"] = name_he
            updated += 1
            matched_prefixes.add(prefix)
            break
    return updated, matched_prefixes


def update_metadata(label_count: int, prefix_count: int) -> None:
    if not METADATA_JSON.exists():
        return
    metadata = json.loads(METADATA_JSON.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    metadata["generated_at_utc"] = now
    for source in metadata.get("sources", []):
        if source.get("dataset") != "icd10":
            continue
        source["hebrew_labels_stage"] = "A"
        source["hebrew_label_count"] = label_count
        source["hebrew_label_prefix_count"] = prefix_count
        source["hebrew_label_note"] = (
            "Stage A curated high-frequency Hebrew labels applied by ICD-10 prefix; "
            "not an official MOH distribution."
        )
    METADATA_JSON.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    labels = load_labels()
    entries = json.loads(ICD10_JSON.read_text(encoding="utf-8"))
    updated, matched_prefixes = merge_labels(entries, labels)
    missing = [prefix for prefix, _ in labels if prefix not in matched_prefixes]
    ICD10_JSON.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    update_metadata(updated, len(matched_prefixes))
    print(
        f"Merged {updated} Hebrew labels across {len(matched_prefixes)} prefixes "
        f"({len(missing)} CSV prefixes had no vocabulary match)."
    )


if __name__ == "__main__":
    main()
