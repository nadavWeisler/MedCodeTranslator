# Data Sources and Licensing Notes

_Last updated: 2026-05-12_

| Dataset | Source | URL | License / Terms | Attribution Requirements | Commercial Use Status | Redistribution |
|---|---|---|---|---|---|---|
| ATC5 | WHOCC | https://www.whocc.no/atc_ddd_index_and_guidelines/ | WHOCC terms for ATC/DDD material | Attribute WHOCC and preserve source context | Verify terms before commercial release | Do not redistribute beyond terms without review |
| ICD-10-CM | CMS | https://www.cms.gov/medicare/coding-billing/icd-10-codes | U.S. government/public CMS distribution | Cite CMS as source | Generally acceptable for commercial use; verify latest terms | Allowed per source terms |
| ICD-9-CM (historical) | NBER/CMS public files | https://data.nber.org/data/icd9cm-2022.csv | Public historical distribution (verify at refresh time) | Cite NBER/CMS source URLs | Usually acceptable with attribution | Allowed per source terms |
| ICD-11 (repo sample) | WHO | https://icd.who.int/ | Official WHO ICD-11 terms apply to full dataset | Attribute WHO | Full licensing review required for full production distribution | This repo currently stores a curated subset sample |
| LOINC (repo sample) | Regenstrief Institute | https://loinc.org/ | LOINC license/terms apply | Attribute LOINC/Regenstrief | Review/confirm latest terms before commercial deployment | This repo currently stores a curated subset sample |
| CPT-like procedures (repo sample) | Curated sample (not official AMA CPT distribution) | https://www.ama-assn.org/practice-management/cpt/cpt-overview-and-code-approval | Official CPT is proprietary and requires AMA licensing | Do not represent curated sample as official CPT | Official CPT requires license for production/commercial use | Do not redistribute official CPT without license |

## Update Frequency
- Automated refresh pipeline: weekly (`.github/workflows/refresh-medical-db.yml`) for ATC5/ICD10/ICD9 public sources.
- Curated sample datasets must be reviewed manually before release.

## Restricted / High-Risk Sources (Not Bundled)
- SNOMED CT (license-controlled by country/member terms)
- First Databank
- Multum
- Micromedex
- Insurer/internal hospital proprietary vocabularies

## Explicit Guardrails
- Do not scrape proprietary systems.
- Do not redistribute restricted terminology datasets.
- Do not bundle licensed datasets in public builds without explicit permission.
