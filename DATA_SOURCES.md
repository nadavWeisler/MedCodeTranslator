# Data Sources and Licensing Notes

_Last updated: 2026-09-06_

| Dataset | Source | URL | License / Terms | Attribution Requirements | Commercial Use Status | Redistribution |
|---|---|---|---|---|---|---|
| ATC5 | WHOCC | https://www.whocc.no/atc_ddd_index_and_guidelines/ | WHOCC terms for ATC/DDD material | Attribute WHOCC and preserve source context | Verify terms before commercial release | Do not redistribute beyond terms without review |
| ICD-10-CM | CMS | https://www.cms.gov/medicare/coding-billing/icd-10-codes | U.S. government/public CMS distribution | Cite CMS as source | Generally acceptable for commercial use; verify latest terms | Allowed per source terms; optional Stage-A Hebrew labels (`npm run import:icd10-he`) are curated, not MOH-official |
| ICD-9-CM (historical) | NBER/CMS public files | https://data.nber.org/data/icd9cm-2022.csv | Public historical distribution (verify at refresh time) | Cite NBER/CMS source URLs | Usually acceptable with attribution | Allowed per source terms |
| ICD-11 (64-code subset) | WHO | https://icd.who.int/ | Official WHO ICD-11 terms apply to full dataset | Attribute WHO | Full licensing review required for full production distribution | This repo stores a 64-code curated subset, not full ICD-11 |
| LOINC (600-code common-panel subset) | Regenstrief Institute | https://loinc.org/ | LOINC license/terms apply | Attribute LOINC/Regenstrief | Review/confirm latest terms before commercial deployment | Bundled 600 ranked observations from LOINC Top 2000+ SI list (see `data/vocabularies/sources/`); not full LOINC |
| HCPCS Level II | CMS | https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system | U.S. government/public CMS distribution | Cite CMS as source | Generally acceptable; verify latest terms | Allowed per source terms. Ten official CMS Level II descriptions still mention CPT codes in upstream CMS wording (listed below). That is CMS text, not AMA CPT redistributed. CPT remains removed as a scheme |
| CVX (Vaccine Administered Codes) | CDC / NCIRD | https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx | U.S. government public domain | Attribute CDC as source | Acceptable; verify terms before commercial redistribution | Allowed per source terms |

## CMS HCPCS Level II strings that mention CPT

The bundled HCPCS Level II snapshot (`data/vocabularies/hcpcs.json`) includes these 10 official CMS `name_en` strings that mention CPT codes. They are **upstream CMS text**, not AMA CPT descriptors and not an AMA CPT vocabulary redistributed by this repo. CPT remains removed as a scheme. These strings are not scrubbed.

- **G0316** — Prolonged hospital inpatient or observation care evaluation and management service(s) beyond the total time for the primary service (when the primary service has been selected using time on the date of the primary service); each additional 15 minutes by the physician or qualified healthcare professional, with or without direct patient contact (list separately in addition to cpt codes 99223, 99233, and 99236 for hospital inpatient or observation care evaluation and management services). (do not report g0316 on the same date of service as other prolonged services for evaluation and management 99358, 99359, 99418, 99415, 99416). (do not report g0316 for any time unit less than 15 minutes)
- **G0317** — Prolonged nursing facility evaluation and management service(s) beyond the total time for the primary service (when the primary service has been selected using time on the date of the primary service); each additional 15 minutes by the physician or qualified healthcare professional, with or without direct patient contact (list separately in addition to cpt codes 99306, 99310 for nursing facility evaluation and management services). (do not report g0317 on the same date of service as other prolonged services for evaluation and management 99358, 99359, 99418). (do not report g0317 for any time unit less than 15 minutes)
- **G0318** — Prolonged home or residence evaluation and management service(s) beyond the total time for the primary service (when the primary service has been selected using time on the date of the primary service); each additional 15 minutes by the physician or qualified healthcare professional, with or without direct patient contact (list separately in addition to cpt codes 99345, 99350 for home or residence evaluation and management services). (do not report g0318 on the same date of service as other prolonged services for evaluation and management 99358, 99359, 99417). (do not report g0318 for any time unit less than 15 minutes)
- **G2212** — Prolonged office or other outpatient evaluation and management service(s) beyond the maximum required time of the primary procedure which has been selected using total time on the date of the primary service; each additional 15 minutes by the physician or qualified healthcare professional, with or without direct patient contact (list separately in addition to cpt codes 99205, 99215, 99483 for office or other outpatient evaluation and management services) (do not report g2212 on the same date of service as 99358, 99359, 99415, 99416). (do not report g2212 for any time unit less than 15 minutes)
- **M1483** — Patients who achieve sustained virological response as identified by an hcv rna test (cpt 87522) or (cpt 87521) with a negative/undetectable hcv rna result that occurred 20 weeks to 12 months after the first positive/detectable hcv rna test result within the denominator identification period
- **M1485** — Patients who did not achieve sustained virological response as identified by an hcv rna test (cpt 87522) or (cpt 87521) with a negative/undetectable hcv rna result that occurred 20 weeks to 12 months after the first positive/detectable hcv rna test result within the denominator identification period
- **S1030** — Continuous noninvasive glucose monitoring device, purchase (for physician interpretation of data, use cpt code)
- **S1031** — Continuous noninvasive glucose monitoring device, rental, including sensor, sensor replacement, and download to monitor (for physician interpretation of data, use cpt code)
- **S8055** — Ultrasound guidance for multifetal pregnancy reduction(s), technical component (only to be used when the physician doing the reduction procedure does not perform the ultrasound, guidance is included in the cpt code for multifetal pregnancy reduction - 59866)
- **S9123** — Nursing care, in the home; by registered nurse, per hour (use for general nursing care only, not to be used when cpt codes 99500-99602 can be used)

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
