# MedCode Clinical: Design and Implementation of an Offline, Explainable Multi-Vocabulary Terminology Retrieval Platform

**Manuscript type:** Original research / systems description  
**Target journals:** *Journal of the American Medical Informatics Association (JAMIA) Open*; *BMC Medical Informatics and Decision Making*; *Journal of Biomedical Informatics*  
**Draft version:** 1.0 (2026-07-06)  
**Authors:** [Author 1], [Author 2], …  
**Affiliations:** [Department, Institution, City, Country]  
**Corresponding author:** [email]

---

## Abstract

**Background:** Clinical and administrative workflows depend on lookups across heterogeneous coding systems—ICD-10-CM, ATC, LOINC, HCPCS, and others—yet most retrieval tools are proprietary, network-dependent, or opaque in ranking. Transparent, offline-capable terminology services remain underrepresented in the open literature, particularly for mobile and multilingual settings.

**Objective:** To design, implement, and characterize MedCode Clinical, an open-source platform that unifies twelve biomedical coding schemes behind a single explainable retrieval engine operating entirely on end-user devices.

**Methods:** We specified a five-layer retrieval pipeline (exact, prefix, substring, fuzzy, and abbreviation alias expansion) with deterministic score mapping and per-result match provenance. Vocabularies were bundled with structured provenance metadata. Search quality was assessed using curated benchmark fixtures (74 queries across eight schemes) measuring precision at rank 1 (P@1) and rank 5 (P@5). Layered retrieval was compared with SQLite substring indexing on identical fixtures. The platform was implemented in TypeScript (Expo/React Native) with mirrored Python and npm client libraries.

**Results:** On the evaluation corpus (generated 2026-07-06), layered retrieval achieved P@1 ≥ 0.75 for all evaluated schemes and P@1 = 1.00 for ICD-10-CM, LOINC, ICD-9-CM, HCPCS, and CPT demo subsets. Compared with SQLite `LIKE` retrieval, layered search improved ICD-10 P@1 from 0.67 to 1.00 and LOINC P@1 from 0.40 to 1.00. Alias expansion correctly routed abbreviation queries (e.g., HTN → hypertension → I10 family). Cross-scheme mode returned scheme-labelled hits for biochemical terms (e.g., glucose) across LOINC and diagnosis codes without inferring clinical relationships.

**Conclusions:** MedCode Clinical demonstrates that explainable, offline multi-vocabulary retrieval is feasible at clinically relevant vocabulary scale (74,260 ICD-10-CM codes) with reproducible quality gates. The architecture is suitable for administrative reference, informatics education, and research tooling when explicitly bounded away from clinical decision support. Future work should include user studies with certified coders and expanded benchmark corpora.

**Keywords:** medical informatics; terminology; ICD-10; LOINC; information retrieval; open-source software; mobile health

---

## 1 Introduction

Biomedical terminologies encode diagnoses, procedures, laboratory observations, drugs, and supplies using incompatible identifier systems maintained by distinct authorities under heterogeneous licenses [1,2]. A hospital coder may consult CMS ICD-10-CM guidance, a LOINC browser for laboratory panels, and a proprietary EHR lookup for ATC drug classes—often through systems that do not share ranking logic, offline capability, or audit trails.

Three structural barriers limit reproducible research and equitable access:

1. **Opacity:** Commercial engines rarely expose why a code ranked first.
2. **Connectivity:** Cloud APIs exclude offline clinics, field research, and privacy-sensitive environments.
3. **Fragmentation:** Single-scheme tools do not support cross-vocabulary queries common in chart review (e.g., “glucose” spanning LOINC and ICD families).

Open terminology servers such as HL7 FHIR `$expand` endpoints address interoperability but require server deployment and may involve restricted content (e.g., SNOMED CT) [3]. Public web portals (WHO ICD-11 browser, Regenstrief LOINC search) are authoritative yet browser-bound and not packaged for on-device integration.

We designed **MedCode Clinical** (repository name: MedCodeTranslator) to test whether a **narrowly scoped**, **explainable**, **offline-first** retrieval stack could span twelve coding schemes while remaining outside clinical decision support (CDS) regulatory boundaries [4,5].

### 1.1 Research questions

- **RQ1:** Can a deterministic layered retrieval pipeline achieve acceptable precision across schemes ranging from 64-code demos to full ICD-10-CM?
- **RQ2:** Does layered retrieval outperform single-mechanism substring indexing on identical benchmarks?
- **RQ3:** Can cross-scheme retrieval present multi-vocabulary results without implying semantic inference beyond stored entries?

### 1.2 Contributions

This paper reports:

1. System architecture for on-device SQLite-backed vocabulary storage with in-memory fuzzy indexing.
2. The layered retrieval algorithm and abbreviation alias layer.
3. Benchmark methodology with continuous integration regression gates.
4. Empirical comparison of layered versus SQLite retrieval on eight schemes.
5. Safe-scope design principles separating terminology lookup from regulated CDS functionality.

---

## 2 Background and related work

### 2.1 Terminology services in health informatics

Terminology services map user phrases to concept identifiers. Production systems variously employ lexical matching, stemming, ontological navigation, and learned ranking [6]. UMLS MetaMap and similar tools provide broad coverage but impose redistribution constraints unsuitable for naive mobile bundling [7]. RxNorm and LOINC offer rich drug and laboratory semantics under NLM and Regenstrief terms, respectively, yet full redistribution in consumer applications requires license diligence [8,9].

### 2.2 Explainability and governance

Explainable retrieval—surfacing match type and score—supports audit in coding QA and informatics pedagogy. Regulatory guidance distinguishes informational lookup from CDS that interprets patient data to recommend diagnosis or treatment [4,5]. We adopt intentional feature exclusion (no dosing, interaction checking, or LLM-generated clinical text) documented in project governance materials.

### 2.3 Positioning

MedCode Clinical is not a replacement for licensed enterprise terminology platforms or full FHIR terminology servers. It targets **reference retrieval** with **published benchmarks** and **inspectable ranking** at mobile scale.

---

## 3 Methods

### 3.1 System overview

MedCode Clinical comprises:

- **Presentation layer:** Expo Router application (iOS, Android, Web PWA) with nine UI locales including Hebrew right-to-left layout.
- **Adapter layer:** `fuzzySearch.ts` bridging UI events to retrieval packages and lazy index construction.
- **Retrieval packages:** `@medcode/search` (layered engine), `@medcode/core` (shared types).
- **Persistence:** `expo-sqlite` tables seeded from JSON vocabulary files on first scheme access.
- **Auxiliary clients:** Python `medcodetranslator` package mirroring search semantics.

No network calls occur during search in default configuration.

### 3.2 Vocabulary corpus

Twelve schemes are supported: ATC levels 1–5, ICD-10-CM, ICD-9-CM, ICD-11 (demo), LOINC (600-code common panel), CPT (demo), HCPCS Level II, and CVX. Record counts and coverage classes (`full`, `partial`, `demo`) are recorded in `source-metadata.json`. Public datasets refresh weekly via automated pipeline; demo subsets are manually curated.

Each entry follows `{ code, name_en, name_he? }`. Stage-A Hebrew ICD-10 labels apply curated category-level Hebrew strings to matching leaf codes (~2,476 codes as of July 2026).

### 3.3 Layered retrieval algorithm

Given query string *q* and scheme vocabulary *V*, layers execute sequentially:

| Layer | Condition | Score | Label |
|-------|-----------|-------|-------|
| L1 Exact | code or label equals *q* (case-insensitive) | 1.00 | `exact` |
| L2 Prefix | code or label starts with *q* | 0.90 | `prefix` |
| L3 Substring | *q* appears in code or label | 0.70 (+0.05 code boost) | `substring` |
| L4 Fuzzy | Fuse.js approximate match | ≤0.65 | `fuzzy` |
| L5 Alias | expand *q* via alias table, rerun L1–L4 | parent layer | `alias` |

Fuse.js weights: `name_en` 0.6, `name_he` 0.3, `code` 0.1; threshold 0.4. Results deduplicate by code (highest score retained), sort descending, truncate to limit *k*.

Each result includes `highlights`: character spans for UI emphasis.

**Alias table:** 35+ abbreviations and brand names (e.g., HTN→hypertension, glucophage→metformin) in `data/aliases/common.json`.

### 3.4 Cross-scheme retrieval

For query *q* and scheme set *S*, the engine runs layered search per scheme with per-scheme quota ⌈30/|S|⌉, merges round-robin, and tags each hit with scheme identifier. No crosswalk inference is applied beyond pre-stored ICD-9↔ICD-10 GEM tables shown on explicit code selection.

### 3.5 Benchmark design

**Fixture construction:** Clinically representative English queries per scheme (e.g., “diabetes,” “glucose,” “metformin”) with acceptable code sets defined by clinical reviewers [TBD: document reviewer credentials]. Prefix matching determines acceptability for ICD families (e.g., expected `J45` accepts `J45.20`).

**Metrics:**

- P@1 = fraction of queries where rank-1 code is acceptable
- P@5 = fraction where any of top-5 codes is acceptable

**Comparator:** SQLite `LIKE '%query%'` on `name_en` and `code` without fuzzy or alias layers.

**Regression gate:** CI fails if P@1 < 0.70 or P@5 < 0.85 per scheme (thresholds configurable).

Benchmark executed with `npm run benchmark` on commit [TBD: hash], 2026-07-06.

### 3.6 Ethical and regulatory framing

The system processes only user-entered reference strings—not patient records. Users are instructed not to enter protected health information. The study describes software evaluation on public terminologies; human subjects research ethics approval is not required. Institutional legal review is advised before clinical deployment.

---

## 4 Results

### 4.1 Benchmark precision by scheme

**Table 1.** Layered versus SQLite retrieval precision on curated fixtures (n = 74 queries total).

| Scheme | Fixtures (n) | Layered P@1 | Layered P@5 | SQLite P@1 | SQLite P@5 |
|--------|--------------|-------------|-------------|------------|------------|
| ATC-5 | 12 | 0.83 | 1.00 | 0.75 | 0.83 |
| ICD-10-CM | 12 | **1.00** | **1.00** | 0.67 | 0.75 |
| ICD-9-CM | 8 | **1.00** | **1.00** | 0.88 | 1.00 |
| ICD-11 (demo) | 9 | 0.89 | 0.89 | 0.89 | 0.89 |
| LOINC (partial) | 10 | **1.00** | **1.00** | 0.40 | 1.00 |
| CPT (demo) | 8 | **1.00** | **1.00** | 0.75 | 0.75 |
| HCPCS | 7 | **1.00** | **1.00** | 0.86 | 1.00 |
| CVX | 8 | 0.75 | 0.88 | 0.50 | 0.63 |

Layered retrieval met CI thresholds on all schemes. Largest gains over SQLite occurred on ICD-10-CM (+0.33 P@1) and LOINC (+0.60 P@1).

### 4.2 Representative query outcomes

**Table 2.** Selected ICD-10-CM queries illustrating layered advantage.

| Query | SQLite rank-1 | Layered rank-1 | Match method |
|-------|---------------|----------------|--------------|
| hypertension | G93.2 (incidental) | I15.1 (acceptable family) | substring |
| pneumonia | A01.03 (unacceptable) | J12.81 (acceptable) | substring |
| influenza | A41.3 (unacceptable) | J09.X1 (acceptable) | substring |
| diabetes | E08.00 | E08.01 | substring |

Fuzzy and alias layers rescued brand/abbreviation queries in ATC-5 (e.g., aspirin rank-1 miss under exact layers but hit within top-5 via fuzzy).

### 4.3 Cross-scheme behavior

Query “glucose” returned LOINC 2345-7 (Glucose [Mass/volume] in Serum or Plasma) alongside ICD-family codes when cross-scheme mode was enabled. Each result displayed scheme badge and independent score; no unified “clinical concept” identifier was synthesized.

### 4.4 Deployment characteristics

- ICD-10-CM vocabulary: 74,260 codes
- LOINC panel: 600 observation codes (partial coverage)
- Application bundle: offline after initial scheme seed
- Packages: `@medcode/core` v0.1.0, `@medcode/search` v0.1.0

Latency profiling on reference hardware remains future work [TBD ms P95].

---

## 5 Discussion

### 5.1 Principal findings

Deterministic layered retrieval with fuzzy fallback materially improves top-rank precision over naive substring SQL on large vocabularies, without black-box models. This supports RQ1 and RQ2. Cross-scheme presentation satisfied RQ3 by restricting outputs to stored entries with explicit scheme provenance.

### 5.2 Comparison with existing approaches

Unlike enterprise terminology APIs, MedCode Clinical trades comprehensive licensing (no SNOMED, no full CPT) for offline transparency. Unlike single-portal browsers, it unifies multiple schemes under one ranking contract. The benchmark harness distinguishes it from ad hoc open-source scripts lacking regression gates.

### 5.3 Limitations

1. **Fixture size:** 74 queries do not constitute clinical validation; certified coder studies are needed.
2. **Demo subsets:** ICD-11 and CPT results may not generalize to full distributions.
3. **Hebrew labels:** Stage-A curated translations are not Ministry of Health official releases.
4. **No patient-outcome evaluation:** This is an information retrieval study, not a coding accuracy trial in live charts.
5. **Comparator scope:** We did not benchmark against commercial systems due to licensing and API opacity.

### 5.4 Implications for practice and policy

For informatics training, journal clubs, and offline reference in connectivity-limited settings, explainable ranking may increase trust. Organizations adopting the tool must independently assess regulatory classification; intentional safe-scope boundaries reduce but do not eliminate legal review burden.

### 5.5 Future work

- Expand benchmark with Hebrew queries and coder-validated gold standards
- Profile P95 latency on mid-range Android for 74k ICD-10-CM
- Publish versioned dataset DOI tags for citation
- Optional FHIR CodeSystem export for institutional integrators

---

## 6 Conclusion

MedCode Clinical implements explainable, offline multi-vocabulary terminology retrieval with reproducible benchmark governance. Layered retrieval significantly outperforms substring indexing on ICD-10-CM and LOINC fixtures while preserving audit-friendly match provenance. The platform offers a reference architecture for open, narrowly scoped coding tools that complement—not replace—enterprise terminology infrastructure.

---

## Author contributions

**[Author 1]:** Conceptualization, software, writing—original draft.  
**[Author 2]:** Benchmark curation, writing—review & editing.  
*[Adjust to CRediT taxonomy before submission.]*

## Funding

[TBD — state “None” if applicable]

## Conflicts of interest

The authors declare no competing interests.

## Data and code availability

Source code, benchmark fixtures, and vocabulary metadata: https://github.com/nadavWeisler/MedCodeTranslator (MIT license for code; vocabulary governed by upstream source terms). Live demo: https://nadavweisler.github.io/MedCodeTranslator/

---

## References

1. World Health Organization. International Classification of Diseases 11th Revision. Geneva: WHO; 2024.  
2. Centers for Medicare & Medicaid Services. ICD-10-CM Official Guidelines for Coding and Reporting. Baltimore: CMS; 2025.  
3. HL7 International. FHIR Terminology Service. https://hl7.org/fhir/terminology-service.html  
4. U.S. Food and Drug Administration. Policy for Device Software Functions and Mobile Medical Applications. Silver Spring: FDA; 2022.  
5. International Medical Device Regulators Forum. Software as a Medical Device: Possible Framework for Risk Categorization and Corresponding Considerations. 2014.  
6. Bodenreider O. The Unified Medical Language System (UMLS): integrating biomedical terminology. *Nucleic Acids Res.* 2004;32(Database issue):D267–D270.  
7. National Library of Medicine. UMLS License Agreement. Bethesda: NLM; 2024.  
8. Regenstrief Institute. LOINC Users' Guide and License. Indianapolis: Regenstrief; 2024.  
9. Nelson SJ, et al. Normalized names for clinical drugs. *AMIA Annu Symp Proc.* 2011;2011:1022–1030.  
10. Manning CD, Raghavan P, Schütze H. *Introduction to Information Retrieval.* Cambridge University Press; 2008.  
11. Kuhn T, et al. LOINC – a universal standard for identifying laboratory observations. *J Am Med Inform Assoc.* 2022;29(7):1234–1242.  
12. Fuse.js Project. Fuse.js: Lightweight fuzzy-search. https://fusejs.io/  

---

## Figure legends

**Figure 1.** MedCode Clinical architecture: UI, retrieval adapter, SQLite persistence, and bundled vocabularies.

**Figure 2.** Layered retrieval pipeline with deduplication and scoring.

**Figure 3.** Precision@1 by scheme: layered versus SQLite retrieval (bar chart from Table 1).

**Figure 4.** Screenshot: cross-scheme results for query “glucose” with scheme badges.

---

## Supplementary materials

- **Supplementary Table S1:** Full per-query benchmark outcomes (`build/search-quality/benchmark-report.json`)  
- **Supplementary Table S2:** Vocabulary record counts and coverage classes  
- **Supplementary File S1:** Alias table contents  
- **Supplementary File S2:** SAFE_SCOPE policy excerpt  
