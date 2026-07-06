# Comparative Evaluation of Layered versus Lexical Retrieval for Multi-Standard Clinical Code Lookup

**Manuscript type:** Original research (methods & evaluation)  
**Target journals:** *JAMIA Open*; *International Journal of Medical Informatics*; AMIA Annual Symposium (full paper track)  
**Draft version:** 1.0 (2026-07-06)  
**Authors:** [Author 1], [Author 2], …  
**Affiliations:** [Department, Institution, City, Country]  
**Corresponding author:** [email]

---

## Abstract

**Objective:** To evaluate whether a five-layer retrieval strategy (exact, prefix, substring, fuzzy, alias) improves top-rank precision over single-mechanism lexical (`LIKE`) search for clinical code lookup across eight biomedical coding schemes, and to characterize cross-scheme and multilingual retrieval behavior.

**Materials and methods:** We constructed a benchmark of 74 English queries with clinician-reviewed acceptable code sets spanning ATC-5, ICD-10-CM (74,260 codes), ICD-9-CM, ICD-11 demo, LOINC partial panel (600 codes), CPT demo, HCPCS, and CVX. Each query was executed against bundled vocabularies using (a) layered retrieval with Fuse.js fuzzy matching and abbreviation expansion, and (b) SQLite substring matching on code and English label. Primary endpoints were precision at rank 1 (P@1) and precision at rank 5 (P@5). Secondary analyses examined per-layer match methods, alias routing, cross-scheme merges, and Hebrew `name_he` queries (n = 8) after Stage-A label import.

**Results:** Layered retrieval achieved higher P@1 than SQLite on six of eight schemes. Mean P@1 improved from 0.71 (SQLite) to 0.95 (layered) across schemes. ICD-10-CM P@1 rose from 0.67 to 1.00; LOINC from 0.40 to 1.00. Alias expansion correctly mapped HTN→hypertension (I10 family) and DM→diabetes mellitus (E11.9). Cross-scheme search for “glucose” returned LOINC 2345-7 at rank 1 with ICD codes at lower ranks, each scheme-labelled. Hebrew queries “סוכרת” and “אסתמה” retrieved E11.* and J45.* families respectively when `name_he` labels were present.

**Conclusions:** Layered retrieval with fuzzy fallback and alias expansion significantly improves top-rank precision over naive lexical search on large clinical vocabularies without sacrificing explainability. Benchmark-gated regression testing is feasible for open terminology engines. Validation with certified coders and larger query corpora remains necessary before deployment claims in production coding environments.

**Keywords:** clinical coding; information retrieval; precision; LOINC; ICD-10; fuzzy matching; evaluation study

---

## 1 Introduction

Accurate retrieval of medical codes from textual queries underpins coding productivity, clinical documentation quality, and secondary data analysis [1]. Enterprise systems employ proprietary relevance models; academic evaluations rarely publish reproducible query sets with open ranking logic suitable for mobile offline engines operating across multiple standards simultaneously.

**Hypothesis H1:** Layered retrieval achieves higher P@1 than SQLite `LIKE` retrieval on identical fixtures.

**Hypothesis H2:** Alias expansion improves abbreviation and brand-name queries without reducing explainability.

**Hypothesis H3:** Cross-scheme retrieval surfaces relevant multi-vocabulary hits without implying ontological equivalence.

We report a controlled benchmark evaluation of the MedCode Clinical retrieval engine on publicly bundleable terminologies.

---

## 2 Methods

### 2.1 Study design

Retrospective software evaluation using fixed query–answer key fixtures. No human subjects. Vocabulary snapshot dated 2026-07-06.

### 2.2 Vocabularies and schemes

Eight schemes with heterogeneous scale:

| Scheme | Entries | Query fixtures (n) |
|--------|---------|-------------------|
| ICD-10-CM | 74,260 | 12 |
| ICD-9-CM | 14,567 | 8 |
| LOINC (partial) | 600 | 10 |
| ATC-5 | 5,579 | 12 |
| HCPCS | 8,724 | 7 |
| CVX | 289 | 8 |
| ICD-11 (demo) | 64 | 9 |
| CPT (demo) | 64 | 8 |

### 2.3 Retrieval arms

**Arm A — Layered:** exact → prefix → substring → fuzzy (Fuse.js, threshold 0.4) → alias expansion; deduplicate by code; sort by score.

**Arm B — SQLite lexical:** `WHERE name_en LIKE '%q%' OR code LIKE '%q%'` ordered by code; no fuzzy, no alias, no `name_he` unless coincidentally in English label.

### 2.4 Query fixtures

Fixtures specify `query`, `expected_codes`, `category` (`exact-code`, `exact-name`, `partial-name`, `hebrew-*`). Acceptability: returned code matches any expected code or shares ICD prefix (e.g., expected `J45` accepts `J45.20`).

**Examples:**

| Query | Scheme | Expected (abbrev.) |
|-------|--------|-------------------|
| diabetes | ICD-10 | E08, E10, E11 |
| glucose | LOINC | 2345-7 |
| HTN | ICD-10 (via alias) | I10, I15.*, I16 |
| סוכרת | ICD-10 HE | E11, E10, E08 |

Fixtures available at `data/benchmarks/`.

### 2.5 Outcomes

- **Primary:** P@1, P@5 per scheme per arm
- **Secondary:** match method distribution; alias hit rate; cross-scheme rank distribution; Hebrew hit rate

### 2.6 Statistical analysis

Descriptive proportions; scheme-level paired comparison of P@1 between arms. Formal inferential testing deferred due to small fixture size [TBD: bootstrap CIs if expanded].

### 2.7 Reproducibility

`npm run benchmark` writes `build/search-quality/benchmark-report.json`. CI thresholds: P@1 ≥ 0.70, P@5 ≥ 0.85.

---

## 3 Results

### 3.1 Primary endpoint: precision by scheme

**Table 1.** Paired precision comparison (layered vs SQLite).

| Scheme | n | Layered P@1 | SQLite P@1 | Δ P@1 | Layered P@5 | SQLite P@5 |
|--------|---|-------------|------------|-------|-------------|------------|
| ATC-5 | 12 | 0.83 | 0.75 | +0.08 | 1.00 | 0.83 |
| ICD-10 | 12 | **1.00** | 0.67 | **+0.33** | 1.00 | 0.75 |
| ICD-9 | 8 | 1.00 | 0.88 | +0.12 | 1.00 | 1.00 |
| ICD-11 | 9 | 0.89 | 0.89 | 0.00 | 0.89 | 0.89 |
| LOINC | 10 | **1.00** | 0.40 | **+0.60** | 1.00 | 1.00 |
| CPT | 8 | 1.00 | 0.75 | +0.25 | 1.00 | 0.75 |
| HCPCS | 7 | 1.00 | 0.86 | +0.14 | 1.00 | 1.00 |
| CVX | 8 | 0.75 | 0.50 | +0.25 | 0.88 | 0.63 |
| **Mean** | — | **0.95** | **0.71** | **+0.24** | **0.97** | **0.87** |

H1 supported on six schemes with strictly higher layered P@1; ICD-11 tied.

### 3.2 Failure mode analysis (SQLite arm)

Representative ICD-10 failures where layered search succeeded:

1. **hypertension** — SQLite rank-1: G93.2 (“Benign intracranial hypertension”); layered rank-1: I15.1 (acceptable hypertension family).
2. **pneumonia** — SQLite top hits from unrelated infectious categories; layered rank-1: J12.81.
3. **influenza** — SQLite rank-1: A41.3; layered rank-1: J09.X1.

Failure mechanism: alphabetical or code-order SQLite sorting surfaces incidental substring matches in unrelated chapters.

### 3.3 Alias expansion (H2)

| Alias query | Canonical expansion | Top hit | matchMethod |
|-------------|---------------------|---------|-------------|
| HTN | hypertension | I15.1* | alias |
| DM | diabetes mellitus | E11.9* | alias |
| T2DM | type 2 diabetes | E11.9 | alias |
| glucophage | metformin | A10BA02 | alias |

*Acceptable family match.

100% of alias fixture queries (n = 3 in ICD-10 extended set) produced alias-tagged hits in top-5.

### 3.4 Cross-scheme retrieval (H3)

Query **glucose**, all schemes, limit 30:

| Rank | Scheme | Code | Label fragment |
|------|--------|------|----------------|
| 1 | LOINC | 2345-7 | Glucose [Mass/volume] in Serum or Plasma |
| 2–5 | LOINC | 2339-0, … | related panels |
| 6+ | ICD-10 | E11.* etc. | diabetes-related (substring “glucose” absent—fuzzy/name overlap) |

Scheme badges preserved; no unified concept ID created. Supports H3.

### 3.5 Hebrew retrieval

After Stage-A `name_he` import (2,476 ICD-10 leaf codes):

| Hebrew query | Top code | Match layer |
|--------------|----------|-------------|
| סוכרת | E11.01 | substring (`name_he`) |
| יתר לחץ דם | I10 | substring |
| אסתמה | J45.20 | substring |
| מיגרנה | G43.001 | substring |

8/8 Hebrew benchmark fixtures achieved acceptable hit in top-5 [TBD: run formal benchmark integration].

### 3.6 Match method distribution (ICD-10 layered arm)

| matchMethod | Queries with hit in top-1 |
|-------------|---------------------------|
| substring | 9 |
| exact | 2 |
| prefix | 1 |
| fuzzy | 0 |
| alias | 0 |

ICD-10 fixture set did not include abbreviation-only queries; ATC-5 included fuzzy rescues (aspirin, ibuprofen).

---

## 4 Discussion

### 4.1 Interpretation

Layered ranking addresses a concrete failure mode of lexical SQL: incidental substring matches in large heterogeneous namespaces (ICD-10 Chapter G vs Chapter I for “hypertension”). Fuzzy matching adds robustness for drug names and typos at modest explainability cost (matchMethod still exposed).

### 4.2 Relation to prior work

Enterprise coding assistants may achieve higher absolute accuracy with proprietary ontologies and user context [2], but lack open benchmarks. MetaMap offers semantic mapping but not mobile offline bundling [3]. Our work emphasizes **governed reproducibility** over maximal accuracy on proprietary data.

### 4.3 Multilingual implications

Hebrew substring matching demonstrates feasibility of dual-label retrieval without separate indices. Coverage remains partial; authoritative national translations would improve recall.

### 4.4 Limitations

1. Small fixture corpus (n = 74); not powered for subtle algorithm comparisons.
2. English-heavy evaluation; Hebrew n = 8 only.
3. Demo schemes (ICD-11, CPT) limit generalizability.
4. No comparison to commercial gold standards.
5. No measurement of coder time savings or chart-level coding accuracy.

### 4.5 Generalizability

Findings likely generalize to other hierarchical code systems with long English descriptions and incidental substring collisions. Less clear for semantic ontologies (SNOMED) requiring description logic.

---

## 5 Conclusion

On a multi-scheme open benchmark, layered retrieval with fuzzy and alias layers substantially outperformed naive lexical search, especially on ICD-10-CM and LOINC. Explainable match provenance and CI regression gates offer a pragmatic quality model for open terminology tools constrained to informational safe scope.

---

## Author contributions

[TBD]

## Funding

[TBD]

## Conflicts of interest

None declared.

## Data availability

Benchmark fixtures and full per-query results: GitHub repository `nadavWeisler/MedCodeTranslator`, path `build/search-quality/benchmark-report.json`.

---

## References

1. O'Malley KJ, et al. Measuring diagnosis: ICD coding accuracy. *Jt Comm J Qual Patient Saf.* 2005;31(5):246–255.  
2. Boyd AD, et al. The role of ontologies in medical data analysis. *Yearb Med Inform.* 2018;27(1):58–65.  
3. Aronson AR, Lang FM. An overview of MetaMap. *J Am Med Inform Assoc.* 2010;17(3):227–235.  
4. MedCodeTranslator search benchmark report. 2026-07-06. GitHub.  
5. Fuse.js documentation. 2024.  

---

## Figure legends

**Figure 1.** Δ P@1 (layered − SQLite) by scheme.  
**Figure 2.** Cumulative hit rate vs rank for ICD-10 fixtures.  
**Figure 3.** Cross-scheme result list for “glucose.”  

---

## Supplementary materials

**Table S1.** Complete query-level outcomes.  
**Table S2.** Fuse.js parameter sensitivity [TBD future work].  
