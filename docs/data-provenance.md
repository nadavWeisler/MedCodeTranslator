# Data provenance audit

Audit date: 2026-10-29. This document records where each file under `data/` came from. It does not refresh, rewrite, or relabel those files.

`source-metadata.json` is a claim log. Where it disagrees with the file bytes, the commit that wrote the file, or a comparison run for this audit, the disagreement is stated here. Unknown fields stay unknown.

## Scope

The app seeds search from `data/vocabularies/` (`db/database.ts`) and expands queries with `data/aliases/common.json` (`app/services/fuzzySearch.ts`). Crosswalk and ICD-10/ICD-11 panels read `icd9_to_icd10_gem.json` and `common_scheme_mappings.json`. Everything else under `data/` is listed at the end. `assets/data/` has no vocabulary JSON; its README marks that path deprecated.

There is no bundled WHO ICD-10 (the international edition), no full ICD-11, no full LOINC, no SNOMED CT, and no CPT scheme. The scheme key `icd10` is U.S. ICD-10-CM.

## How rows were counted

Counts are from the files on `dev` at commit `cac0a4772f84875baa8ed0f76968ce21ecea412a`, which is the parent of this document.

- JSON vocabularies, the GEM file, and `common_scheme_mappings.json`: `len(json.load(...))` on the top-level array. Every vocabulary array had unique `code` values (0 duplicate codes).
- Non-empty Hebrew: `name_he` is a string and `strip()` is non-empty.
- CSV: `csv.DictReader` data rows, header excluded.
- Aliases: `len(aliases)` in `data/aliases/common.json`.
- Benchmark files: `len` of the top-level query array.
- Held-out queries: `len(queries)` in `data/eval/heldout-queries.json`.

Upstream comparisons below were downloaded into a temp directory on 2026-10-29 and were not written back into the repo. Parsers used were the functions already in the repo, called in-process.

## Summary

| Dataset | File | Rows counted | What was actually retrieved | Version | Retrieval date | UNVERIFIED |
|---|---|---:|---|---|---|---|
| ICD-10-CM | `data/vocabularies/icd10.json` | 74260 | CMS FY2025 tabular-order ZIP | `icd10cm_order_2025.txt` inside the 2025 ZIP | File entered the repo 2026-05-20 (`357250f`). ZIP Last-Modified 2024-07-08 | English traced. See Hebrew overlay |
| ICD-10-CM Hebrew overlay | same file, `name_he` | 2489 labeled rows | Curated CSV in this repo | Stage A, not an MOH release | 2026-07-06 (`b1ab149`) | Yes, 2489 |
| ICD-9-CM diagnoses | `data/vocabularies/icd9.json` | 14567 | CMS v32 long diagnosis descriptions | `CMS32_DESC_LONG_DX.txt` | Bytes first appear 2026-05-30 (`51f7694`). Download log is incomplete | No, after content comparison |
| ICD-11 demo | `data/vocabularies/icd11.json` | 64 | No upstream file in the repo | unknown | Initial commit; unchanged since `4875e23` (2026-05-20) | Yes, 64 |
| ATC-1 | `data/vocabularies/atc1.json` | 14 | ChEMBL ATC API | No ChEMBL release id | 2026-05-30 (`51f7694`) | Yes, third-party mirror |
| ATC-2 | `data/vocabularies/atc2.json` | 90 | ChEMBL ATC API | No ChEMBL release id | 2026-05-30 (`51f7694`) | Yes, third-party mirror |
| ATC-3 | `data/vocabularies/atc3.json` | 248 | ChEMBL ATC API | No ChEMBL release id | 2026-05-30 (`51f7694`) | Yes, third-party mirror |
| ATC-4 | `data/vocabularies/atc4.json` | 841 | ChEMBL ATC API | No ChEMBL release id | 2026-05-30 (`51f7694`) | Yes, third-party mirror |
| ATC-5 | `data/vocabularies/atc5.json` | 5579 | ChEMBL ATC API `who_name` | No ChEMBL release id | 2026-05-20 (`357250f`) | Yes, third-party mirror |
| LOINC subset | `data/vocabularies/loinc.json` | 600 | OHDSI GitHub CSV | LOINC release unknown | CSV committed 2026-07-06 (`ce13f8f`) | Yes, third-party mirror |
| LOINC Hebrew labels | same file, `name_he` | 45 | Previous curated demo JSON | unknown | Preserved by the 2026-07-06 import | Yes, 45 |
| HCPCS Level II | `data/vocabularies/hcpcs.json` | 8724 | CMS July 2026 alpha-numeric ZIP URL | Not the 2026-06-17 revision still at that URL | 2026-05-30 (`51f7694`) | No. Two descriptions differ from the later CMS file |
| CVX | `data/vocabularies/cvx.json` | 289 | CDC `cvx.txt` | Living file; no release id stored | 2026-05-30 (`51f7694`) | No |
| ICD-9↔ICD-10 GEM | `data/vocabularies/icd9_to_icd10_gem.json` | 64 | Static JSON in an agent commit | unknown | 2026-05-25 (`381bc55`) | Yes, 64 |
| ICD-10↔ICD-11 mappings | `data/vocabularies/common_scheme_mappings.json` | 30 | Static JSON | unknown | 2026-06-29 (`ccce1e4`) | Yes, 30 |
| Search aliases | `data/aliases/common.json` | 35 | Static JSON | unknown | 2026-05-20 (`4875e23`) | Yes, 35 |

`source-metadata.json` `record_count` matches the array lengths above. It does not match `hebrew_label_count` (metadata 2476, file 2489). ICD-10-CM and ATC `url` / `dataset_version` / `source_revision` strings now match the files below (FY2025 order file; ChEMBL ATC API, release unknown). Other provenance strings are still stale; see each section.

## ICD-10-CM (`icd10`)

- **Code system:** U.S. ICD-10-CM. The app scheme id is `icd10`. This is not WHO ICD-10.
- **Upstream URL:** `https://www.cms.gov/files/zip/2025-code-descriptions-tabular-order.zip`. That is the URL built by `cms_icd10_url()` in `scripts/refresh_medical_db.py`. `source-metadata.json` `url` is that ZIP. Before the relabel it was the CMS landing page `https://www.cms.gov/medicare/coding-billing/icd-10-codes`, which is not the file.
- **Release / version:** FY2025 code descriptions in tabular order. The ZIP contains `icd10cm_order_2025.txt`. On 2026-10-29 the ZIP response `Last-Modified` was `Mon, 08 Jul 2024 18:10:21 GMT`. Parsing that order file with `parse_icd10_codes_zip` produced 74260 codes, and the code set was identical to `icd10.json`. The same parser on `https://www.cms.gov/files/zip/2026-code-descriptions-tabular-order.zip` produced 74719 codes and a different code set (487 codes only in that ZIP, 28 only in the bundle). Metadata `dataset_version` is `FY2025 ICD-10-CM code descriptions (valid-for-coding only)` and `source_revision` names `icd10cm_order_2025.txt`. Before that relabel the version string was `FY2026 ICD-10-CM code descriptions (valid-for-coding only)`. That FY2026 string was already present when this file still had 113 demo rows (`source-metadata.json` as of the parent of `357250f`) and was left in place when the 74260-row file landed. Commit `357250f` (2026-05-20) says "CMS 2025" in its message. The vocabulary file was not replaced with the FY2026 ZIP.
- **Retrieval date:** The 74260-row code set entered the repo in `357250f` (2026-05-20, `generated_at_utc` in that commit's metadata bump is `2026-05-20T18:21:10+00:00`). No ZIP SHA-256 was stored. `retrieved_at_utc` `2026-05-30T14:40:52+00:00` was written later by `scripts/fetch_public_vocabularies.py`, which does not download ICD-10. English labels were whitespace-deduped on 2026-06-29 (`4a5f809`) without a new code set.
- **License / redistribution:** In-repo text is "CMS/U.S. government source terms for ICD-10-CM" (`source-metadata.json`) and "U.S. government/public CMS distribution" (`DATA_SOURCES.md`). No upstream license file is committed. This audit did not extract a license clause from the PDF inside the ZIP.
- **Transform:** `parse_icd10_codes_zip` keeps rows whose valid-for-coding flag is `1`, inserts a dot after the third character, and stores the short description. Commit `357250f` left each short description duplicated (the order file repeats it after a wide space run). Commit `4a5f809` added `dedupe_padded_label` and rewrote names: 67080 names are exactly that dedupe of the previous string, 7180 names were unchanged, 0 codes were added or removed, and 0 names changed in any other way. One shipped name is not character-identical to a fresh parse of the current ZIP: `E74.01` is `Von Gierke disease` in the bundle and `von Gierke disease` in `icd10cm_order_2025.txt`. The pre-dedupe blob (`4a5f809^`) already had `Von` on the first copy. No step in the current parser capitalizes that word.
- **Record count:** 74260 objects. 74259 `name_en` values match a fresh `parse_icd10_codes_zip` of the FY2025 ZIP; 1 differs by the initial capital above. 2489 objects have a non-empty `name_he`; the other 71771 omit `name_he`.

## ICD-10-CM Hebrew overlay

- **Code system:** Hebrew display strings on ICD-10-CM rows. Not a separate scheme.
- **Upstream URL:** none. Source file is `data/vocabularies/sources/icd10_hebrew_stage_a.csv`. `data/vocabularies/sources/README.md` says these are curated high-frequency translations, not an Israeli Ministry of Health distribution.
- **Release / version:** Stage A. There is no MOH release id.
- **Retrieval date:** CSV and merged JSON landed in `b1ab149` (2026-07-06). The parent JSON had 0 non-empty `name_he` values.
- **License / redistribution:** unknown. The CSV `source_note` column is `curated-stage-a-high-frequency` on every row. No external license is cited.
- **Transform:** `scripts/import_icd10_hebrew_labels.py` sorts CSV prefixes longest-first and writes `name_he` onto every ICD-10-CM code that starts with that prefix (dots ignored). Replaying that function on `b1ab149^` plus the current CSV updates 2489 rows across 80 prefixes. One CSV prefix, `I64`, matches nothing. The other 80 prefixes account for every non-empty `name_he` now in the file (0 rows where the prefix matches but the Hebrew text differs). 80 distinct Hebrew strings cover 2489 rows.
- **Record count:** 81 CSV data rows; 2489 vocabulary rows with non-empty `name_he`. `source-metadata.json` `hebrew_label_count` is 2476, which does not match either count. `hebrew_label_prefix_count` 80 does match the prefixes that hit a code.
- **UNVERIFIED:** 2489 Hebrew labels. Hand-curated. Not traced to an official Hebrew ICD-10-CM file.

## ICD-9-CM diagnoses (`icd9`)

- **Code system:** ICD-9-CM diagnosis descriptions, including E and V codes. Procedure codes are not included.
- **Upstream URL that matches the bytes:** `https://www.cms.gov/medicare/coding/icd9providerdiagnosticcodes/downloads/icd-9-cm-v32-master-descriptions.zip`, inner file `CMS32_DESC_LONG_DX.txt`. The metadata URL is `https://data.nber.org/data/icd9cm-2022.csv`. That NBER URL returned HTTP 403 on 2026-10-29, so this audit did not show the NBER CSV is the same bytes. `source_revision` is `Existing repository ICD-9-CM snapshot`, which is the default string in `fetch_icd9()` when that function does not adopt a larger fresh download (`scripts/fetch_public_vocabularies.py`). The same function still records the NBER URL as `best_url` in that branch.
- **Release / version:** CMS ICD-9-CM v32 master long diagnosis descriptions, from the ZIP name and the inner filename. A fiscal-year label is not stored in the JSON.
- **Retrieval date:** The 14567-row file first appears in `51f7694` (2026-05-30). The previous commit had 65 dotted demo rows. Metadata `retrieved_at_utc` is `2026-05-30T14:40:52+00:00` from that same `fetch_public_vocabularies.py` run. No response hash was stored, so the clock is the commit, not an HTTP `Date` header.
- **License / redistribution:** In-repo text is "NBER/CMS public historical file terms" (`source-metadata.json`) and "Public historical distribution (verify at refresh time)" (`DATA_SOURCES.md`). No license file is committed.
- **Transform:** Shipped codes are the file's own undotted form (`0010`, `E0000`, `V010`), and names are the long description. `parse_icd9_cms_zip` in both refresh scripts would insert a decimal; the shipped file does not, so it was not emitted by that function. Decoding `CMS32_DESC_LONG_DX.txt` as cp1252 or latin-1 gives 14567 codes and 14567 names identical to `icd9.json`, including the 7 non-ASCII names (UTF-8 decoding of the same ZIP mismatches those 7). The ZIP also contains `CMS32_DESC_LONG_SG.txt` (3882 procedure rows) and the short-description twins. Those three files are not in `icd9.json`. Every `name_he` is JSON `null`.
- **Record count:** 14567.

## ICD-11 demo (`icd11`)

- **Code system:** A 64-code ICD-11-shaped list. Not the WHO ICD-11 linearization.
- **Upstream URL:** none in the repo. Metadata points at `https://icd.who.int/` and `source_revision` `Curated repository sample`.
- **Release / version:** unknown. Metadata says `Demo subset`.
- **Retrieval date:** The 64 objects, including Hebrew, are in the initial commit at `assets/data/icd11.json` (`a2b6961`). `4875e23` (2026-05-20) moved them to `data/vocabularies/icd11.json` with no content change. `git` shows no content change after that. There is no import script.
- **License / redistribution:** Metadata says "WHO ICD-11 terms apply to official distributions." That sentence does not identify a license for this handwritten subset. No WHO license file is committed.
- **Transform:** none recorded. Each object has `code`, `name_en`, and `name_he`.
- **Record count:** 64. All 64 have non-empty `name_en` and non-empty `name_he`.
- **UNVERIFIED:** 64 rows. English titles and Hebrew titles are hand-entered. This audit did not find a WHO download, API payload, or release id. Individual titles may resemble WHO titles; that was not checked against the WHO API, and resemblance would not create a provenance chain.

## ATC-1, ATC-2, ATC-3, ATC-4

- **Code system:** ATC anatomical/therapeutic levels 1–4.
- **Upstream URL:** `https://www.ebi.ac.uk/chembl/api/data/atc_class?format=json&limit=1000&offset=0`, then each `page_meta.next` URL. Implemented by `fetch_atc_levels()` in `scripts/fetch_public_vocabularies.py`, which keeps distinct `levelN` / `levelN_description` pairs. Metadata `url` is `https://www.ebi.ac.uk/chembl/api/data/atc_class`. Before the relabel it was the WHOCC information page `https://www.whocc.no/atc_ddd_index_and_guidelines/`. Nothing in the repo shows a download from WHOCC.
- **Release / version:** unknown. Metadata `dataset_version` is `ChEMBL ATC classification level N (release unknown)`. The ChEMBL request has no release pin. `page_meta.total_count` on 2026-10-29 was 5579 (level-5 rows), which is not a ChEMBL database version.
- **Retrieval date:** `51f7694` (2026-05-30). Metadata `retrieved_at_utc` `2026-05-30T14:40:52+00:00` matches `generated_at_utc` from `scripts/fetch_public_vocabularies.py` in that commit. These four files have no later commit.
- **License / redistribution:** In-repo text is "Derived from the ChEMBL ATC API. ChEMBL release was not recorded." The bytes came from ChEMBL. No ChEMBL license file is committed. `https://www.whocc.no/copyright/` returned HTTP 404 on 2026-10-29, so this audit did not retrieve a WHOCC terms page at that path.
- **Transform:** One object per distinct level code, `name_he` set to JSON `null`, sorted by code. A full re-fetch of the ChEMBL API on 2026-10-29 matched all four files exactly (codes and `name_en`, including case): 14, 90, 248, and 841.
- **Record count:** 14, 90, 248, 841.
- **UNVERIFIED:** all of those rows. Third-party mirror (EMBL-EBI ChEMBL), not an official WHOCC release file. No WHOCC version or download date exists to attach.

## ATC-5

- **Code system:** ATC level 5 (7-character codes).
- **Upstream URL:** same ChEMBL ATC API as above. `fetch_atc_chembl()` in `scripts/refresh_medical_db.py` keeps `level5` plus `who_name`. Commit `357250f` (2026-05-20) says this replaced a broken WHOCC CSV URL and wrote 5579 codes. `scripts/fetch_public_vocabularies.py` does not rewrite `atc5.json`. It writes the ChEMBL provenance strings (release unknown) onto the atc5 metadata entry.
- **Release / version:** unknown. Metadata `dataset_version` is `ChEMBL ATC classification level 5 (release unknown)` and `source_revision` is `Derived from ChEMBL ATC classification API level 5 who_name. ChEMBL release unknown.` No ChEMBL release id was stored. Before the relabel those fields said `WHOCC cumulative alterations snapshot` and `ATC cumulative alterations CSV`. The refresh script's own version string would have been `chembl-atc-{year}`, and that string is not what was committed.
- **Retrieval date:** `357250f` (2026-05-20). The file has no later content commit. Metadata `retrieved_at_utc` `2026-05-30T14:40:52+00:00` is the later `fetch_public_vocabularies.py` clock, which did not re-download ATC-5.
- **License / redistribution:** same in-repo ChEMBL sentence as ATC-1–4. The retrieval source is ChEMBL. No ChEMBL license file is committed.
- **Transform:** Level-5 regex `[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}`, whitespace-normalized `who_name`, no `name_he` key. The current script does not change letter case. A full re-fetch on 2026-10-29 had the same 5579 codes. Casefolded `who_name` matched all 5579 shipped names. Exact string match was 19. The other 5560 differ only by letter case (shipped `Sodium fluoride`, API that day `sodium fluoride`). Capitalizing each word of the current API string reproduces 3697 of 5579 shipped names, so the shipped case is not that transform either. Why the case differs is unknown.
- **Record count:** 5579.
- **UNVERIFIED:** 5579 rows. Third-party ChEMBL mirror (`who_name`). No ChEMBL release id is stored.

`scripts/fetch-data.js` still documents a different ATC-5 URL (`https://raw.githubusercontent.com/fabkury/atcd/main/WHO%20ATC-DDD%202021-12-03.csv`) and a different ICD-10 URL (`https://raw.githubusercontent.com/nicktacular/icd10/master/data/icd10.json`). It is not wired in `package.json` `scripts`, and the commits above replaced those datasets. It is not the provenance of the current files. Running it would point at those third-party GitHub paths.

## LOINC subset (`loinc`)

- **Code system:** LOINC long common names, partial list. Not the full LOINC table.
- **Upstream URL of the bytes:** `https://raw.githubusercontent.com/OHDSI/StudyProtocolSandbox/master/themis/extras/LOINC_1.6_Top2000CommonLabResultsUS.csv` (blob page linked from `data/vocabularies/sources/README.md`). SHA-256 of the vendored CSV and of that raw URL on 2026-10-29 are both `a17e3d166beea9ef5ed7d552def49a42aa799a838c6baa379686f20bd578b3ff` (206171 bytes). Metadata `url` is `https://loinc.org/`, which was not the download. Regenstrief was not contacted by any script in this repo.
- **Release / version:** unknown. The OHDSI filename contains the token `LOINC_1.6`. This audit does not treat that token as a LOINC release id. The sibling file `LOINC_1.6_Top2000CommonLabResultsSI.csv` in the same GitHub directory is 207417 bytes and is not what was vendored. The import script's docstring says "SI units" and names `loinc_top2000_common_si.csv`, which is not a file in this repo. The shipped CSV is the US file.
- **Retrieval date:** `data/vocabularies/sources/loinc_top2000_common_us.csv` was added in `ce13f8f` (2026-07-06). No HTTP `Date` or Regenstrief release date is stored inside the CSV. Metadata `retrieved_at_utc` for the LOINC entry is `2026-07-05T05:57:19+00:00`.
- **License / redistribution:** In-repo text says LOINC/Regenstrief terms apply and points at `https://loinc.org/license` (`data/vocabularies/sources/README.md`). That URL returned HTTP 403 on 2026-10-29. No LOINC license file is committed. The GitHub file is a third-party copy.
- **Transform:** `scripts/import_loinc_common_panel.py` walks the CSV in order, keeps the first 600 distinct `LOINC #` values that have a non-empty `Long Common Name`, and copies any `name_he` already present on that code in the previous `loinc.json`. The 600 `(code, name_en)` pairs equal the first 600 qualifying CSV rows exactly. The CSV has 2181 data rows and 2177 distinct LOINC numbers. Ranks in the file run through `3000` (the tail repeats rank `3000`). The previous `loinc.json` (`ce13f8f^`) was a 70-row curated demo, every row with Hebrew (`source_revision` at that time: `Curated repository sample`).
- **Record count:** 600 vocabulary rows. 45 have non-empty `name_he`; 555 have `name_he: null`.
- **UNVERIFIED:** 600 English rows, because the chain stops at the OHDSI mirror and the LOINC release is unknown. Separately, 45 Hebrew strings are hand-carried from that curated demo. They are not columns in the Top 2000 CSV.

## HCPCS Level II (`hcpcs`)

- **Code system:** CMS HCPCS Level II. The parser keeps codes matching `^[A-HJ-NP-V][0-9]{4}$`. All-digit procedure codes are not included.
- **Upstream URL:** `https://www.cms.gov/files/zip/july-2026-alpha-numeric-hcpcs-file.zip`. `fetch_hcpcs()` in `scripts/fetch_public_vocabularies.py` tries a candidate list and stores the URL whose parse produced the most rows (ties keep the earlier candidate). That July 2026 URL is what the script wrote into metadata in `51f7694`.
- **Release / version:** The recorded URL names a July 2026 alpha-numeric file. The ZIP at that URL on 2026-10-29 has `Last-Modified: Wed, 17 Jun 2026 15:59:47 GMT` and inner file `HCPC2026_JUL_ANWEB_06172026.txt`. That inner filename is dated 2026-06-17, which is after the 2026-05-30 commit. Parsing it with `parse_hcpcs_zip` from `fetch_public_vocabularies.py` yields 8725 codes. The bundle has 8724. The extra current code is `G0577`. Two shared descriptions differ: `G0574` and `G0575` say `mush` in the bundle and `must` in the 2026-06-17 file. The rest of those two sentences match. The 2026-05-30 snapshot was not archived, so its inner filename is unknown. It is not identical to the file CMS publishes at that URL now.
- **Retrieval date:** `51f7694` (2026-05-30). Metadata `retrieved_at_utc` `2026-05-30T14:40:52+00:00`. No later content commit. No ZIP hash.
- **License / redistribution:** In-repo text is "CMS/U.S. government source terms for HCPCS Level II" and "U.S. government/public CMS distribution" (`DATA_SOURCES.md`). No license file is committed.
- **Transform:** `parse_hcpcs_zip` in `fetch_public_vocabularies.py` reads the ANWEB-style fixed-width text, takes the 5-character code, and concatenates record-type `3` and `4` description chunks from columns 11:91. `scripts/refresh_medical_db.py` has a different HCPCS parser (a single-line regex). The long bundled descriptions, including continuation text, match the fixed-width chunk joiner, not that other parser. Every `name_he` is JSON `null`. Ten `name_en` values mention CPT (`G0316`, `G0317`, `G0318`, `G2212`, `M1483`, `M1485`, `S1030`, `S1031`, `S8055`, `S9123`). Those strings are in the CMS file; `DATA_SOURCES.md` already lists them.
- **Record count:** 8724.

## CVX (`cvx`)

- **Code system:** CDC CVX vaccine administered codes.
- **Upstream URL:** `https://www2.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt`.
- **Release / version:** unknown. The file is a living list. No CDC release id or "last updated" column was copied into the JSON. Metadata says `CDC CVX vaccine administered codes`.
- **Retrieval date:** `51f7694` (2026-05-30), metadata `retrieved_at_utc` `2026-05-30T14:40:52+00:00`. On 2026-10-29 the same URL's `Last-Modified` was `Thu, 17 Sep 2026 22:04:21 GMT`. All 289 shipped `(code, name_en)` pairs match that later file. The later file also contains code `338`, which is absent from the bundle. The September file is not claimed to be the May snapshot; the 289 shared rows still match.
- **License / redistribution:** In-repo text is "CDC/U.S. government public domain; verify terms before commercial redistribution." No CDC license file is committed.
- **Transform:** `fetch_cvx()` in `scripts/fetch_public_vocabularies.py` splits on `|`, keeps a numeric field 0 as the code (not zero-padded; lengths are 2 or 3), and field 1 as `name_en`. It does not drop inactive rows. The first line of the current `cvx.txt` is `54|adenovirus, type 4|...|Inactive|...`, which is that layout. `parse_cvx_txt` in `scripts/refresh_medical_db.py` assumes a different column order and zero-pads codes; it is not what produced this file. Every `name_he` is JSON `null`.
- **Record count:** 289.

## ICD-9 ↔ ICD-10 GEM

- **Code system:** A small ICD-9 to ICD-10-CM pair list used by the crosswalk UI. Not the full CMS General Equivalence Mapping.
- **Upstream URL:** none archived. Commit `381bc55` (2026-05-25, `copilot-swe-agent[bot]`) says the 64 rows are "CMS GEM entries for all bundled ICD-9 demo codes (source: CMS GEM / NBER public CSV)". `scripts/refresh_medical_db.py` can download `https://data.nber.org/data/icd9cm-to-icd10cm.csv`, but that path writes a crosswalk under `build/` and the shipped file is still the 64-row JSON from `381bc55` (one commit, 514 lines added, never updated). The NBER URL returned HTTP 403 on 2026-10-29, so the 64 pairs were not checked against it.
- **Release / version:** unknown.
- **Retrieval date:** `381bc55` (2026-05-25). There is no separate download timestamp.
- **License / redistribution:** unknown for this extract. The commit asserts a CMS/NBER origin without storing the source file.
- **Transform:** At the parent of `381bc55`, `icd9.json` had 65 demo codes. The GEM contains 64 of them. The missing demo code is `140-239` (a range, not a code). Every row is `cardinality` `1:1` with the three boolean flags set to match. After ICD-9 was replaced by the 14567-row CMS file, 62 of 64 GEM `icd9_code` values still match a shipped ICD-9 code once the dot is removed. `274.0` and `780.6` do not (`icd9.json` has `27400`–`27403` and `78060`–`78066`, not `2740` or `7806`). All 64 `icd10_code` values occur in `icd10.json`.
- **Record count:** 64.
- **UNVERIFIED:** 64 rows. Static agent-authored JSON sized to the old demo, not a mechanical extract of the full GEM, and no upstream file or checksum is in the repo.

## ICD-10 ↔ ICD-11 common mappings

- **Code system:** Bidirectional pairs between ICD-10-CM codes and ICD-11 demo codes, shown as conversions.
- **Upstream URL:** none. Every row's `mapping_source` is the string `WHO ICD-11 demo alignment`. No WHO mapping file or script writes this JSON. It was added in `ccce1e4` (2026-06-29) with the conversions UI.
- **Release / version:** unknown.
- **Retrieval date:** `ccce1e4` (2026-06-29).
- **License / redistribution:** unknown.
- **Transform:** none recorded. 15 ICD-10→ICD-11 rows and 15 reverse rows.
- **Record count:** 30.
- **UNVERIFIED:** 30 rows. Hand-entered. The mapping_source string is not evidence of a WHO download.

## Search aliases

- **Code system:** Not a code system. Abbreviation and brand-name query expansions loaded by `app/services/fuzzySearch.ts` from `data/aliases/common.json`.
- **Upstream URL:** none. Added in `4875e23` (2026-05-20). No generator script.
- **Release / version:** unknown.
- **Retrieval date:** `4875e23` (2026-05-20). No later commit.
- **License / redistribution:** unknown. Brand names in the table are not attached to a drug-label source.
- **Transform:** none. The file's `_comment` says each key is a query alias and the value is the canonical term.
- **Record count:** 35 aliases.
- **UNVERIFIED:** 35 entries. Hand-entered.

## Other files under `data/`

These do not seed the terminology tables. Counts use the same rules as above.

| File | What it is | Rows | Provenance |
|---|---|---:|---|
| `data/vocabularies/source-metadata.json` | Claim log read by the app and the held-out harness | 11 `sources` entries | Written by import/fetch scripts and later edited by hand in `3ee1d5c` (2026-09-06). `generated_at_utc` is `2026-07-06T05:07:27+00:00`. `record_count` matches the JSON arrays. ICD-10-CM and ATC version strings match the files. Other version strings often do not; see the sections above. |
| `data/vocabularies/sources/loinc_top2000_common_us.csv` | LOINC import input | 2181 data rows, 2177 distinct LOINC numbers | Byte-identical to the OHDSI US CSV on 2026-10-29. See LOINC. |
| `data/vocabularies/sources/icd10_hebrew_stage_a.csv` | Hebrew prefix table | 81 data rows | Curated. See the Hebrew overlay. |
| `data/vocabularies/sources/README.md` | Pointer for the two CSVs | n/a | Documents the OHDSI mirror and the curated Hebrew file. |
| `data/benchmarks/atc5.json` | Hand-authored search fixtures | 12 queries | Present since `da5c426` / `4875e23`. **UNVERIFIED** as authored expected-code lists. |
| `data/benchmarks/cvx.json` | same | 8 | same |
| `data/benchmarks/hcpcs.json` | same | 7 | last content touch `4a5f809` |
| `data/benchmarks/icd10.json` | same | 12 | last content touch `4a5f809` |
| `data/benchmarks/icd10_hebrew.json` | same | 8 | added `b1ab149` |
| `data/benchmarks/icd11.json` | same | 9 | `4875e23` |
| `data/benchmarks/icd9.json` | same | 8 | last content touch `4a5f809` |
| `data/benchmarks/loinc.json` | same | 10 | `4875e23` |
| `data/benchmarks/baseline.json` | Old fixture-score snapshot | not a query list | `generated_at` inside the file is `2026-06-27T16:19:46.826Z`. Its `fixture_count` for ICD-10 is 13; `icd10.json` currently has 12 queries. It has no `icd10_hebrew` row. Do not use it as a count of the current fixtures. |
| `data/eval/heldout-queries.json` | Generated known-item queries | 198 | `scripts/heldout_ir_eval.js`, seed `20260906`, committed in `78dd1b0` (2026-09-06). Derived from bundled `name_en` / `code` values, not from a new upstream download. `generated_from` copies the ICD-10-CM and ATC-5 provenance strings from `source-metadata.json` (FY2025 order file; ChEMBL ATC API, release unknown). |
| `data/eval/heldout-report.json` | Scores for those 198 queries | 1 report | Same commit. Output of the harness, not a terminology source. |
| `data/eval/PROTOCOL.md` | Protocol for the harness | n/a | Same commit. |

Benchmark queries are test fixtures. They are hand-entered, so they are **UNVERIFIED** as authoritative expected codes: 12+8+7+12+8+9+8+10 = 74 queries. `baseline.json` is not part of that 74.

## Metadata strings that are not evidence

- LOINC metadata URL is `https://loinc.org/`. The CSV matches the OHDSI GitHub file.
- ICD-9 metadata URL is the NBER CSV, and `source_revision` says the existing repo snapshot was kept. The bytes match CMS `CMS32_DESC_LONG_DX.txt`.
- HCPCS metadata names the July 2026 ZIP. The file at that URL on 2026-10-29 is the 2026-06-17 revision and is not the same row set.
- `hebrew_label_count` 2476 does not equal the 2489 non-empty `name_he` values.
- `retrieved_at_utc` `2026-05-30T14:40:52+00:00` on ICD-10 and ATC-5 is a metadata rewrite by `fetch_public_vocabularies.py`, which does not re-download those two files.

## UNVERIFIED summary

Counts below are the affected rows in the shipped files. Hebrew and alias rows sit on top of other datasets; do not add this list into one total.

- ATC-1: 14 rows. Third-party ChEMBL mirror, not a WHOCC download. No WHOCC release id.
- ATC-2: 90 rows. Third-party ChEMBL mirror, not a WHOCC download. No WHOCC release id.
- ATC-3: 248 rows. Third-party ChEMBL mirror, not a WHOCC download. No WHOCC release id.
- ATC-4: 841 rows. Third-party ChEMBL mirror, not a WHOCC download. No WHOCC release id.
- ATC-5: 5579 rows. Third-party ChEMBL mirror (`who_name`). No ChEMBL release id is stored.
- ICD-11 demo: 64 rows. Hand-entered `name_en` and `name_he` (64 and 64). No WHO file, API response, or release id in the repo.
- ICD-10-CM Hebrew labels: 2489 rows. Curated prefix translations, `source_note` `curated-stage-a-high-frequency`. Not an Israeli Ministry of Health file.
- LOINC English subset: 600 rows. Third-party OHDSI GitHub mirror, not a Regenstrief download. LOINC release version unknown.
- LOINC Hebrew labels: 45 rows. Carried forward from the old curated demo. Not in the Top 2000 CSV.
- ICD-9 to ICD-10 GEM: 64 rows. Agent-authored static JSON for the former demo ICD-9 list. Not a full CMS or NBER GEM extract. No archived upstream file.
- ICD-10 to ICD-11 common mappings: 30 rows. Hand-entered. The `mapping_source` string is not a WHO download.
- Search aliases: 35 entries. Hand-entered abbreviations and brand names.
- Benchmark query fixtures: 74 queries. Hand-authored expected-code lists under `data/benchmarks/` (not including `baseline.json`).

## Machine-readable keys

After this audit, `source-metadata.json` gained a `provenance_keys` map. Each shipped dataset's `provenance_key` is the source reference for every row in that file. Long citations stay on the key. Vocabulary `code`, `name_en`, and `name_he` strings were not edited.

`hebrew_label_count` for ICD-10-CM is 2489, matching the non-empty `name_he` values. It was 2476 in the audit above.

Hebrew labels on ICD-10-CM (2,489) and LOINC (45) now carry per-record `translation`:

```json
{ "method": "Unofficial translation, not validated", "reviewed": false, "english_source": "<dataset provenance_key>" }
```

`english_source` is the English record's provenance key, which links to the CMS ICD-10-CM page or `https://loinc.org/<code>`. A translated label with no such link fails `npm run validate:data`. ICD-11 Hebrew titles are part of the hand-entered demo, not this translation overlay.

The method is not `AI-translated`. `b1ab149` added `data/vocabularies/sources/icd10_hebrew_stage_a.csv` with `source_note` `curated-stage-a-high-frequency`, and `scripts/import_icd10_hebrew_labels.py` calls the table curated. LOINC Hebrew was copied from the pre-`ce13f8f` curated demo. No commit, script, or source file records a model or machine translation.
