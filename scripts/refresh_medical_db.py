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
DEFAULT_ASSETS_DIR = ROOT / "data" / "vocabularies"
DEFAULT_ARTIFACT_DIR = ROOT / "build" / "medical-db"


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "MedCodeTranslator refresh bot"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def url_exists(url: str) -> bool:
    headers = {"User-Agent": "MedCodeTranslator refresh bot"}
    try:
        req = urllib.request.Request(url, method="HEAD", headers=headers)
        with urllib.request.urlopen(req, timeout=20) as response:
            return 200 <= getattr(response, "status", 200) < 400
    except Exception:
        try:
            req = urllib.request.Request(url, method="GET", headers={**headers, "Range": "bytes=0-0"})
            with urllib.request.urlopen(req, timeout=20) as response:
                return 200 <= getattr(response, "status", 200) < 400
        except Exception:
            return False


def cms_icd10_url(year: int) -> str:
    return f"https://www.cms.gov/files/zip/{year}-code-descriptions-tabular-order.zip"


def resolve_cms_icd10_url(year: int | None) -> str:
    if year is not None:
        return cms_icd10_url(year)
    now_year = dt.datetime.now(dt.timezone.utc).year
    for candidate in (now_year + 1, now_year, now_year - 1, now_year - 2):
        url = cms_icd10_url(candidate)
        if url_exists(url):
            return url
    return cms_icd10_url(now_year)


def cms_hcpcs_url(year: int) -> str:
    return f"https://www.cms.gov/files/zip/{year}-alpha-numeric-hcpcs-file.zip"


def resolve_cms_hcpcs_url(year: int | None) -> str:
    now_year = dt.datetime.now(dt.timezone.utc).year if year is None else year
    for candidate in (now_year + 1, now_year, now_year - 1, now_year - 2):
        url = cms_hcpcs_url(candidate)
        if url_exists(url):
            return url
    return cms_hcpcs_url(now_year)


def detect_csv_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;")
        return dialect.delimiter
    except csv.Error:
        return ","


def normalize_label(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def dedupe_padded_label(value: str) -> str:
    """Remove CMS tabular-order padding artifacts (duplicated short descriptions)."""
    raw = value.strip()
    if not raw:
        return raw

    # Fixed-width CMS files often repeat the label after 2+ spaces.
    padded_parts = [normalize_label(part) for part in re.split(r"\s{2,}", raw) if part.strip()]
    if len(padded_parts) >= 2 and padded_parts[0].lower() == padded_parts[-1].lower():
        return padded_parts[0]

    normalized = normalize_label(raw)
    words = normalized.split(" ")
    if len(words) >= 2 and len(words) % 2 == 0:
        mid = len(words) // 2
        first_half = " ".join(words[:mid])
        second_half = " ".join(words[mid:])
        if first_half.lower() == second_half.lower():
            return first_half
    return normalized


def normalize_icd10_name(value: str) -> str:
    return dedupe_padded_label(value)


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
    out: list[dict[str, str]] = []
    for entry in entries:
        code = normalize_label(entry.get("code", "")).upper()
        name = normalize_label(entry.get("name_en", ""))
        if not code or not name:
            continue
        normalized: dict[str, str] = {"code": code, "name_en": name}
        for key, value in entry.items():
            if key in ("code", "name_en"):
                continue
            if isinstance(value, str):
                clean = normalize_label(value)
                if clean:
                    normalized[key] = clean
        out.append(normalized)
    return sorted(out, key=lambda item: item["code"])


def merge_name_he(current: list[dict[str, str]], previous: list[dict[str, str]]) -> None:
    prev_map: dict[str, str] = {}
    for row in previous:
        code = normalize_label(row.get("code", "")).upper()
        name_he = row.get("name_he")
        if code and isinstance(name_he, str) and normalize_label(name_he):
            prev_map[code] = normalize_label(name_he)
    for row in current:
        if row.get("name_he"):
            continue
        code = row.get("code")
        if isinstance(code, str) and code in prev_map:
            row["name_he"] = prev_map[code]


def parse_icd10_codes_zip(raw: bytes) -> list[dict[str, str]]:
    """Parse ICD-10-CM codes from the CMS ZIP, preferring the tabular-order file
    to filter to valid-for-coding (VALID=1) codes only."""
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        txt_names = [n for n in zf.namelist() if n.lower().endswith(".txt")]
        # Prefer the tabular order file — it contains the VALID flag so we can
        # filter to only billable codes (VALID=1) and skip header/category codes.
        order_names = [n for n in txt_names if "order" in n.lower() and "icd10" in n.lower()]
        code_names = [n for n in txt_names if "code" in n.lower() and "icd10" in n.lower()]
        if order_names:
            target, use_order_format = order_names[0], True
        elif code_names:
            target, use_order_format = code_names[0], False
        else:
            target = txt_names[0] if txt_names else None
            use_order_format = False
        if target is None:
            raise ValueError("No ICD-10 TXT file found in CMS ZIP")
        text = zf.read(target).decode("utf-8-sig", errors="replace")

    entries: list[dict[str, str]] = []
    for line in text.splitlines():
        raw_line = line.rstrip("\n\r")
        if not raw_line.strip():
            continue
        if use_order_format:
            # CMS tabular-order fixed-width format (two layouts exist across years):
            #
            # Layout A — used in CMS releases up to ~2023:
            #   cols 0-4  : order number (5 chars)
            #   col  5    : space
            #   col  6    : valid-for-coding flag (0=header, 1=billable)
            #   col  7    : space
            #   cols 8-14 : ICD-10-CM code (7 chars, left-justified, space-padded)
            #   col  15   : space
            #   cols 16+  : short description
            #
            # Layout B — used in CMS 2024+ releases:
            #   cols 0-4  : order number (5 chars)
            #   col  5    : space
            #   cols 6-12 : ICD-10-CM code (7 chars, left-justified, space-padded)
            #   col  13   : space
            #   col  14   : valid-for-coding flag (0=header, 1=billable)
            #   col  15   : space
            #   cols 16+  : short description
            #
            # Auto-detect: if col 6 is an ASCII letter (A-Z), it is a code char → Layout B.
            if len(raw_line) < 17:
                continue
            if raw_line[6:7].isalpha():
                # Layout B (2024+ format)
                valid_flag = raw_line[14:15]
                if valid_flag != "1":
                    continue
                code_raw = raw_line[6:13].strip()
                desc = raw_line[16:].strip() if len(raw_line) > 16 else ""
            else:
                # Layout A (pre-2024 format)
                valid_flag = raw_line[6:7]
                if valid_flag != "1":
                    continue
                code_raw = raw_line[8:15].strip()
                desc = raw_line[16:].strip() if len(raw_line) > 16 else ""
        else:
            # Simplified format: CODE  DESCRIPTION (one code per line)
            stripped = raw_line.strip()
            match = re.match(r"^([A-TV-Z][0-9][0-9A-Z]{1,5})\s+(.+)$", stripped)
            if not match:
                continue
            code_raw, desc = match.groups()
        if not code_raw or not desc:
            continue
        code = code_raw[:3] + ("." + code_raw[3:] if len(code_raw) > 3 else "")
        entries.append({"code": code, "name_en": normalize_icd10_name(desc)})
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


def fetch_atc_chembl() -> list[dict[str, str]]:
    """Fetch ATC level-5 codes from the ChEMBL API (EBI, WHO ATC classification).
    Returns ~5,500 level-5 drug codes with WHO names.
    Falls back to an empty list on network error."""
    import time as _time
    entries: list[dict[str, str]] = []
    url: str | None = "https://www.ebi.ac.uk/chembl/api/data/atc_class?format=json&limit=1000&offset=0"
    while url:
        req = urllib.request.Request(url, headers={"User-Agent": "MedCodeTranslator refresh bot"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
        for item in data.get("atc", []):
            code = str(item.get("level5", "")).strip()
            name = str(item.get("who_name", "")).strip()
            if re.fullmatch(r"[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}", code) and name:
                entries.append({"code": code, "name_en": normalize_label(name)})
        nxt = data.get("page_meta", {}).get("next")
        url = ("https://www.ebi.ac.uk" + nxt) if nxt else None
        if url:
            _time.sleep(0.05)
    return unique_sorted(entries)


def parse_hcpcs_zip(raw: bytes) -> list[dict[str, str]]:
    """Parse HCPCS Level II alpha-numeric codes from the CMS annual ZIP.

    The CMS alpha-numeric HCPCS file is a fixed-width text file.  The HCPCS
    Level II code appears at the very start of each line (5 characters: one
    letter followed by four digits).  Descriptions follow after whitespace.
    All-digit codes that are not HCPCS Level II are skipped.
    """
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        # Look for the main text file; prefer files with "hcpcs" or "anweb" in the name.
        txt_names = [n for n in zf.namelist() if n.lower().endswith((".txt", ".csv"))]
        preferred = [
            n for n in txt_names
            if any(k in n.lower() for k in ("hcpcs", "anweb", "alpha"))
        ]
        target = preferred[0] if preferred else (txt_names[0] if txt_names else None)
        if target is None:
            raise ValueError("No HCPCS file found in CMS HCPCS ZIP")
        content = zf.read(target).decode("utf-8-sig", errors="replace")

    entries: list[dict[str, str]] = []
    seen: set[str] = set()
    # HCPCS Level II codes: one letter (A–V, excluding I/O) followed by 4 digits.
    hcpcs_re = re.compile(r"^([A-HJ-NP-V][0-9]{4})\s+(.+)$")
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        m = hcpcs_re.match(stripped)
        if not m:
            continue
        code = m.group(1)
        name = normalize_label(m.group(2))
        if code and name and code not in seen:
            seen.add(code)
            entries.append({"code": code, "name_en": name})
    return sorted(entries, key=lambda x: x["code"])


def parse_cvx_txt(raw: bytes) -> list[dict[str, str]]:
    """Parse CDC CVX (vaccine administered) codes.

    The CDC publishes cvx.txt as a pipe-delimited file with columns:
        Short Description | Full Vaccine Name | CVX Code | Notes |
        Vaccine Status | Last Updated | Internal Notes
    CVX codes are integers; we zero-pad them to three digits for consistent
    sorting and display (e.g. "8" → "008", matching HL7 value set conventions).
    Rows with statuses that indicate the code has never been in active clinical
    use ("Never Active", "Pending", "Non-US") are skipped.
    """
    text = raw.decode("utf-8-sig", errors="replace")
    entries: list[dict[str, str]] = []
    seen: set[str] = set()
    # CDC statuses: Active, Inactive, Never Active, Pending, Non-US.
    # Skip codes that have never entered or are not in U.S. clinical use.
    skip_statuses = {"never active", "pending", "non-us"}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parts = [p.strip() for p in stripped.split("|")]
        if len(parts) < 3:
            continue
        short_desc = normalize_label(parts[0])
        full_name = normalize_label(parts[1]) if len(parts) > 1 else ""
        code_raw = normalize_label(parts[2]) if len(parts) > 2 else ""
        status = normalize_label(parts[4]).lower() if len(parts) > 4 else ""
        # Skip header rows and non-numeric code fields
        if not re.match(r"^\d+$", code_raw):
            continue
        if status in skip_statuses:
            continue
        # Zero-pad CVX numeric codes to 3 digits for consistent sorting and display.
        code = code_raw.zfill(3)
        name = full_name or short_desc
        if code and name and code not in seen:
            seen.add(code)
            entries.append({"code": code, "name_en": name})
    return sorted(entries, key=lambda x: x["code"])


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


def build_sqlite(
    path: pathlib.Path,
    atc5: list[dict[str, str]],
    icd10: list[dict[str, str]],
    icd9: list[dict[str, str]],
    hcpcs: list[dict[str, str]],
    cvx: list[dict[str, str]],
    crosswalk: list[dict[str, str | bool]],
    metadata: dict,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    try:
        conn.executescript(
            """
            PRAGMA journal_mode=DELETE;
            CREATE TABLE atc5 (code TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_he TEXT);
            CREATE TABLE icd10 (code TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_he TEXT);
            CREATE TABLE icd9 (code TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_he TEXT);
            CREATE TABLE hcpcs (code TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_he TEXT);
            CREATE TABLE cvx (code TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_he TEXT);
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
        conn.executemany(
            "INSERT INTO atc5(code,name_en,name_he) VALUES(?,?,?)",
            [(x["code"], x["name_en"], x.get("name_he")) for x in atc5],
        )
        conn.executemany(
            "INSERT INTO icd10(code,name_en,name_he) VALUES(?,?,?)",
            [(x["code"], x["name_en"], x.get("name_he")) for x in icd10],
        )
        conn.executemany(
            "INSERT INTO icd9(code,name_en,name_he) VALUES(?,?,?)",
            [(x["code"], x["name_en"], x.get("name_he")) for x in icd9],
        )
        conn.executemany(
            "INSERT INTO hcpcs(code,name_en,name_he) VALUES(?,?,?)",
            [(x["code"], x["name_en"], x.get("name_he")) for x in hcpcs],
        )
        conn.executemany(
            "INSERT INTO cvx(code,name_en,name_he) VALUES(?,?,?)",
            [(x["code"], x["name_en"], x.get("name_he")) for x in cvx],
        )
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
    for dataset in ("atc5", "icd10", "icd9", "hcpcs", "cvx"):
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
        "--icd10-year",
        type=int,
        default=None,
        help="CMS ICD-10-CM release year (defaults to auto-detect latest available)",
    )
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
    hcpcs_prev = load_json(assets_dir / "hcpcs.json")
    cvx_prev = load_json(assets_dir / "cvx.json")

    fetched_meta: list[dict[str, str | int]] = []
    if args.validate_only:
        icd10 = unique_sorted(icd10_prev)
        icd9 = unique_sorted(icd9_prev)
        atc5 = unique_sorted(atc5_prev)
        hcpcs = unique_sorted(hcpcs_prev)
        cvx = unique_sorted(cvx_prev)
        crosswalk = []
        local_crosswalk_path = assets_dir / "icd9_to_icd10_gem.json"
        if local_crosswalk_path.exists():
            crosswalk = json.loads(local_crosswalk_path.read_text(encoding="utf-8"))
    else:
        hcpcs_url = resolve_cms_hcpcs_url(None)
        icd10_url = resolve_cms_icd10_url(args.icd10_year)
        sources = {
            "icd10": {
                "provider": "CMS",
                "url": icd10_url,
                "parser": parse_icd10_codes_zip,
                "dataset_version": f"icd10-{args.icd10_year or dt.datetime.now(dt.timezone.utc).year}",
                "source_revision": "CMS ICD-10-CM tabular order file (valid-for-coding codes only)",
            },
            "icd9": {
                "provider": "NBER",
                "url": "https://data.nber.org/data/icd9cm-2022.csv",
                "parser": parse_icd9_csv,
                "dataset_version": "icd9cm-2022",
                "source_revision": "NBER public CSV",
            },
            "atc5": {
                "provider": "ChEMBL/EBI",
                "url": "https://www.ebi.ac.uk/chembl/api/data/atc_class",
                "parser": None,  # uses fetch_atc_chembl() directly — no raw bytes needed
                "dataset_version": f"chembl-atc-{dt.datetime.now(dt.timezone.utc).year}",
                "source_revision": "ChEMBL ATC classification API (EBI, WHO ATC level 5)",
            },
            "hcpcs": {
                "provider": "CMS",
                "url": hcpcs_url,
                "parser": parse_hcpcs_zip,
                "dataset_version": f"hcpcs-{dt.datetime.now(dt.timezone.utc).year}",
                "source_revision": "CMS Alpha-Numeric HCPCS Level II annual file",
            },
            "cvx": {
                "provider": "CDC",
                "url": "https://www2.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt",
                "parser": parse_cvx_txt,
                "dataset_version": "cdc-cvx-current",
                "source_revision": "CDC CVX vaccine code list",
            },
            "crosswalk": {
                "provider": "CMS/NBER",
                "url": "https://data.nber.org/data/icd9cm-to-icd10cm.csv",
                "parser": parse_crosswalk_csv,
                "dataset_version": "icd9-to-icd10cm-gem",
                "source_revision": "CMS/NBER public CSV",
            },
        }

        refresh_timestamp = utc_now()
        parsed: dict[str, object] = {}
        for name, src in sources.items():
            if src.get("parser") is None:
                # Special case: dataset fetched via dedicated function (no raw bytes)
                if name == "atc5":
                    data = fetch_atc_chembl()
                    sha = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
                else:
                    raise ValueError(f"No parser or fetcher defined for dataset: {name}")
            else:
                raw = fetch_bytes(src["url"])
                sha = hashlib.sha256(raw).hexdigest()
                data = src["parser"](raw)
            parsed[name] = data
            fetched_meta.append(
                {
                    "dataset": name,
                    "provider": src["provider"],
                    "url": src["url"],
                    "dataset_version": src["dataset_version"],
                    "source_revision": src["source_revision"],
                    "last_updated_utc": refresh_timestamp,
                    "retrieved_at_utc": refresh_timestamp,
                    "sha256": sha,
                    "record_count": len(data),
                }
            )

        icd10 = parsed["icd10"]
        icd9 = parsed["icd9"]
        atc5 = parsed["atc5"]
        hcpcs = parsed["hcpcs"]
        cvx = parsed["cvx"]
        crosswalk = parsed["crosswalk"]

        merge_name_he(icd10, icd10_prev)
        merge_name_he(icd9, icd9_prev)
        merge_name_he(atc5, atc5_prev)
        merge_name_he(hcpcs, hcpcs_prev)
        merge_name_he(cvx, cvx_prev)

    metadata_path = assets_dir / "source-metadata.json"
    if args.validate_only:
        local_validation_timestamp = utc_now()
        metadata = (
            json.loads(metadata_path.read_text(encoding="utf-8"))
            if metadata_path.exists()
            else {
                "generated_at_utc": local_validation_timestamp,
                "imported_by": "local-validation",
                "sources": [
                    {
                        "dataset": "local-assets",
                        "provider": "local",
                        "url": "n/a",
                        "dataset_version": "local-assets",
                        "source_revision": "local-validation",
                        "last_updated_utc": local_validation_timestamp,
                        "retrieved_at_utc": local_validation_timestamp,
                        "record_count": 0,
                    }
                ],
            }
        )
    else:
        metadata = {
            "generated_at_utc": refresh_timestamp,
            "imported_by": "github-actions",
            "sources": fetched_meta,
        }

    validation_errors: list[str] = []
    validation_errors.extend(validate_dataset("ATC5", atc5, min_size=50))
    validation_errors.extend(validate_dataset("ICD10", icd10, min_size=50))
    validation_errors.extend(validate_dataset("ICD9", icd9, min_size=50))
    validation_errors.extend(validate_dataset("HCPCS", hcpcs, min_size=50))
    validation_errors.extend(validate_dataset("CVX", cvx, min_size=50))
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
        "hcpcs": diff_codes(hcpcs_prev, hcpcs),
        "cvx": diff_codes(cvx_prev, cvx),
    }

    artifact_dir.mkdir(parents=True, exist_ok=True)
    metadata_artifact_path = artifact_dir / "source-metadata.json"
    write_json(metadata_artifact_path, metadata)
    write_json(artifact_dir / "validation-errors.json", validation_errors)
    build_report(
        args.report_file,
        diffs,
        {
            "atc5": len(atc5), "icd10": len(icd10), "icd9": len(icd9),
            "hcpcs": len(hcpcs), "cvx": len(cvx),
        },
        metadata_artifact_path,
    )

    if validation_errors:
        print("Validation failed:")
        for err in validation_errors:
            print(f"- {err}")
        return 1

    if not args.validate_only:
        write_json(assets_dir / "icd10.json", icd10)
        write_json(assets_dir / "icd9.json", icd9)
        write_json(assets_dir / "atc5.json", atc5)
        write_json(assets_dir / "hcpcs.json", hcpcs)
        write_json(assets_dir / "cvx.json", cvx)
        write_json(assets_dir / "source-metadata.json", metadata)

    write_json(artifact_dir / "atc5.json", atc5)
    write_json(artifact_dir / "icd10.json", icd10)
    write_json(artifact_dir / "icd9.json", icd9)
    write_json(artifact_dir / "hcpcs.json", hcpcs)
    write_json(artifact_dir / "cvx.json", cvx)
    write_json(artifact_dir / "icd9_to_icd10_gem.json", crosswalk)

    build_sqlite(artifact_dir / "medical-codes.sqlite", atc5, icd10, icd9, hcpcs, cvx, crosswalk, metadata)

    print("Refresh and validation completed successfully.")
    print(f"ATC5={len(atc5)} ICD10={len(icd10)} ICD9={len(icd9)} HCPCS={len(hcpcs)} CVX={len(cvx)} CROSSWALK={len(crosswalk)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
