#!/usr/bin/env python3
"""Refresh medical code datasets from authoritative upstream sources."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import pathlib
import re
import sqlite3
import sys
import urllib.request
import zipfile
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_ASSETS_DIR = ROOT / "assets" / "data"
DEFAULT_ARTIFACT_DIR = ROOT / "build" / "medical-db"


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "MedCodeTranslator refresh bot"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def detect_csv_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;")
        return dialect.delimiter
    except csv.Error:
        return ","


def normalize_label(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def load_csv_records(raw: bytes) -> list[dict[str, str]]:
    text = raw.decode("utf-8-sig", errors="replace")
    sample = text[:4096]
    delimiter = detect_csv_delimiter(sample)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    records: list[dict[str, str]] = []
    for row in reader:
        clean = {str(k).strip(): normalize_label(v or "") for k, v in row.items() if k is not None}
        if any(clean.values()):
            records.append(clean)
    return records


def pick_key(row: dict[str, str], *candidates: str) -> str | None:
    lowered = {k.lower(): k for k in row.keys()}
    for cand in candidates:
        if cand.lower() in lowered:
            return lowered[cand.lower()]
    for key in row.keys():
        key_l = key.lower()
        if any(cand.lower() in key_l for cand in candidates):
            return key
    return None


def unique_sorted(entries: list[dict[str, str]]) -> list[dict[str, str]]:
    by_code: dict[str, dict[str, str]] = {}
    for entry in entries:
        code = normalize_label(entry.get("code", "")).upper()
        name = normalize_label(entry.get("name_en", ""))
        if not code or not name:
            continue
        by_code[code] = {"code": code, "name_en": name}
    return sorted(by_code.values(), key=lambda item: item["code"])


def parse_icd10_codes_zip(raw: bytes) -> list[dict[str, str]]:
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        txt_names = [n for n in zf.namelist() if n.lower().endswith(".txt")]
        preferred = [n for n in txt_names if "code" in n.lower() and "icd10" in n.lower()]
        target = preferred[0] if preferred else (txt_names[0] if txt_names else None)
        if target is None:
            raise ValueError("No ICD-10 TXT file found in CMS ZIP")
        text = zf.read(target).decode("utf-8-sig", errors="replace")

    entries: list[dict[str, str]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        match = re.match(r"^([A-TV-Z][0-9][0-9A-Z]{1,5})\s+(.+)$", stripped)
        if not match:
            continue
        code_raw, name = match.groups()
        code = code_raw[:3] + ("." + code_raw[3:] if len(code_raw) > 3 else "")
        entries.append({"code": code, "name_en": normalize_label(name)})
    return unique_sorted(entries)


def parse_icd9_csv(raw: bytes) -> list[dict[str, str]]:
    rows = load_csv_records(raw)
    entries: list[dict[str, str]] = []
    for row in rows:
        code_key = pick_key(row, "code", "icd9", "diagnosis")
        name_key = pick_key(row, "long_description", "long desc", "description", "name", "title")
        if code_key is None or name_key is None:
            continue
        code = normalize_label(row.get(code_key, ""))
        name = normalize_label(row.get(name_key, ""))
        if code and name:
            entries.append({"code": code, "name_en": name})
    return unique_sorted(entries)


def parse_atc_csv(raw: bytes) -> list[dict[str, str]]:
    rows = load_csv_records(raw)
    entries: list[dict[str, str]] = []
    for row in rows:
        code_key = pick_key(row, "atc code", "atc_code", "code")
        name_key = pick_key(row, "atc name", "name", "drug")
        if code_key is None or name_key is None:
            continue
        code = normalize_label(row.get(code_key, "")).upper()
        name = normalize_label(row.get(name_key, ""))
        if re.fullmatch(r"[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}", code) and name:
            entries.append({"code": code, "name_en": name})
    return unique_sorted(entries)


def parse_crosswalk_csv(raw: bytes) -> list[dict[str, str | bool]]:
    rows = load_csv_records(raw)
    parsed: list[dict[str, str | bool]] = []
    for row in rows:
        icd9_key = pick_key(row, "icd9", "source", "from", "old")
        icd10_key = pick_key(row, "icd10", "target", "to", "new")
        if icd9_key is None or icd10_key is None:
            vals = [normalize_label(v) for v in row.values() if normalize_label(v)]
            if len(vals) >= 2:
                icd9_code, icd10_code = vals[0], vals[1]
            else:
                continue
        else:
            icd9_code = normalize_label(row.get(icd9_key, ""))
            icd10_code = normalize_label(row.get(icd10_key, ""))
        if not icd9_code or not icd10_code:
            continue
        parsed.append({"icd9_code": icd9_code, "icd10_code": icd10_code})

    unique_pairs = sorted({(item["icd9_code"], item["icd10_code"]) for item in parsed})
    unique = [{"icd9_code": icd9_code, "icd10_code": icd10_code} for icd9_code, icd10_code in unique_pairs]

    from_counts = Counter(item["icd9_code"] for item in unique)
    to_counts = Counter(item["icd10_code"] for item in unique)

    out: list[dict[str, str | bool]] = []
    for item in unique:
        from_count = from_counts[item["icd9_code"]]
        to_count = to_counts[item["icd10_code"]]
        if from_count == 1 and to_count == 1:
            cardinality = "1:1"
        elif from_count > 1 and to_count == 1:
            cardinality = "many:1"
        elif from_count == 1 and to_count > 1:
            cardinality = "1:many"
        else:
            cardinality = "many:many"
        out.append(
            {
                **item,
                "cardinality": cardinality,
                "is_one_to_one": cardinality == "1:1",
                "is_one_to_many": cardinality == "1:many",
                "is_many_to_one": cardinality == "many:1",
            }
        )
    return out


def load_json(path: pathlib.Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def diff_codes(previous: list[dict[str, str]], current: list[dict[str, str]]) -> dict[str, int]:
    prev_map = {item.get("code"): item.get("name_en") for item in previous if item.get("code")}
    curr_map = {item.get("code"): item.get("name_en") for item in current if item.get("code")}
    added = set(curr_map) - set(prev_map)
    removed = set(prev_map) - set(curr_map)
    changed = {code for code in set(prev_map) & set(curr_map) if prev_map[code] != curr_map[code]}
    return {"added": len(added), "removed": len(removed), "changed": len(changed)}


def validate_dataset(name: str, entries: list[dict[str, str]], min_size: int) -> list[str]:
    errors: list[str] = []
    if len(entries) < min_size:
        errors.append(f"{name}: expected at least {min_size} records, got {len(entries)}")
    seen: set[str] = set()
    for item in entries:
        code = item.get("code")
        label = item.get("name_en")
        if not isinstance(code, str) or not isinstance(label, str) or not code or not label:
            errors.append(f"{name}: invalid schema row: {item}")
            continue
        if code in seen:
            errors.append(f"{name}: duplicate code {code}")
        seen.add(code)
    return errors


def validate_hierarchy(icd10: list[dict[str, str]], atc5: list[dict[str, str]], enforce_icd10_parents: bool = True) -> list[str]:
    errors: list[str] = []
    if enforce_icd10_parents:
        roots = {item["code"].replace(".", "") for item in icd10 if len(item["code"].replace(".", "")) == 3}
        for item in icd10:
            code_plain = item["code"].replace(".", "")
            if len(code_plain) > 3 and code_plain[:3] not in roots:
                errors.append(f"ICD-10 hierarchy missing parent for {item['code']}")
                break
    for item in atc5:
        if not re.fullmatch(r"[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}", item["code"]):
            errors.append(f"ATC5 invalid format: {item['code']}")
            break
    return errors


def validate_crosswalk(crosswalk: list[dict[str, str | bool]]) -> list[str]:
    errors: list[str] = []
    if not crosswalk:
        errors.append("Crosswalk is empty")
        return errors
    required = {"icd9_code", "icd10_code", "cardinality", "is_one_to_one", "is_one_to_many", "is_many_to_one"}
    for row in crosswalk:
        missing = required - set(row)
        if missing:
            errors.append(f"Crosswalk row missing fields: {sorted(missing)}")
            break
    return errors


def write_json(path: pathlib.Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def build_sqlite(path: pathlib.Path, atc5: list[dict[str, str]], icd10: list[dict[str, str]], icd9: list[dict[str, str]], crosswalk: list[dict[str, str | bool]], metadata: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    try:
        conn.executescript(
            """
            PRAGMA journal_mode=DELETE;
            CREATE TABLE atc5 (code TEXT PRIMARY KEY, name_en TEXT NOT NULL);
            CREATE TABLE icd10 (code TEXT PRIMARY KEY, name_en TEXT NOT NULL);
            CREATE TABLE icd9 (code TEXT PRIMARY KEY, name_en TEXT NOT NULL);
            CREATE TABLE icd9_to_icd10_gem (
              icd9_code TEXT NOT NULL,
              icd10_code TEXT NOT NULL,
              cardinality TEXT NOT NULL,
              is_one_to_one INTEGER NOT NULL,
              is_one_to_many INTEGER NOT NULL,
              is_many_to_one INTEGER NOT NULL,
              PRIMARY KEY (icd9_code, icd10_code)
            );
            CREATE TABLE source_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """
        )
        conn.executemany("INSERT INTO atc5(code,name_en) VALUES(?,?)", [(x["code"], x["name_en"]) for x in atc5])
        conn.executemany("INSERT INTO icd10(code,name_en) VALUES(?,?)", [(x["code"], x["name_en"]) for x in icd10])
        conn.executemany("INSERT INTO icd9(code,name_en) VALUES(?,?)", [(x["code"], x["name_en"]) for x in icd9])
        conn.executemany(
            "INSERT INTO icd9_to_icd10_gem(icd9_code,icd10_code,cardinality,is_one_to_one,is_one_to_many,is_many_to_one) VALUES(?,?,?,?,?,?)",
            [
                (
                    x["icd9_code"],
                    x["icd10_code"],
                    x["cardinality"],
                    int(bool(x["is_one_to_one"])),
                    int(bool(x["is_one_to_many"])),
                    int(bool(x["is_many_to_one"])),
                )
                for x in crosswalk
            ],
        )
        conn.execute("INSERT INTO source_metadata(key, value) VALUES(?, ?)", ("payload", json.dumps(metadata, sort_keys=True)))
        conn.commit()
    finally:
        conn.close()


def build_report(report_path: pathlib.Path, diffs: dict[str, dict[str, int]], sizes: dict[str, int], metadata_path: pathlib.Path) -> None:
    lines = [
        "# Medical code refresh report",
        "",
        f"Generated at: {utc_now()}",
        "",
        "| Dataset | Records | Added | Removed | Changed |",
        "|---|---:|---:|---:|---:|",
    ]
    for dataset in ("atc5", "icd10", "icd9"):
        d = diffs.get(dataset, {"added": 0, "removed": 0, "changed": 0})
        lines.append(f"| {dataset.upper()} | {sizes.get(dataset, 0)} | {d['added']} | {d['removed']} | {d['changed']} |")
    lines.append("")
    lines.append(f"Source metadata: `{metadata_path}`")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Refresh medical code assets from upstream sources")
    parser.add_argument("--assets-dir", type=pathlib.Path, default=DEFAULT_ASSETS_DIR)
    parser.add_argument("--artifact-dir", type=pathlib.Path, default=DEFAULT_ARTIFACT_DIR)
    parser.add_argument("--report-file", type=pathlib.Path, default=DEFAULT_ARTIFACT_DIR / "update-report.md")
    parser.add_argument("--validate-only", action="store_true", help="Skip network fetch and only validate/build from current assets")
    parser.add_argument(
        "--allow-missing-crosswalk",
        action="store_true",
        help="Allow validation to pass without crosswalk mappings (useful for local/offline checks)",
    )
    parser.add_argument(
        "--allow-missing-icd10-parents",
        action="store_true",
        help="Allow ICD-10 child codes without explicit 3-character parent rows (useful for partial/local datasets)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    assets_dir: pathlib.Path = args.assets_dir
    artifact_dir: pathlib.Path = args.artifact_dir

    icd10_prev = load_json(assets_dir / "icd10.json")
    icd9_prev = load_json(assets_dir / "icd9.json")
    atc5_prev = load_json(assets_dir / "atc5.json")

    if args.validate_only:
        icd10 = unique_sorted(icd10_prev)
        icd9 = unique_sorted(icd9_prev)
        atc5 = unique_sorted(atc5_prev)
        crosswalk = []
        local_crosswalk_path = assets_dir / "icd9_to_icd10_gem.json"
        if local_crosswalk_path.exists():
            crosswalk = json.loads(local_crosswalk_path.read_text(encoding="utf-8"))
    else:
        sources = {
            "icd10": {
                "provider": "CMS",
                "url": "https://www.cms.gov/files/zip/2026-code-descriptions-tabular-order.zip",
                "parser": parse_icd10_codes_zip,
            },
            "icd9": {
                "provider": "NBER",
                "url": "https://data.nber.org/data/icd9cm-2022.csv",
                "parser": parse_icd9_csv,
            },
            "atc5": {
                "provider": "WHOCC",
                "url": "https://www.whocc.no/atc_ddd_index_and_guidelines/atc_ddd_alterations__cumulative/atc_alterations__cumulative.csv",
                "parser": parse_atc_csv,
            },
            "crosswalk": {
                "provider": "CMS/NBER",
                "url": "https://data.nber.org/data/icd9cm-to-icd10cm.csv",
                "parser": parse_crosswalk_csv,
            },
        }

        fetched_meta: list[dict[str, str | int]] = []
        parsed: dict[str, object] = {}
        for name, src in sources.items():
            raw = fetch_bytes(src["url"])
            sha = hashlib.sha256(raw).hexdigest()
            data = src["parser"](raw)
            parsed[name] = data
            fetched_meta.append(
                {
                    "dataset": name,
                    "provider": src["provider"],
                    "url": src["url"],
                    "retrieved_at_utc": utc_now(),
                    "sha256": sha,
                    "record_count": len(data),
                }
            )

        icd10 = parsed["icd10"]
        icd9 = parsed["icd9"]
        atc5 = parsed["atc5"]
        crosswalk = parsed["crosswalk"]

        write_json(assets_dir / "icd10.json", icd10)
        write_json(assets_dir / "icd9.json", icd9)
        write_json(assets_dir / "atc5.json", atc5)

        metadata = {
            "generated_at_utc": utc_now(),
            "imported_by": "github-actions",
            "sources": fetched_meta,
        }
        write_json(assets_dir / "source-metadata.json", metadata)

    metadata_path = assets_dir / "source-metadata.json"
    metadata = (
        json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata_path.exists()
        else {
            "generated_at_utc": utc_now(),
            "imported_by": "local-validation",
            "sources": [{"dataset": "local-assets", "provider": "local", "url": "n/a", "retrieved_at_utc": utc_now(), "record_count": 0}],
        }
    )

    validation_errors: list[str] = []
    validation_errors.extend(validate_dataset("ATC5", atc5, min_size=50))
    validation_errors.extend(validate_dataset("ICD10", icd10, min_size=50))
    validation_errors.extend(validate_dataset("ICD9", icd9, min_size=50))
    validation_errors.extend(
        validate_hierarchy(icd10, atc5, enforce_icd10_parents=not args.allow_missing_icd10_parents)
    )
    if args.allow_missing_crosswalk and not crosswalk:
        pass
    else:
        validation_errors.extend(validate_crosswalk(crosswalk))

    if not metadata.get("sources"):
        validation_errors.append("Missing source metadata entries")

    diffs = {
        "atc5": diff_codes(atc5_prev, atc5),
        "icd10": diff_codes(icd10_prev, icd10),
        "icd9": diff_codes(icd9_prev, icd9),
    }

    artifact_dir.mkdir(parents=True, exist_ok=True)
    write_json(artifact_dir / "atc5.json", atc5)
    write_json(artifact_dir / "icd10.json", icd10)
    write_json(artifact_dir / "icd9.json", icd9)
    write_json(artifact_dir / "icd9_to_icd10_gem.json", crosswalk)
    metadata_artifact_path = artifact_dir / "source-metadata.json"
    write_json(metadata_artifact_path, metadata)
    write_json(artifact_dir / "validation-errors.json", validation_errors)

    build_sqlite(artifact_dir / "medical-codes.sqlite", atc5, icd10, icd9, crosswalk, metadata)
    build_report(args.report_file, diffs, {"atc5": len(atc5), "icd10": len(icd10), "icd9": len(icd9)}, metadata_artifact_path)

    if validation_errors:
        print("Validation failed:")
        for err in validation_errors:
            print(f"- {err}")
        return 1

    print("Refresh and validation completed successfully.")
    print(f"ATC5={len(atc5)} ICD10={len(icd10)} ICD9={len(icd9)} CROSSWALK={len(crosswalk)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
