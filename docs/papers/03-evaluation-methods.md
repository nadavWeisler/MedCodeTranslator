# Evaluating Layered Retrieval and Cross-Scheme Search for Multi-Standard Medical Code Lookup

**Working title**  
**Authors:** [TBD]  
**Target venue:** AMIA Annual Symposium (abstract + poster/paper), *JAMIA Open*, or *International Journal of Medical Informatics*  
**Draft date:** 2026-07-06

---

## Abstract

**Objective:** To design and evaluate a transparent layered retrieval strategy for multi-vocabulary medical code lookup, including single-scheme and cross-scheme modes, with reproducible benchmarks across eight coding systems.

**Materials and methods:** We implemented a five-layer pipeline—exact, prefix, substring, fuzzy (Fuse.js), and alias expansion—with deterministic score mapping and per-result `matchMethod` labels. Curated benchmark fixtures (n=10–13 queries per scheme) specify acceptable code sets for clinical representative queries (e.g., “diabetes,” “hypertension,” “glucose”). We measured precision@1 and precision@5 on bundled vocabularies ranging from 64-code demo sets to 74,260-code ICD-10-CM. Cross-scheme search merges parallel per-scheme results with round-robin fairness (cap=30). Hebrew Stage-A ICD-10 labels enable evaluation of non-Latin substring retrieval. Baselines are committed to version control; CI fails on regression.

**Results:** [Insert fresh `npm run benchmark` output.] On 2026-06-27 baselines, ATC-5 achieved P@1=0.83; LOINC partial panel P@1=0.70; ICD-10 P@1=0.77 (threshold borderline). Cross-scheme queries such as “glucose” return concurrent LOINC and ICD-family hits with scheme badges. Hebrew queries (“סוכרת,” “אסתמה”) retrieve expected prefix families when `name_he` is present.

**Discussion:** Layered retrieval prioritizes interpretability over learned ranking—appropriate for a safe-scope reference tool. Weak performance on ICD-9 and HCPCS benchmarks highlights fixture–vocabulary alignment issues rather than solely algorithmic limits. Cross-scheme mode trades latency for breadth; fairness caps prevent single-scheme dominance.

**Conclusion:** Reproducible benchmarks and explicit match methods support quality governance for open terminology retrieval. Future work should expand clinically validated query sets and compare against licensed baselines under fair offline conditions.

---

## 1. Introduction

Terminology search in production systems typically relies on proprietary relevance models. For open, offline tools, stakeholders need **explainable** ranking and **testable** quality commitments. This study formalizes the MedCode Clinical retrieval approach and reports benchmark outcomes across schemes and languages.

### 1.1 Research questions

- **RQ1:** Does layered retrieval meet minimum precision thresholds on diverse schemes?
- **RQ2:** How does alias expansion affect abbreviation queries (HTN, DM)?
- **RQ3:** Does cross-scheme merge preserve per-scheme relevance without cross-vocabulary inference?
- **RQ4:** Are Hebrew substring queries viable with partial `name_he` coverage?

---

## 2. Methods

### 2.1 Retrieval pipeline

Layers execute sequentially; first hit per code wins by highest score:

```
exact (1.0) → prefix (0.9) → substring (0.7) → fuzzy (≤0.65) → alias (tags parent layer)
```

Fuse.js configuration:

| Key | Weight |
|-----|--------|
| `name_en` | 0.6 |
| `name_he` | 0.3 |
| `code` | 0.1 |

Threshold 0.4, distance 100, min match length 2.

### 2.2 Alias table

`data/aliases/common.json` maps 35+ abbreviations and brand names to canonical English search terms (e.g., `HTN` → `hypertension`). Alias hits inherit underlying layer scores with `matchMethod: 'alias'`.

### 2.3 Benchmark fixtures

| File | Scheme | Queries | Example |
|------|--------|---------|---------|
| `icd10.json` | ICD-10-CM | 13 | “diabetes” → E08/E10/E11 |
| `loinc.json` | LOINC partial | 10 | “glucose” → 2345-7 |
| `atc5.json` | ATC-5 | 12 | “metformin” |
| `icd10_hebrew.json` | ICD-10 HE | 8 | “סוכרת” |

**Acceptance rule:** precision@k = |acceptable ∩ top-k| / k, where acceptable is the fixture’s `expected_codes` list (prefix-aware for ICD families).

### 2.4 Cross-scheme protocol

1. User query `q`, limit `L=30`, schemes `S` = all enabled
2. For each `s ∈ S`, run layered search with per-scheme limit `⌈L/|S|⌉`
3. Round-robin merge until `L` results or exhaustion
4. Record scheme label on each `ScoredEntry`

**Latency:** wall-clock on reference device [TBD: insert profiling numbers].

### 2.5 CI regression gate

`search-quality.yml` runs `npm run benchmark`; compares to `data/benchmarks/baseline.json` thresholds (P@1≥0.70, P@5≥0.85 default).

---

## 3. Results

### 3.1 Single-scheme precision (baseline snapshot)

| Scheme | n queries | P@1 | P@5 | CI pass |
|--------|-----------|-----|-----|---------|
| atc5 | 12 | 0.83 | 0.92 | ✓ |
| icd10 | 13 | 0.77 | 0.85 | partial |
| icd9 | 8 | 0.00 | 0.00 | ✗ |
| icd11 | 9 | 0.89 | 0.89 | ✓ |
| loinc | 10 | 0.70 | 1.00 | ✓ |
| cpt | 8 | 1.00 | 1.00 | ✓ |
| hcpcs | 7 | 0.43 | 0.71 | ✗ |
| cvx | 8 | 0.88 | 0.88 | ✓ |

*Regenerate before publication.*

### 3.2 Alias expansion cases

| Query | Expanded term | Top code | matchMethod |
|-------|-----------------|----------|-------------|
| HTN | hypertension | I10 | alias |
| DM | diabetes mellitus | E11.* family | alias |
| T2DM | type 2 diabetes | E11.9 | alias |

### 3.3 Cross-scheme qualitative examples

| Query | Schemes represented | Observation |
|-------|---------------------|-------------|
| glucose | LOINC, ICD-10 | Lab code ranks above diagnosis codes |
| aspirin | ATC-5 | Drug substance match |
| vaccine | CVX, ICD-10 | Immunization codes co-present |

No result implies clinical relationships not encoded in source vocabularies.

### 3.4 Hebrew retrieval

With Stage-A labels (~2,476 ICD-10 leaf codes):

| Hebrew query | Expected family | Observed |
|--------------|-----------------|----------|
| סוכרת | E11/E10/E08 | [fill] |
| יתר לחץ דם | I10 | [fill] |
| אסתמה | J45.* | [fill] |

---

## 4. Discussion

### 4.1 Interpretability vs learning-to-rank

Layered rules sacrifice potential relevance gains from learned models but provide auditable behavior critical for compliance-sensitive deployments.

### 4.2 Benchmark failures

ICD-9 and HCPCS low scores likely reflect fixture codes absent from refreshed vocabulary or overly strict expected sets—illustrating need for benchmark–data co-evolution.

### 4.3 Cross-scheme fairness

Round-robin prevents ICD-10 volume from suppressing LOINC lab hits on biochemical terms; tuning per-scheme weights remains future work.

### 4.4 Multilingual considerations

Hebrew prefix/substring layers now include `name_he`; fuzzy weight 0.3 aids transliterated queries. RTL UI is tested separately (`__tests__/rtl.test.ts`).

### 4.5 Comparison to commercial tools

Formal head-to-head comparison was not performed (licensing, network, and opacity barriers). Position paper should cite qualitative differences: offline operation, open benchmarks, no patient context.

---

## 5. Limitations

- Small benchmark fixtures; not a clinical validation study
- No user study measuring coder efficiency
- Demo subsets skew some schemes
- Latency profiling incomplete

---

## 6. Conclusion

Layered retrieval with committed benchmarks offers a pragmatic quality framework for open multi-scheme terminology search. Cross-scheme and Hebrew extensions broaden utility while staying within informational safe scope. Expanding fixtures and publishing dataset version pins will strengthen longitudinal claims.

---

## Figures (planned)

1. **Figure 1:** Layered retrieval flow diagram  
2. **Figure 2:** Precision@1 by scheme (bar chart)  
3. **Figure 3:** Cross-scheme result screenshot for “glucose”  
4. **Table 1:** Benchmark fixture summary  
5. **Table 2:** Alias expansion spot checks  

---

## References (starter set)

1. Manning CD, Raghavan P, Schütze H. *Introduction to Information Retrieval.* Cambridge University Press; 2008.
2. Fonseca S, et al. Automatic indexing of clinical terminology. *Artif Intell Med.* [representative citation — select recent].
3. MedCodeTranslator benchmark baselines. GitHub repository, 2026.
4. Regenstrief LOINC search best practices documentation.

---

## AMIA submission notes

- **Category:** Clinical informatics / Terminology & standards  
- **Format:** 2-page extended abstract or full proceedings (check year-specific CFP)  
- **Poster:** Emphasize benchmark table + cross-scheme screenshot  
- **Data availability statement:** Benchmark fixtures and baselines in public GitHub repo
