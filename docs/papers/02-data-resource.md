# A License-Aware, Multi-Standard Biomedical Terminology Corpus for Offline Mobile Retrieval: Resource Description and Curation Protocol

**Manuscript type:** Data Descriptor  
**Target journals:** *Scientific Data* (Nature Portfolio); *Database: The Journal of Biological Databases and Curation*; *GigaScience*  
**Draft version:** 1.0 (2026-07-06)  
**Authors:** [Author 1], [Author 2], …  
**Affiliations:** [Department, Institution, City, Country]  
**Corresponding author:** [email]

---

## Abstract

Open biomedical applications require terminologies that are **redistributable**, **versioned**, and **honest about coverage limits**. We present a curated corpus supporting twelve coding schemes used in diagnosis, laboratory reporting, procedures, supplies, and immunization documentation. The resource bundles 105,000+ terminology entries derived from U.S. government releases (ICD-10-CM, ICD-9-CM, HCPCS, CVX), WHO ATC hierarchy snapshots, and intentionally limited subsets of LOINC, ICD-11, and CPT-like procedures where full redistribution is license-restricted. Each dataset includes structured provenance metadata: authority, retrieval URL, license text, record count, coverage class (`full`, `partial`, `demo`), and UTC refresh timestamp. We describe automated weekly refresh for public sources, crosswalk validation for ICD-9→ICD-10 GEM mappings, Stage-A Hebrew label overlay for high-frequency ICD-10-CM codes, and quality gates blocking publication on validation failure. The corpus powers the MedCode Clinical open-source retrieval application and is reproducible via documented scripts. Restricted terminologies (SNOMED CT, official AMA CPT, full LOINC) are explicitly excluded pending license review. This descriptor enables researchers to cite immutable dataset snapshots and teaches license-first curation for mobile offline health informatics resources.

---

## Background & Summary

### Scientific need

Secondary use of electronic health data, informatics pedagogy, and low-resource clinical settings all benefit from portable terminology bundles. However, assembling multi-authority vocabularies is error-prone: licenses conflict, record counts drift, and demo subsets are easily mistaken for complete standards. Few published datasets document **operational refresh** together with **coverage transparency** for consumer-mobile redistribution.

### Resource overview

The MedCode Translator vocabulary corpus (`data/vocabularies/`) integrates:

| Dataset | Authority | Records | Coverage | Refresh mode |
|---------|-----------|---------|----------|--------------|
| ATC levels 1–5 | WHOCC / ChEMBL-derived | 14 – 5,579 | full | automated weekly |
| ICD-10-CM | CMS | 74,260 | full | automated weekly |
| ICD-9-CM | NBER/CMS | 14,567 | full | automated weekly |
| HCPCS Level II | CMS | 8,724 | full | automated weekly |
| CVX | CDC | 289 | full | automated weekly |
| LOINC common panel | Regenstrief (subset) | 600 | partial | scripted import |
| ICD-11 | WHO | 64 | demo | manual |
| CPT-like procedures | curated sample | 64 | demo | manual |
| ICD-9→ICD-10 GEM | CMS/NBER | 8,000+ pairs | full | automated weekly |

*Exact counts: see `source-metadata.json` at release tag.*

### Key design decisions

1. **No restricted content by default** — SNOMED CT, RxNorm full dumps, and official CPT are not bundled.
2. **Coverage labels** — UI and metadata distinguish `full` vs `partial` vs `demo`.
3. **Label preservation on refresh** — Hebrew overlays survive ICD-10-CM re-ingest via merge logic.
4. **Crosswalk integrity** — GEM pairs validated against parent code sets.

---

## Methods

### Acquisition workflow

**Figure 1** (planned): Data pipeline from upstream authorities to bundled JSON and SQLite artifacts.

```
Upstream (CMS, CDC, NBER, WHOCC)
        │
        ▼
scripts/refresh_medical_db.py
  · download · parse · validate · merge_name_he
        │
        ├── data/vocabularies/*.json  (app bundle)
        └── build/medical-db/*        (CI artifacts + reports)
```

**Automated refresh** (`.github/workflows/refresh-medical-db.yml`): scheduled weekly; opens PR with diff summary on success.

**Sentinel monitoring** (`upstream-sentinel.yml`): hashes upstream URLs; alerts maintainers on change.

### ICD-10-CM ingestion

CMS FY2026 tabular order ZIP parsed to `{ code, name_en }` entries. Label deduplication removes padded duplicate phrases in long descriptions. Optional `--icd10-year` targets specific fiscal releases.

### LOINC partial panel

`scripts/import_loinc_common_panel.py` ingests top-ranked observation codes from OHDSI-mirrored Regenstrief Top 2000+ US CSV (`loinc_top2000_common_us.csv`), default limit 600. Existing Hebrew labels preserved on re-import.

### Hebrew ICD-10 Stage A

Israeli Ministry of Health official Hebrew ICD-10-CM requires separate license review. Stage A supplies 80 curated category-level Hebrew strings (`icd10_hebrew_stage_a.csv`) propagated to all leaf codes sharing ICD prefix (~2,476 codes). Metadata flags `hebrew_labels_stage: A` and explicit non-MOH disclaimer.

### Crosswalk: ICD-9→ICD-10 GEM

General Equivalence Mappings stored with cardinality:

- `is_one_to_one`
- `is_one_to_many`
- `is_many_to_one`

Validator rejects orphan mappings where either code absent from vocabulary snapshot.

### Record schema

```json
{
  "code": "E11.9",
  "name_en": "Type 2 diabetes mellitus without complications",
  "name_he": "סוכרת סוג 2 ללא סיבוכים"
}
```

### Metadata schema (`source-metadata.json`)

Per-dataset fields: `provider`, `url`, `dataset_version`, `source_revision`, `last_updated_utc`, `record_count`, `license_text`, `attribution_text`, optional `coverage`, optional Hebrew overlay fields.

### Quality assurance gates

| Gate | Command / workflow | Failure action |
|------|-------------------|----------------|
| Structural validation | `npm run validate:data` | block merge |
| Crosswalk integrity | embedded in refresh script | log to `validation-errors.json` |
| Search regression | `npm run benchmark` | CI fail |
| PHI pattern scan | `phi-guard.yml` | block merge |

### Versioning and citation

Recommended citation tag: `dataset-YYYY.MM` on successful refresh merge (planned). `generated_at_utc` in metadata provides interim freshness indicator.

---

## Data Records

### Example records

**ICD-10-CM**

```json
{ "code": "I10", "name_en": "Essential (primary) hypertension", "name_he": "יתר לחץ דם (ראשוני)" }
```

**LOINC**

```json
{ "code": "2345-7", "name_en": "Glucose [Mass/volume] in Serum or Plasma", "name_he": "גלוקוז בדם" }
```

**GEM crosswalk**

```json
{
  "icd9_code": "250.00",
  "icd10_code": "E11.9",
  "cardinality": "one-to-one",
  "is_one_to_one": true,
  "is_one_to_many": false,
  "is_many_to_one": false
}
```

### File inventory

| Path | Description |
|------|-------------|
| `data/vocabularies/icd10.json` | Full ICD-10-CM snapshot |
| `data/vocabularies/loinc.json` | 600-code common panel |
| `data/vocabularies/icd9_to_icd10_gem.json` | Crosswalk |
| `data/vocabularies/source-metadata.json` | Provenance manifest |
| `data/aliases/common.json` | Abbreviation aliases for search |
| `data/benchmarks/*.json` | Evaluation query fixtures |

---

## Technical Validation

### Structural validation

Refresh script enforces minimum record thresholds (e.g., ICD-10-CM > 50,000 codes post-parse). Hierarchy validator checks ICD parent code roots where enabled.

### Crosswalk validation

All GEM `icd9_code` and `icd10_code` values must resolve in respective vocabularies. Cardinality flags must be internally consistent.

### Search-facing validation

Benchmark suite (74 queries) ensures corpus supports clinically representative retrieval tasks. Layered search P@1 ≥ 0.70 per scheme on 2026-07-06 run (see companion evaluation manuscript).

### Known limitations

- LOINC 600-code panel ≠ complete Regenstrief distribution.
- CPT demo ≠ AMA CPT; cannot support billing compliance claims.
- ICD-11 demo (64 codes) illustrative only.
- Hebrew labels curated, not authoritative government release.

---

## Usage Notes

### Intended uses

- Offline terminology reference in MedCode Clinical application
- Benchmark corpora for retrieval research
- Teaching data stewardship in biomedical informatics courses
- Seed corpus for institutional forks after independent license review

### Prohibited uses

- Representing demo/partial sets as complete licensed standards
- Clinical decision support without regulatory assessment
- Redistribution violating upstream license terms (especially LOINC, WHO, AMA)

### Reproduction steps

```bash
git clone https://github.com/nadavWeisler/MedCodeTranslator.git
cd MedCodeTranslator
npm ci
npm run refresh:data          # network required
npm run import:loinc
npm run import:icd10-he
npm run validate:data
npm run benchmark
```

---

## Code Availability

| Component | Location |
|-----------|----------|
| Refresh orchestrator | `scripts/refresh_medical_db.py` |
| Public fetch utilities | `scripts/fetch_public_vocabularies.py` |
| LOINC import | `scripts/import_loinc_common_panel.py` |
| Hebrew overlay | `scripts/import_icd10_hebrew_labels.py` |
| CI workflows | `.github/workflows/refresh-medical-db.yml` |

MIT license applies to code; data governed by upstream terms summarized in `DATA_SOURCES.md`.

---

## Data Availability

| Access | URL / identifier |
|--------|------------------|
| Git repository | https://github.com/nadavWeisler/MedCodeTranslator |
| Metadata manifest | `data/vocabularies/source-metadata.json` |
| Zenodo DOI | [TBD — assign on `dataset-2026.07` tag] |

---

## Author contributions

[TBD — CRediT: conceptualization, data curation, software, validation, writing]

## Competing interests

None declared.

## Ethics

Not applicable; no human subjects data.

---

## References

1. Regenstrief Institute. LOINC License and Terms of Use. 2024.  
2. Centers for Medicare & Medicaid Services. ICD-10-CM Files. 2025.  
3. World Health Organization. ICD-11 Reference Guide. 2024.  
4. American Medical Association. CPT Intellectual Property Policy. 2024.  
5. CDC National Center for Immunization and Respiratory Diseases. CVX Code Set. 2024.  
6. Choi S, et al. Data Descriptor guidelines. *Sci Data.* 2023.  
7. Wilkinson MD, et al. The FAIR Guiding Principles for scientific data management and stewardship. *Sci Data.* 2016;3:160018.  

---

## Figure legends

**Figure 1.** Vocabulary curation pipeline with validation gates.  
**Figure 2.** Coverage class distribution across twelve schemes (pie chart).  
**Table 1.** Full provenance matrix (dataset × authority × license × count).  
**Table 2.** Crosswalk cardinality summary statistics.  
