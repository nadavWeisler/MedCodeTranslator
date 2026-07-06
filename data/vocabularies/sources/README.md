# Vocabulary source files

Bundled upstream extracts used by import scripts. These are not loaded by the app at runtime.

| File | Purpose | Upstream |
|------|---------|----------|
| `loinc_top2000_common_us.csv` | LOINC common-panel import (`scripts/import_loinc_common_panel.py`) | [OHDSI StudyProtocolSandbox](https://github.com/OHDSI/StudyProtocolSandbox/blob/master/themis/extras/LOINC_1.6_Top2000CommonLabResultsUS.csv) mirror of Regenstrief LOINC Top 2000+ (US units) |
| `icd10_hebrew_stage_a.csv` | Hebrew ICD-10 Stage-A labels (`scripts/import_icd10_hebrew_labels.py`) | Curated high-frequency translations; not an official Israeli MOH distribution |

LOINC® is copyright Regenstrief Institute. See [DATA_SOURCES.md](../../../DATA_SOURCES.md) and [https://loinc.org/license](https://loinc.org/license).

Hebrew ICD-10 labels are community-curated for search UX; full authoritative Hebrew ICD-10-CM requires separate license review.
