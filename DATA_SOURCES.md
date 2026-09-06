# Data Sources and Licensing Notes

_Last updated: 2026-09-06_

| Dataset | Source | URL | License / Terms | Attribution Requirements | Commercial Use Status | Redistribution |
|---|---|---|---|---|---|---|
| ATC5 | WHOCC | https://www.whocc.no/atc_ddd_index_and_guidelines/ | WHOCC terms for ATC/DDD material | Attribute WHOCC and preserve source context | Verify terms before commercial release | Do not redistribute beyond terms without review |
| ICD-10-CM | CMS | https://www.cms.gov/medicare/coding-billing/icd-10-codes | U.S. government/public CMS distribution | Cite CMS as source | Generally acceptable for commercial use; verify latest terms | Allowed per source terms; optional Stage-A Hebrew labels (`npm run import:icd10-he`) are curated, not MOH-official |
| ICD-9-CM (historical) | NBER/CMS public files | https://data.nber.org/data/icd9cm-2022.csv | Public historical distribution (verify at refresh time) | Cite NBER/CMS source URLs | Usually acceptable with attribution | Allowed per source terms |
| ICD-11 (64-code subset) | WHO | https://icd.who.int/ | Official WHO ICD-11 terms apply to full dataset | Attribute WHO | Full licensing review required for full production distribution | This repo stores a 64-code curated subset, not full ICD-11 |
| LOINC (600-code common-panel subset) | Regenstrief Institute | https://loinc.org/ | LOINC license/terms apply | Attribute LOINC/Regenstrief | Review/confirm latest terms before commercial deployment | Bundled 600 ranked observations from LOINC Top 2000+ SI list (see `data/vocabularies/sources/`); not full LOINC |
| HCPCS Level II | CMS | https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system | U.S. government/public CMS distribution | Cite CMS as source | Generally acceptable; verify latest terms | Allowed per source terms. About 10 official CMS Level II descriptions in the bundled snapshot still mention CPT codes in upstream CMS wording; this is CMS text, not an AMA CPT vocabulary. CPT remains removed as a scheme — this repo does not ship CPT and does not redistribute AMA CPT descriptors |
| CVX (Vaccine Administered Codes) | CDC / NCIRD | https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx | U.S. government public domain | Attribute CDC as source | Acceptable; verify terms before commercial redistribution | Allowed per source terms |

## Update Frequency
- Automated refresh pipeline: weekly (`.github/workflows/refresh-medical-db.yml`) for ATC5/ICD10/ICD9/HCPCS/CVX public sources.
- Curated sample datasets must be reviewed manually before release.

## Restricted / High-Risk Sources (Not Bundled)
- Official AMA CPT (proprietary; CPT remains removed as a scheme — not shipped as a vocabulary, AMA CPT descriptors not redistributed)
- SNOMED CT (license-controlled by country/member terms)
- First Databank
- Multum
- Micromedex
- Insurer/internal hospital proprietary vocabularies

## Explicit Guardrails
- Do not scrape proprietary systems.
- Do not redistribute restricted terminology datasets.
- Do not bundle licensed datasets in public builds without explicit permission.
- Do not re-add CPT as a scheme. Leave official CMS HCPCS wording intact when it mentions CPT codes; do not scrub those descriptions to invent a cleaner licensing story.
