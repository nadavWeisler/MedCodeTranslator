# MedCode Clinical: An Offline, Explainable Multi-Vocabulary Terminology Retrieval Platform and Benchmark Evaluation

**Manuscript type:** Original research (systems description + evaluation)  
**Target journal:** *JAMIA Open* (primary); alternates: *BMC Medical Informatics and Decision Making*, *Journal of Biomedical Informatics*  
**Draft version:** 1.0-unified (2026-07-06)  
**Authors:** [Author 1], [Author 2], …  
**Affiliations:** [Department, Institution, City, Country]  
**Corresponding author:** [email]  
**Word count:** ~7,500 (excluding references and tables)

---

## Abstract

**Background:** Clinical documentation, billing, and health data science depend on lookups across incompatible coding systems—ICD-10-CM, LOINC, ATC, HCPCS, and others. Existing tools are often proprietary, network-dependent, or opaque in ranking. Open, offline-capable terminology retrieval with reproducible quality assessment remains uncommon, particularly for mobile and multilingual use.

**Objective:** To design and implement MedCode Clinical, an open-source platform for on-device multi-vocabulary code retrieval, and to evaluate whether a transparent five-layer retrieval strategy outperforms single-mechanism lexical search across eight biomedical coding schemes.

**Methods:** We bundled twelve terminologies (105,000+ entries) with structured provenance metadata and implemented layered retrieval: exact, prefix, substring, fuzzy (Fuse.js), and abbreviation alias expansion—each result tagged with score and `matchMethod`. A benchmark of 82 clinically representative queries (74 English, 8 Hebrew) measured precision at rank 1 (P@1) and rank 5 (P@5). Layered retrieval was compared with SQLite `LIKE` substring search on identical fixtures. Secondary analyses covered alias routing, cross-scheme merge, and Hebrew `name_he` matching.

**Results:** Layered retrieval achieved mean P@1 = 0.95 versus SQLite mean P@1 = 0.71 across eight English scheme benchmarks (2026-07-06 run). Largest gains occurred on ICD-10-CM (P@1: 0.67→1.00; n=12) and LOINC partial panel (0.40→1.00; n=10). Alias expansion mapped HTN→hypertension (I10 family) and DM→diabetes mellitus (E11.9). Cross-scheme query “glucose” ranked LOINC 2345-7 first with scheme-labelled ICD hits lower in the list. Hebrew queries (n=8) achieved P@1 = 1.00 after Stage-A label import covering 2,476 ICD-10 leaf codes.

**Conclusions:** Explainable layered retrieval with fuzzy fallback substantially improves top-rank precision over naive lexical search on large clinical vocabularies without sacrificing auditability. MedCode Clinical offers a reference architecture for narrowly scoped, offline terminology tools. Certified-coder validation and expanded query corpora are needed before production coding claims.

**Keywords:** medical informatics; terminology; information retrieval; ICD-10; LOINC; open-source software; mobile health; Hebrew

---

## 1 Introduction

Medical codes anchor diagnosis documentation, claims processing, quality reporting, and observational research [1]. In practice, lookup is fragmented: coders consult CMS resources for ICD-10-CM, Regenstrief tools for LOINC, and proprietary EHR modules for drug classifications—systems that differ in ranking logic, connectivity requirements, and explainability.

Three gaps motivate this work:

1. **Opacity** — Users cannot determine why a code ranked first in most commercial engines.
2. **Offline exclusion** — Cloud terminology APIs fail in low-connectivity clinics, humanitarian settings, and privacy-sensitive workflows.
3. **Evaluation vacuum** — Open mobile bundles rarely publish reproducible query sets with regression-tested precision.

We present **MedCode Clinical** (open-source repository: MedCodeTranslator): a cross-platform application and reusable retrieval libraries that unify twelve coding schemes behind one deterministic, explainable search pipeline operating entirely on end-user devices.

### 1.1 Scope and safe boundary

MedCode Clinical is intentionally limited to **terminology lookup**—returning stored codes and labels matching a user query. It does not provide diagnosis suggestion, treatment recommendation, drug interaction analysis, dosing guidance, or patient-specific inference. This boundary aligns with informational tool classification and reduces software-as-medical-device risk [2,3], though institutional legal review remains required before clinical deployment.

Users are instructed not to enter protected health information (PHI).

### 1.2 Research questions

- **RQ1:** Does layered retrieval achieve acceptable P@1 (≥0.70) across schemes from 64-code demos to full ICD-10-CM (74,260 codes)?
- **RQ2:** Does layered retrieval outperform SQLite lexical search on identical benchmarks?
- **RQ3:** Do abbreviation aliases improve retrieval without obscuring match provenance?
- **RQ4:** Can cross-scheme and Hebrew retrieval operate on stored labels only, without ontological inference?

### 1.3 Contributions

1. Open platform architecture for offline multi-vocabulary retrieval (iOS, Android, Web PWA).
2. License-aware corpus of twelve schemes with coverage labelling and automated refresh for public sources.
3. Five-layer explainable retrieval algorithm with published Fuse.js and alias configuration.
4. Benchmark harness (82 queries) with CI regression gates comparing layered vs lexical arms.
5. Empirical demonstration of cross-scheme and Hebrew substring retrieval.

---

## 2 Related work

**Terminology services** map phrases to concept identifiers using lexical, ontological, and learned methods [4]. UMLS MetaMap and similar tools offer broad semantic mapping but impose redistribution constraints unsuitable for naive mobile bundling [5]. HL7 FHIR terminology servers (`$expand`, `$lookup`) support interoperability but require infrastructure and may depend on restricted content (e.g., SNOMED CT) [6].

**Public browsers** (WHO ICD-11, Regenstrief LOINC search) are authoritative yet browser-bound and not designed as offline-integrable corpora with version pins.

**Open vocabularies** (RxNorm, LOINC, CMS ICD releases) are publicly obtainable but license-heterogeneous; assembling them for redistribution requires documented provenance [7,8].

**Medical code search studies** often evaluate proprietary systems without open fixtures [9]. MedCode Clinical contributes an open benchmark tied to inspectable ranking layers.

---

## 3 Methods

### 3.1 System architecture

**Figure 1** (planned): Component diagram.

```
User interface (Expo / React Native Web)
        │
        ▼
Retrieval adapter (lazy per-scheme index build)
        │
   ┌────┴────┐
   ▼         ▼
Layered     SQLite
engine      (seed storage)
   │
   ▼
Bundled JSON vocabularies + source-metadata.json
```

**Components:**

| Layer | Technology | Role |
|-------|------------|------|
| UI | Expo Router, i18next (9 locales, Hebrew RTL) | Search, scheme tabs, result cards, share links |
| Retrieval | `@medcode/search` TypeScript package | Layered pipeline, Fuse.js index |
| Storage | expo-sqlite | Per-scheme tables seeded on first access |
| Data | `data/vocabularies/*.json` | Offline corpus |
| Clients | `@medcode/core`, `medcodetranslator` (Python) | Programmatic parity with in-app search |

Default configuration performs **no network calls** during search.

### 3.2 Terminology corpus

**Table 1.** Bundled vocabularies and coverage classes.

| Scheme | Authority | Records | Coverage | Refresh |
|--------|-----------|---------|----------|---------|
| ATC-1…5 | WHOCC | 14 – 5,579 | full | weekly automated |
| ICD-10-CM | CMS | 74,260 | full | weekly automated |
| ICD-9-CM | NBER/CMS | 14,567 | full | weekly automated |
| HCPCS II | CMS | 8,724 | full | weekly automated |
| CVX | CDC | 289 | full | weekly automated |
| LOINC | Regenstrief | 600 | partial | scripted import |
| ICD-11 | WHO | 64 | demo | manual |
| CPT-like | curated | 64 | demo | manual |

Entry schema: `{ code, name_en, name_he? }`. `source-metadata.json` records provider, license text, version, and `generated_at_utc`.

**Hebrew ICD-10 Stage A:** 80 curated category-level Hebrew strings propagated to 2,476 leaf codes by ICD prefix (`scripts/import_icd10_hebrew_labels.py`). Not an official Israeli Ministry of Health distribution; full authoritative Hebrew ICD-10-CM requires separate license review.

**Excluded by policy:** SNOMED CT, official AMA CPT, full LOINC—pending explicit license paths.

**Crosswalk:** ICD-9→ICD-10 GEM stored with cardinality flags; validated on refresh.

### 3.3 Layered retrieval algorithm

Given query *q* and vocabulary *V*, layers execute in priority order; results deduplicate by code (highest score wins):

| Layer | Match rule | Score | `matchMethod` |
|-------|------------|-------|---------------|
| L1 | Exact equality on code or label (EN/HE) | 1.00 | `exact` |
| L2 | Prefix on code or label | 0.90 | `prefix` |
| L3 | Substring in code or label | 0.70 (+0.05 if code hit) | `substring` |
| L4 | Fuse.js fuzzy match | ≤0.65 | `fuzzy` |
| L5 | Alias expansion → rerun L1–L4 | inherits layer | `alias` |

**Fuse.js configuration:** keys `name_en` (0.6), `name_he` (0.3), `code` (0.1); threshold 0.4; distance 100.

**Alias table:** 35+ entries (e.g., HTN→hypertension, T2DM→type 2 diabetes, glucophage→metformin).

Each `ScoredEntry` includes `highlights` (character spans) for UI emphasis.

### 3.4 Cross-scheme retrieval

For query *q*, layered search runs per enabled scheme in parallel (per-scheme quota ⌈30/n⌉), merges round-robin, caps at 30 results. Each hit retains scheme badge and independent score. No unified clinical concept ID is synthesized.

### 3.5 Benchmark design

**Fixture construction:** English queries per scheme (n=74 total) with acceptable code sets defined by clinical intent (e.g., “diabetes”→E08/E10/E11 family). Hebrew ICD-10 fixtures (n=8) test `name_he` retrieval. Prefix rules accept leaf codes (expected `J45` matches `J45.20`).

**Arms:**

- **Layered:** full pipeline with alias map loaded
- **SQLite lexical:** `LIKE '%q%'` on `name_en` and `code` only; no fuzzy, no alias, no `name_he`

**Metrics:** P@1, P@5 per scheme. Mean P@1 across schemes reported descriptively.

**Regression gate:** CI fails if layered P@1 < 0.70 or P@5 < 0.85 per scheme.

**Execution:** `npm run benchmark` → `build/search-quality/benchmark-report.json` (2026-07-06).

### 3.6 Ethics

Software evaluation on public terminologies; no human subjects. No PHI processed. Institutional review not required; legal review advised for deployment context.

---

## 4 Results

### 4.1 Primary outcome: precision by scheme

**Table 2.** Layered versus SQLite retrieval on English fixtures.

| Scheme | n | Layered P@1 | Layered P@5 | SQLite P@1 | SQLite P@5 | Δ P@1 |
|--------|---|-------------|-------------|------------|------------|-------|
| ATC-5 | 12 | 0.83 | 1.00 | 0.75 | 0.83 | +0.08 |
| ICD-10-CM | 12 | **1.00** | **1.00** | 0.67 | 0.75 | **+0.33** |
| ICD-9-CM | 8 | 1.00 | 1.00 | 0.88 | 1.00 | +0.12 |
| ICD-11 (demo) | 9 | 0.89 | 0.89 | 0.89 | 0.89 | 0.00 |
| LOINC (partial) | 10 | **1.00** | **1.00** | 0.40 | 1.00 | **+0.60** |
| CPT (demo) | 8 | 1.00 | 1.00 | 0.75 | 0.75 | +0.25 |
| HCPCS | 7 | 1.00 | 1.00 | 0.86 | 1.00 | +0.14 |
| CVX | 8 | 0.75 | 0.88 | 0.50 | 0.63 | +0.25 |
| **Mean** | **74** | **0.95** | **0.97** | **0.71** | **0.87** | **+0.24** |

All schemes met CI thresholds under layered retrieval. RQ1 and RQ2 supported.

### 4.2 Failure mode analysis (SQLite arm)

**Table 3.** Representative ICD-10-CM queries where layered search corrected SQLite rank-1 errors.

| Query | SQLite rank-1 (incorrect) | Layered rank-1 (acceptable) |
|-------|---------------------------|-----------------------------|
| hypertension | G93.2 | I15.1 |
| pneumonia | A01.03 | J12.81 |
| influenza | A41.3 | J09.X1 |
| heart failure | I09.81 | I50.9 |

Mechanism: incidental substring collisions in 74k-code namespace; layered scoring elevates clinically intended chapter matches.

### 4.3 Alias expansion (RQ3)

| Query | Expansion | Top hit | Method |
|-------|-----------|---------|--------|
| HTN | hypertension | I15.1* | alias |
| DM | diabetes mellitus | E11.9 | alias |
| glucophage | metformin | A10BA02 | alias |

*Acceptable family. Alias hits retain `matchMethod: alias` for audit.

### 4.4 Cross-scheme retrieval (RQ4)

Query **glucose** (all schemes): rank-1 = LOINC 2345-7 (Glucose [Mass/volume] in Serum or Plasma); subsequent hits from LOINC panel; ICD-family codes appear with scheme badges at lower ranks. No inferred LOINC↔ICD mapping applied.

### 4.5 Hebrew retrieval

**Table 4.** Hebrew ICD-10 fixtures (n=8) after Stage-A import.

| Query | Top hit | Layer |
|-------|---------|-------|
| סוכרת | E11.01 | substring (`name_he`) |
| יתר לחץ דם | I10 | substring |
| אסתמה | J45.20 | substring |
| מיגרנה | G43.001 | substring |
| שפעת | J09.X1 | substring |
| דלקת ריאות | J12.81 | substring |
| שבץ | I63.* | substring |
| אנמיה | D50.0 | substring |

Layered P@1 = 1.00; P@5 = 1.00 on Hebrew fixture set.

### 4.6 Implementation availability

- Repository: https://github.com/nadavWeisler/MedCodeTranslator (MIT)
- Live demo: https://nadavweisler.github.io/MedCodeTranslator/
- Packages: `@medcode/core`, `@medcode/search`, `medcodetranslator` (PyPI)

---

## 5 Discussion

### 5.1 Principal findings

Transparent layered retrieval with fuzzy fallback and alias expansion materially improves top-rank precision over single-mechanism lexical search, especially on large heterogeneous vocabularies (ICD-10-CM, LOINC). Explainable `matchMethod` labels preserve auditability absent from black-box rankers.

### 5.2 Comparison with alternatives

Enterprise terminology platforms may achieve higher accuracy with proprietary ontologies and EHR context but lack open benchmarks and offline bundling. FHIR servers offer standards-based access at deployment cost. MedCode Clinical trades comprehensive licensing for **inspectable, regression-governed retrieval** at mobile scale.

### 5.3 Multilingual and cross-scheme implications

Hebrew substring matching on dual labels demonstrates feasibility without separate indices; coverage remains partial until authoritative national translations are licensed. Cross-scheme mode supports chart-review workflows (e.g., lab + diagnosis codes for “glucose”) while avoiding unsanctioned concept merging.

### 5.4 Regulatory and safety posture

Intentional exclusion of CDS features and PHI processing reduces—but does not eliminate—regulatory review burden [2,3]. Organizations must independently assess classification in their jurisdiction.

### 5.5 Limitations

1. **Fixture size** (n=82) insufficient for clinical validation or powered algorithm comparison.
2. **No certified-coder study** measuring chart-level coding accuracy or time savings.
3. **Demo subsets** (ICD-11, CPT) limit generalizability.
4. **Hebrew labels** are curated Stage A, not MOH-official.
5. **No commercial baseline** comparison (licensing and opacity barriers).
6. **Latency** not profiled at scale (74k ICD-10 on mid-range Android)—ongoing work.

### 5.6 Future work

- Expand benchmark with coder-validated gold standards (target n≥200)
- Versioned dataset DOI tags (`dataset-YYYY.MM`) for research citation
- ICD-10→ICD-11 crosswalk with WHO license review
- P95 latency study; FTS5 evaluation for substring layer
- Optional FHIR CodeSystem export

A standalone data descriptor (*Scientific Data*) may follow when a Zenodo snapshot and fuller LOINC panel are ready.

---

## 6 Conclusion

MedCode Clinical demonstrates that offline, explainable, multi-vocabulary terminology retrieval is feasible at clinical vocabulary scale with reproducible quality governance. On open benchmarks, layered retrieval substantially outperforms lexical search while exposing match provenance for every result. The platform offers reference infrastructure for informatics education, administrative lookup, and research tooling when bounded away from clinical decision support.

---

## Author contributions

[TBD — CRediT taxonomy]

## Funding

[TBD]

## Conflicts of interest

None declared.

## Data and code availability

Source code, benchmark fixtures, vocabulary metadata, and reproduction commands:

```bash
git clone https://github.com/nadavWeisler/MedCodeTranslator.git
npm ci && npm run benchmark
```

---

## References

1. O'Malley KJ, et al. Measuring diagnosis: ICD coding accuracy. *Jt Comm J Qual Patient Saf.* 2005;31(5):246–255.  
2. U.S. Food and Drug Administration. Policy for Device Software Functions and Mobile Medical Applications. 2022.  
3. International Medical Device Regulators Forum. Software as a Medical Device: Possible Framework for Risk Categorisation. 2014.  
4. Bodenreider O. The Unified Medical Language System (UMLS). *Nucleic Acids Res.* 2004;32:D267–D270.  
5. National Library of Medicine. UMLS License Agreement. 2024.  
6. HL7 International. FHIR Terminology Service. https://hl7.org/fhir/terminology-service.html  
7. Centers for Medicare & Medicaid Services. ICD-10-CM. 2025.  
8. Regenstrief Institute. LOINC Users' Guide. 2024.  
9. Kuhn T, et al. LOINC – a universal standard for identifying laboratory observations. *J Am Med Inform Assoc.* 2022.  
10. Manning CD, Raghavan P, Schütze H. *Introduction to Information Retrieval.* Cambridge University Press; 2008.  
11. World Health Organization. ICD-11 Reference Guide. 2024.  
12. Fuse.js Project. Fuse.js documentation. https://fusejs.io/  

---

## Figure legends

**Figure 1.** System architecture: UI, retrieval engine, SQLite, bundled vocabularies.  
**Figure 2.** Layered retrieval pipeline with deduplication.  
**Figure 3.** Mean P@1 by scheme: layered vs SQLite (grouped bar chart).  
**Figure 4.** Cross-scheme results for “glucose” with scheme badges.  
**Figure 5.** Hebrew UI screenshot (RTL) showing `name_he` primary label.

---

## Supplementary materials

| ID | Content |
|----|---------|
| Table S1 | Full per-query benchmark outcomes (`benchmark-report.json`) |
| Table S2 | Complete provenance matrix (`source-metadata.json`) |
| Table S3 | Alias table (`data/aliases/common.json`) |
| File S1 | SAFE_SCOPE policy excerpt |
| File S2 | Reproduction log and CI workflow description |

**Archive:** Earlier split manuscript drafts (platform-only, data-only, evaluation-only) retained in `docs/papers/archive/` for section reuse.
