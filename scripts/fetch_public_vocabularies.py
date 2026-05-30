#!/usr/bin/env python3
from __future__ import annotations

import csv
import datetime as dt
import io
import json
import pathlib
import re
import subprocess
import urllib.error
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOCAB_DIR = ROOT / 'data' / 'vocabularies'
USER_AGENT = 'MedCodeTranslator public vocabulary refresh bot'
ATC_CHEMBL_URL = 'https://www.ebi.ac.uk/chembl/api/data/atc_class?format=json&limit=1000&offset=0'
ICD9_PRIMARY_URL = 'https://data.nber.org/data/icd9cm-2022.csv'
ICD9_FALLBACK_URL = 'https://www.cms.gov/medicare/coding/icd9providerdiagnosticcodes/downloads/icd-9-cm-v32-master-descriptions.zip'
CVX_URL = 'https://www2.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt'
HCPCS_CANDIDATES = [
    'https://www.cms.gov/files/zip/july-2026-alpha-numeric-hcpcs-file.zip',
    'https://www.cms.gov/files/zip/april-2026-alpha-numeric-hcpcs-file.zip',
    'https://www.cms.gov/files/zip/january-2026-alpha-numeric-hcpcs-file.zip',
    'https://www.cms.gov/files/zip/october-2025-alpha-numeric-hcpcs-file.zip',
    'https://www.cms.gov/files/zip/2025-alpha-numeric-hcpcs-file.zip',
    'https://www.cms.gov/files/zip/2024-alpha-numeric-hcpcs-file.zip',
]
ICD9_DIAGNOSIS_RE = re.compile(r'^\d{3,5}\.?\d*$')
HCPCS_LEVEL2_RE = re.compile(r'^[A-HJ-NP-V][0-9]{4}$')


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def fetch_bytes(url: str) -> bytes:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code < 500 or attempt == 2:
                raise
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt == 2:
                raise
    raise RuntimeError(f'Unable to fetch {url}: {last_error}')


def load_json(path: pathlib.Path):
    with path.open(encoding='utf-8') as handle:
        return json.load(handle)


def write_json(path: pathlib.Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def normalize_spaces(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def read_vocabulary_count(name: str) -> int:
    return len(load_json(VOCAB_DIR / f'{name}.json'))


def fetch_atc_levels() -> dict[str, list[dict[str, object]]]:
    levels: dict[int, dict[str, str]] = {1: {}, 2: {}, 3: {}, 4: {}}
    url: str | None = ATC_CHEMBL_URL
    while url:
        payload = json.loads(fetch_bytes(url))
        for item in payload.get('atc', []):
            for level in range(1, 5):
                code = normalize_spaces(str(item.get(f'level{level}', ''))).upper()
                description = normalize_spaces(str(item.get(f'level{level}_description', '')))
                if code and description:
                    levels[level][code] = description
        next_path = payload.get('page_meta', {}).get('next')
        url = f'https://www.ebi.ac.uk{next_path}' if next_path else None
    return {
        f'atc{level}': [
            {'code': code, 'name_en': levels[level][code], 'name_he': None}
            for code in sorted(levels[level])
        ]
        for level in range(1, 5)
    }


def parse_hcpcs_zip(raw: bytes) -> list[dict[str, object]]:
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        names = archive.namelist()
        candidates = [
            name for name in names
            if name.lower().endswith('.txt') and ('anweb' in name.lower() or 'hcpc' in name.lower())
        ]
        if not candidates:
            raise ValueError('No HCPCS TXT payload found in archive')
        text = archive.read(candidates[0]).decode('utf-8-sig', errors='replace')

    descriptions: dict[str, list[str]] = {}
    for line in text.splitlines():
        code = line[:5].strip().upper()
        if not HCPCS_LEVEL2_RE.fullmatch(code):
            continue
        record_type = line[10:11]
        chunk = normalize_spaces(line[11:91])
        if record_type == '3':
            descriptions[code] = [chunk] if chunk else []
        elif record_type == '4' and code in descriptions and chunk:
            descriptions[code].append(chunk)

    return [
        {
            'code': code,
            'name_en': normalize_spaces(' '.join(parts)),
            'name_he': None,
        }
        for code, parts in sorted(descriptions.items())
        if parts and normalize_spaces(' '.join(parts))
    ]


def fetch_hcpcs() -> tuple[list[dict[str, object]], str]:
    last_error: Exception | None = None
    best_rows: list[dict[str, object]] = []
    best_url = ''
    for url in HCPCS_CANDIDATES:
        try:
            raw = fetch_bytes(url)
            entries = parse_hcpcs_zip(raw)
            if len(entries) > len(best_rows):
                best_rows = entries
                best_url = url
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    if best_rows:
        return best_rows, best_url
    raise RuntimeError(f'Unable to fetch HCPCS from CMS candidates: {last_error}')


def parse_icd9_nber_csv(raw: bytes) -> list[dict[str, object]]:
    text = raw.decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(text))
    entries: list[dict[str, object]] = []
    for row in reader:
        normalized = {normalize_spaces(str(key)).lower(): normalize_spaces(str(value or '')) for key, value in row.items()}
        code = normalized.get('code', '')
        name = normalized.get('long_desc') or normalized.get('long_description') or normalized.get('description') or ''
        if ICD9_DIAGNOSIS_RE.fullmatch(code) and name:
            entries.append({'code': code, 'name_en': name, 'name_he': None})
    return entries


def parse_icd9_cms_zip(raw: bytes) -> list[dict[str, object]]:
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        target = next((name for name in archive.namelist() if name.upper().endswith('_LONG_DX.TXT')), None)
        if target is None:
            raise ValueError('No ICD-9 diagnosis TXT found in CMS archive')
        text = archive.read(target).decode('utf-8-sig', errors='replace')

    entries: list[dict[str, object]] = []
    for line in text.splitlines():
        raw_line = line.rstrip()
        if not raw_line:
            continue
        code_raw = raw_line[:5].strip()
        name = normalize_spaces(raw_line[5:])
        if not re.fullmatch(r'\d{3,5}', code_raw) or not name:
            continue
        decimalized = code_raw[:3] + (f'.{code_raw[3:]}' if len(code_raw) > 3 else '')
        entries.append({'code': decimalized, 'name_en': name, 'name_he': None})
    return entries


def load_best_git_snapshot(name: str) -> tuple[list[dict[str, object]], str] | None:
    branches = subprocess.check_output(['git', 'branch', '--format=%(refname:short)'], cwd=ROOT, text=True).splitlines()
    best_rows: list[dict[str, object]] = []
    best_ref = ''
    for ref in branches:
        ref = ref.strip()
        if not ref:
            continue
        try:
            blob = subprocess.check_output(
                ['git', 'show', f'{ref}:data/vocabularies/{name}.json'],
                cwd=ROOT,
                text=True,
                stderr=subprocess.DEVNULL,
            )
            rows = json.loads(blob)
        except Exception:
            continue
        if isinstance(rows, list) and len(rows) > len(best_rows):
            best_rows = rows
            best_ref = ref
    if not best_rows:
        return None
    normalized_rows = []
    for row in best_rows:
        code = normalize_spaces(str(row.get('code', ''))).lstrip('\ufeff')
        name = normalize_spaces(str(row.get('name_en', '')))
        if code and name:
            normalized_rows.append({'code': code, 'name_en': name, 'name_he': None})
    return normalized_rows, best_ref


def fetch_icd9(existing_count: int) -> tuple[list[dict[str, object]], str, str]:
    best_rows = load_json(VOCAB_DIR / 'icd9.json')
    best_url = ICD9_PRIMARY_URL
    best_revision = 'Existing repository ICD-9-CM snapshot'
    if len(best_rows) < existing_count:
        best_rows = []

    try:
        entries = parse_icd9_nber_csv(fetch_bytes(ICD9_PRIMARY_URL))
        if len(entries) > len(best_rows):
            best_rows = entries
            best_url = ICD9_PRIMARY_URL
            best_revision = 'NBER public ICD-9-CM CSV'
    except Exception:
        pass

    try:
        entries = parse_icd9_cms_zip(fetch_bytes(ICD9_FALLBACK_URL))
        if len(entries) > len(best_rows):
            best_rows = entries
            best_url = ICD9_FALLBACK_URL
            best_revision = 'CMS ICD-9-CM v32 master descriptions ZIP'
    except Exception:
        pass

    snapshot = load_best_git_snapshot('icd9')
    if snapshot and len(snapshot[0]) > len(best_rows):
        best_rows = snapshot[0]
        best_url = ICD9_PRIMARY_URL
        best_revision = f'Repository git snapshot from {snapshot[1]} (derived from public ICD-9-CM source)'

    return best_rows, best_url, best_revision


def fetch_cvx() -> list[dict[str, object]]:
    text = fetch_bytes(CVX_URL).decode('utf-8-sig', errors='replace')
    rows: list[dict[str, object]] = []
    for line in text.splitlines():
        parts = [segment.strip() for segment in line.split('|')]
        if len(parts) < 2:
            continue
        code = parts[0].lstrip('\ufeff')
        name = parts[1]
        if re.fullmatch(r'\d+', code) and name:
            rows.append({'code': code, 'name_en': name, 'name_he': None})
    return rows


def updated_entry(base: dict[str, object] | None, **updates: object) -> dict[str, object]:
    entry = dict(base or {})
    entry.update(updates)
    return entry


def main() -> int:
    now = utc_now()
    existing_metadata = load_json(VOCAB_DIR / 'source-metadata.json')
    existing_sources = {entry['dataset']: entry for entry in existing_metadata.get('sources', [])}

    atc_levels = fetch_atc_levels()
    for dataset, rows in atc_levels.items():
        write_json(VOCAB_DIR / f'{dataset}.json', rows)
    atc5_count = read_vocabulary_count('atc5')

    hcpcs_rows, hcpcs_url = fetch_hcpcs()
    write_json(VOCAB_DIR / 'hcpcs.json', hcpcs_rows)

    existing_icd9_count = read_vocabulary_count('icd9')
    icd9_rows, icd9_url, icd9_revision = fetch_icd9(existing_icd9_count)
    write_json(VOCAB_DIR / 'icd9.json', icd9_rows)

    cvx_rows = fetch_cvx()
    write_json(VOCAB_DIR / 'cvx.json', cvx_rows)
    cvx_count = len(cvx_rows)

    ordered_sources = [
        updated_entry(
            existing_sources.get('atc1'),
            dataset='atc1',
            provider='WHO Collaborating Centre for Drug Statistics Methodology (WHOCC)',
            url='https://www.whocc.no/atc_ddd_index_and_guidelines/',
            dataset_version='WHO ATC hierarchy level 1 snapshot',
            source_revision='Derived from ChEMBL ATC classification API level 1 data',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=len(atc_levels['atc1']),
            license_text='WHOCC public terms; verify latest redistribution/commercial terms.',
            attribution_text='ATC hierarchy source context: WHOCC; level names derived from ChEMBL ATC API.',
        ),
        updated_entry(
            existing_sources.get('atc2'),
            dataset='atc2',
            provider='WHO Collaborating Centre for Drug Statistics Methodology (WHOCC)',
            url='https://www.whocc.no/atc_ddd_index_and_guidelines/',
            dataset_version='WHO ATC hierarchy level 2 snapshot',
            source_revision='Derived from ChEMBL ATC classification API level 2 data',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=len(atc_levels['atc2']),
            license_text='WHOCC public terms; verify latest redistribution/commercial terms.',
            attribution_text='ATC hierarchy source context: WHOCC; level names derived from ChEMBL ATC API.',
        ),
        updated_entry(
            existing_sources.get('atc3'),
            dataset='atc3',
            provider='WHO Collaborating Centre for Drug Statistics Methodology (WHOCC)',
            url='https://www.whocc.no/atc_ddd_index_and_guidelines/',
            dataset_version='WHO ATC hierarchy level 3 snapshot',
            source_revision='Derived from ChEMBL ATC classification API level 3 data',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=len(atc_levels['atc3']),
            license_text='WHOCC public terms; verify latest redistribution/commercial terms.',
            attribution_text='ATC hierarchy source context: WHOCC; level names derived from ChEMBL ATC API.',
        ),
        updated_entry(
            existing_sources.get('atc4'),
            dataset='atc4',
            provider='WHO Collaborating Centre for Drug Statistics Methodology (WHOCC)',
            url='https://www.whocc.no/atc_ddd_index_and_guidelines/',
            dataset_version='WHO ATC hierarchy level 4 snapshot',
            source_revision='Derived from ChEMBL ATC classification API level 4 data',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=len(atc_levels['atc4']),
            license_text='WHOCC public terms; verify latest redistribution/commercial terms.',
            attribution_text='ATC hierarchy source context: WHOCC; level names derived from ChEMBL ATC API.',
        ),
        updated_entry(
            existing_sources.get('atc5'),
            dataset='atc5',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=atc5_count,
        ),
        updated_entry(
            existing_sources.get('icd10'),
            dataset='icd10',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=read_vocabulary_count('icd10'),
        ),
        updated_entry(
            existing_sources.get('icd9'),
            dataset='icd9',
            url=icd9_url,
            source_revision=icd9_revision,
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=len(icd9_rows),
        ),
        updated_entry(
            existing_sources.get('icd11'),
            dataset='icd11',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=read_vocabulary_count('icd11'),
        ),
        updated_entry(
            existing_sources.get('loinc'),
            dataset='loinc',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=read_vocabulary_count('loinc'),
        ),
        updated_entry(
            existing_sources.get('cpt'),
            dataset='cpt',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=read_vocabulary_count('cpt'),
        ),
        updated_entry(
            existing_sources.get('hcpcs'),
            dataset='hcpcs',
            url=hcpcs_url,
            dataset_version='Alpha-Numeric HCPCS Level II quarterly file',
            source_revision='CMS Alpha-Numeric HCPCS Level II quarterly ZIP',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=len(hcpcs_rows),
            source='CMS quarterly ZIP',
        ),
        updated_entry(
            existing_sources.get('cvx'),
            dataset='cvx',
            url=CVX_URL,
            source_revision='CDC IIS Standards CVX TXT',
            last_updated_utc=now,
            retrieved_at_utc=now,
            record_count=cvx_count,
            source='CDC IIS Standards TXT',
        ),
    ]

    metadata = {
        'generated_at_utc': now,
        'imported_by': 'scripts/fetch_public_vocabularies.py',
        'sources': ordered_sources,
    }
    write_json(VOCAB_DIR / 'source-metadata.json', metadata)

    print(f"ATC1={len(atc_levels['atc1'])} ATC2={len(atc_levels['atc2'])} ATC3={len(atc_levels['atc3'])} ATC4={len(atc_levels['atc4'])} ATC5={atc5_count}")
    print(f'ICD9={len(icd9_rows)} HCPCS={len(hcpcs_rows)} CVX={cvx_count}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
