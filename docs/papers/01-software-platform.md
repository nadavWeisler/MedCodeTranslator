# MedCode Clinical: An Open-Source, Offline-First Platform for Multi-Scheme Biomedical Terminology Retrieval

**Working title**  
**Authors:** [TBD]  
**Target venue:** *Journal of Open Source Software* (primary) or *BMC Bioinformatics* Software article  
**Draft date:** 2026-07-06

---

## Abstract

Biomedical coding spans incompatible terminologies—ICD-10-CM, ATC, LOINC, HCPCS, and others—each maintained by different authorities under distinct licenses. Clinicians, coders, and researchers often rely on proprietary tools or ad hoc scripts that lack transparency, offline capability, or reproducible evaluation. We present **MedCode Clinical** (MedCodeTranslator), an open-source, cross-platform terminology retrieval platform that runs entirely on-device without transmitting queries to external services. The system implements a transparent five-layer retrieval pipeline (exact, prefix, substring, fuzzy, and alias expansion), bundles twelve coding schemes with documented provenance, and exposes identical search semantics through a React Native client, TypeScript npm packages (`@medcode/core`, `@medcode/search`), and a Python client (`medcodetranslator`). A curated benchmark suite measures precision@1 and precision@5 per scheme and gates continuous integration against committed baselines. We describe the architecture, safe-scope design constraints that exclude clinical decision support, and distribution model including progressive web app deployment and optional native builds via Expo Application Services. MedCode Clinical is released under the MIT license and is intended as reference infrastructure for administrative coding, research data curation, and terminology education—not for diagnosis or treatment.

**Keywords:** medical informatics; terminology services; open source software; ICD-10; LOINC; offline search; React Native

---

## 1. Introduction

### 1.1 Motivation

Medical codes anchor billing, epidemiology, quality reporting, and clinical documentation. In practice, lookup workflows are fragmented: a coder may use one portal for ICD-10, another for LOINC, and a licensed vendor API for drug classifications. Mobile and low-connectivity settings exacerbate the problem. Black-box ranking further undermines trust when a user cannot explain why a particular code surfaced.

### 1.2 Contributions

1. A **unified offline retrieval engine** spanning twelve schemes with explicit per-result `matchMethod` and normalized scores.
2. **Publishable client libraries** in TypeScript and Python sharing the same layered semantics as the mobile/web application.
3. A **reproducible benchmark harness** with scheme-specific query fixtures and CI regression gates.
4. **Cross-scheme search** and **shareable deep links** for collaborative reference workflows.
5. Documented **safe-scope guardrails** separating terminology lookup from regulated clinical decision support.

### 1.3 Non-goals

MedCode Clinical does not provide diagnosis suggestion, drug interaction checking, dosing guidance, or patient-specific risk scoring. These boundaries are encoded in project policy (`SAFE_SCOPE.md`) and enforced in documentation and PHI guard workflows.

---

## 2. Related work

| Category | Examples | Gap addressed |
|----------|----------|---------------|
| Licensed terminology browsers | IMO, 3M, vendor EHR lookups | Cost, opacity, network dependency |
| Public web portals | WHO ICD-11 browser, LOINC search | Single-scheme, not offline-integrable |
| FHIR terminology servers | HAPI FHIR, Snowstorm | Server deployment; SNOMED licensing |
| Open vocabularies | UMLS (restricted), RxNorm (NLM) | Redistribution limits; not packaged for mobile offline use |
| Fuzzy medical search libraries | Various Elasticsearch setups | No unified multi-scheme mobile bundle with benchmarks |

MedCode Clinical occupies a niche: **small enough to bundle on-device**, **transparent enough to audit**, and **scoped narrowly enough** to avoid medical-device classification for its current feature set.

---

## 3. System architecture

### 3.1 High-level design

```
┌─────────────────────────────────────────────────────────────┐
│  UI layer (Expo Router, React Native Web)                   │
│  SearchBar · SchemeTabs · CodeList · CodeCard · share links │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  app/services/fuzzySearch.ts (adapter)                      │
│  · per-scheme index build · cross-scheme merge              │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│ packages/   │    │ expo-sqlite  │    │ data/vocabularies│
│ search      │    │ db/          │    │ JSON + metadata  │
└─────────────┘    └──────────────┘    └──────────────────┘
```

### 3.2 Layered retrieval

Queries traverse layers in strict priority order; results deduplicate by code, retaining the highest score:

| Layer | Score range | `matchMethod` | Notes |
|-------|-------------|---------------|-------|
| Exact | 1.00 | `exact` | Code or label equality (EN/HE) |
| Prefix | 0.90 | `prefix` | Starts-with on code or label |
| Substring | 0.70 | `substring` | SQL LIKE equivalent |
| Fuzzy | 0–0.65 | `fuzzy` | Fuse.js inverted distance |
| Alias | inherits parent | `alias` | Abbreviation → canonical term |

Character-level highlight spans accompany each result for UI affordance.

### 3.3 Cross-scheme mode

When the user selects “All schemes,” the engine runs parallel per-scheme searches, merges with round-robin fairness, and caps total results (default 30). Each hit retains its scheme badge—no cross-inference between vocabularies.

### 3.4 Offline data path

On first access per scheme, JSON vocabulary files seed SQLite tables. Subsequent searches use in-memory entry caches and Fuse.js indexes built lazily. No query text leaves the device in default configuration.

### 3.5 Distribution surfaces

| Surface | Mechanism |
|---------|-----------|
| Web PWA | GitHub Pages static export |
| iOS / Android | Expo + EAS Build (`preview`, `production` profiles) |
| npm | `@medcode/core`, `@medcode/search` workspaces |
| PyPI | `medcodetranslator` wheel |

---

## 4. Implementation

- **Language:** TypeScript (strict), Python 3.12 client
- **Mobile/web framework:** Expo SDK 54, React Native 0.81
- **Storage:** expo-sqlite
- **Fuzzy engine:** Fuse.js 7.x
- **i18n:** nine UI locales including Hebrew RTL
- **CI:** Jest unit tests, benchmark gate, PHI pattern guard, accessibility workflow, package publish on release

Repository: `https://github.com/nadavWeisler/MedCodeTranslator`

---

## 5. Evaluation

### 5.1 Benchmark methodology

Curated JSON fixtures per scheme (`data/benchmarks/*.json`) specify queries and acceptable code sets. The benchmark runner (`agents/search-benchmarker/run_benchmark.js`) mirrors production Fuse configuration and layered merge logic.

**Metrics:** precision@1, precision@5, mean reciprocal rank (optional extension).

**Baselines (2026-06-27):** committed to `data/benchmarks/baseline.json`; CI fails below configured thresholds.

### 5.2 Illustrative results

| Scheme | Fixtures | P@1 | P@5 | Pass |
|--------|----------|-----|-----|------|
| ATC-5 | 12 | 0.83 | 0.92 | ✓ |
| ICD-10 | 13 | 0.77 | 0.85 | — |
| LOINC (partial) | 10 | 0.70 | 1.00 | ✓ |
| ICD-11 (demo) | 9 | 0.89 | 0.89 | ✓ |

*Note:* Populate Table 1 from latest `npm run benchmark` output before submission.

### 5.3 Hebrew retrieval

Stage-A Hebrew ICD-10 labels (~80 category prefixes → ~2,500 leaf codes) enable substring and prefix search in Hebrew. Eight dedicated benchmark queries are in `data/benchmarks/icd10_hebrew.json`.

---

## 6. Safe scope and compliance posture

The project explicitly documents prohibited features (diagnosis assistance, prescribing, LLM clinical content) and requires legal review before expansion. A PHI guard workflow scans contributions for common identifier patterns. API documentation states the no-PHI rule for any future localhost server wrapper.

This design supports use as an **informational reference tool** rather than Software as a Medical Device (SaMD) in jurisdictions where lookup-only tools fall outside device definitions—but **authors must obtain institutional legal review** before commercial clinical deployment.

---

## 7. Availability and requirements

| Artifact | Location |
|----------|----------|
| Source code | GitHub (MIT) |
| Live demo | GitHub Pages |
| npm packages | `@medcode/core`, `@medcode/search` |
| Python package | `pip install medcodetranslator` |
| Documentation | `docs/architecture.md`, `docs/API.md` |

**System requirements:** Node.js 20+, Python 3.10+ (client), Expo CLI for native builds.

---

## 8. Discussion

### 8.1 Limitations

- ICD-11, CPT, and full LOINC are not redistributed; partial/demo subsets are clearly badged.
- Hebrew ICD-10 labels are curated Stage A, not an official Ministry of Health distribution.
- Benchmark fixtures are modest in size; larger clinically validated query sets would strengthen claims.
- Cross-scheme mode increases latency proportional to scheme count; performance budgets remain active work.

### 8.2 Future work

- ICD-10→ICD-11 reference crosswalk with WHO license review
- FTS5 evaluation for ICD-10 substring layer at 74k scale
- FHIR CodeSystem export script
- Versioned dataset release tags for research citations

---

## 9. Conclusion

MedCode Clinical demonstrates that transparent, offline-capable, multi-scheme terminology retrieval can be delivered as open infrastructure with reproducible quality gates. By publishing both the application and the retrieval libraries, the project lowers the barrier for researchers and developers who need auditable coding reference tools without proprietary lock-in.

---

## References (starter set — expand before submission)

1. World Health Organization. ICD-11 for Mortality and Morbidity Statistics. https://icd.who.int/
2. Centers for Medicare & Medicaid Services. ICD-10-CM. https://www.cms.gov/medicare/coding-billing/icd-10-codes
3. Regenstrief Institute. LOINC. https://loinc.org/
4. WHO Collaborating Centre for Drug Statistics Methodology. ATC/DDD Index. https://www.whocc.no/
5. Kuhn T, et al. LOINC: a universal standard for identifying laboratory observations. *J Am Med Inform Assoc.* 2004.
6. Fuse.js documentation. https://fusejs.io/
7. U.S. FDA. Policy for Device Software Functions and Mobile Medical Applications. 2022.

---

## Supplementary material checklist

- [ ] Architecture diagram (high-res)
- [ ] Screenshot panel (mobile EN, mobile HE RTL, web cross-scheme)
- [ ] Benchmark reproduction command log
- [ ] `SAFE_SCOPE.md` excerpt
- [ ] Link to live demo and package install instructions
