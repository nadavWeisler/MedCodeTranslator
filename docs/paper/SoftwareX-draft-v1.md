# Offline multi-vocabulary medical-code search with transparent lexical ranking

> **Internal author note — strip this blockquote before SoftwareX submission.**
>
> Honesty draft v1.1 for an Original Software Publication (OSP). Intended readers: Nadav Weisler (owner) and DH Skeptic. This file is manuscript text only; it does not change product behavior.
>
> Pin: git tip `e4b8468` on `dev`. Vocab pin `generated_at_utc`: `2026-07-06T05:07:27+00:00`. Held-out report `generated_at`: `2026-09-06T15:33:44.067Z`, seed `20260906`.
>
> **Do not invent metrics.** Every numeric claim below is copied from the verified set for this pin. Do not quote fixture-benchmark Success@k / P@k from `data/benchmarks/` as information-retrieval results.
>
> **Before submit (TBD):** mint a Zenodo reproducible capsule (Table C3) and add `CITATION.cff`. Affiliation / ORCID for Nadav Weisler is also TBD. Replace GitHub URLs in C2 with the Zenodo-archived snapshot of the submitted tag.
>
> Product name vs. claim: “MedCodeTranslator” is the repository and package name. The software searches stored rows inside a selected coding scheme. It is **not** a crosswalk engine and **not** a translation engine. Do not let the name leak into the abstract or highlights as a mapping method.

**Nadav Weisler**  
Correspondence: [weisler.nadav@gmail.com](mailto:weisler.nadav@gmail.com)  
Affiliation: TBD before submission.

## Abstract

MedCodeTranslator is an offline-first lookup application for bundled medical coding vocabularies. Search runs on-device. A layered lexical pipeline—exact, prefix, substring, Fuse.js approximate match, then alias expansion—returns each hit with a numeric score and a `matchMethod` label. The software is not semantic search and is not a crosswalk or translation engine. A held-out known-item evaluation (198 queries; not clinician-judged) compares the pipeline to a SQLite FTS5 lexical baseline on the same vocabulary pin. The informative contrast is `label_typo` (*n*=66)—synthetic single-character deletion of official labels (often concatenated CMS short and long descriptions), not observed user typos: layered mean reciprocal rank 0.9924 versus FTS5 0.0606. ICD-11 is a 64-code demo subset; LOINC is a 600-code partial subset; CPT is not shipped.

**Keywords:** medical terminology lookup; lexical retrieval; offline search; ICD-10-CM; ATC; HCPCS; Fuse.js; SQLite FTS5; original software publication

## Code metadata

**Table 1.** Code metadata (SoftwareX C1–C9).

| Nr. | Code metadata description | Please fill in this column |
| --- | --- | --- |
| C1 | Current code version | Application root package `1.0.0`; reusable engine `@medcode/search` `0.1.0` |
| C2 | Permanent link to code/repository used for this code version | https://github.com/nadavWeisler/MedCodeTranslator (replace with the archived tag URL at submission) |
| C3 | Permanent link to Reproducible Capsule | **TBD** — Zenodo DOI not minted in this draft |
| C4 | Legal Code License | MIT License, Copyright 2026 Nadav Weisler. Bundled vocabularies remain under their upstream terms (see `DATA_SOURCES.md`) |
| C5 | Code versioning system used | git |
| C6 | Software code languages, tools, and services used | TypeScript, JavaScript, Python (data refresh and the FTS5 baseline only); Expo / React Native (iOS, Android, web); `expo-sqlite`; Fuse.js; Node.js (CI pins Node 20) |
| C7 | Compilation requirements, operating environments & dependencies | Node toolchain (`npm ci`); no backend server. Web export: `npm run build:web`. Optional Python 3.9+ for `npm run refresh:data`, `npm run validate:data`, `npm run eval:heldout` (FTS5 arm), and `packages/python-client`. Search itself does not require a network service |
| C8 | If available, Link to developer documentation/manual | https://github.com/nadavWeisler/MedCodeTranslator (README, `docs/architecture.md`, `docs/API.md`, `data/eval/PROTOCOL.md`) |
| C9 | Support email for questions | weisler.nadav@gmail.com |

## 1. Motivation and significance

Looking up a medical code from a label, a fragment, or an approximate string is a common administrative and educational task. Production lookup often sits behind licensed APIs, institutional vocabularies, or hosted browsers. Those tools are appropriate for many clinical-informatics settings. They are not always available offline, and they rarely expose *why* a particular row ranked above another.

MedCodeTranslator packages publicly redistributable snapshots (and two explicit subsets) into an Expo application that seeds an on-device SQLite store and runs search without sending the query to a third party. The engineering claim is packaging and inspectability: a documented lexical stack, a visible score, and a `matchMethod` on every result. The engineering claim is **not** a new ranking theory, **not** embedding-based semantic retrieval, and **not** automated mapping between coding systems.

Hosted terminology services such as the UMLS Terminology Services [6], NCBO BioPortal [7], and OHDSI Athena [8] are related prior art for browsing and, in some deployments, mapping biomedical vocabularies. This manuscript does **not** compare MedCodeTranslator to those systems. They are not CI-reproducible on the pinned JSON files in this repository: Athena is a hosted service; UTS access requires an NLM license. The only external retrieval arm reported here is SQLite FTS5 over the same pin (Section 3).

Significance for a SoftwareX OSP is therefore reuse of a small, inspectable lookup stack: a TypeScript engine (`@medcode/search` 0.1.0), an optional Python client, a GitHub Pages demo, and a committed held-out harness. ICD-11 and LOINC coverage is incomplete by construction (Section 2.3). CPT is not a shipped scheme.

## 2. Software description

### 2.1. Software architecture

The repository is a single offline-first Expo app (React Native and web). There is no application backend and no remote search API. Vocabulary JSON under `data/vocabularies/` is bundled at build time. On first use of a scheme—and after schema upgrades—`expo-sqlite` seeds an on-device database from those files. Web builds use the WASM SQLite path; iOS and Android use the native binding.

Retrieval is scheme-scoped. The UI selects one coding scheme; the engine scores rows from that scheme only. A query that is meaningful in ATC can correctly return no rows under ICD-10-CM.

Shared types live in `packages/core`. The retrieval implementation lives in `packages/search` and is reused by the app adapter `app/services/fuzzySearch.ts`. Python users can point `packages/python-client` at the same JSON directory; that client is a convenience wrapper, not a second ranking algorithm.

Indices are lazy. Selecting a scheme loads its SQLite rows into memory and builds a Fuse.js index once per session. Subsequent queries run the layered pipeline against that cache.

### 2.2. Software functionalities

Search is a five-layer lexical pipeline, in priority order: exact match, prefix match, substring match, Fuse.js approximate match, then alias expansion. Layers are merged and deduplicated by code, keeping the highest score. The returned object is a `ScoredEntry`: the stored `code` and `name_en` (optional `name_he`), a score in \([0, 1]\), a `matchMethod` in `{exact, prefix, substring, fuzzy, alias}`, and optional character-offset highlights in `name_en`.

This is string matching over stored fields. Fuse.js is a client-side fuzzy string matcher, not an embedding model. Alias expansion looks up a local abbreviation/brand table; it does not infer synonyms from a knowledge graph.

The UI shows the score and `matchMethod` on each card. When exact, prefix, and substring layers are empty, a “did you mean” path returns top fuzzy hits. A first-run safety notice states that the tool is informational and is not for diagnosis, treatment, prescribing, or clinical recommendations. Users are told not to enter patient-identifiable data. Those statements are product guardrails, not evidence of a clinician study.

### 2.3. Coverage and licensing honesty

Software is MIT-licensed (Copyright 2026 Nadav Weisler). Vocabulary files are **not** MIT-licensed by implication. Provenance, counts, and upstream terms are recorded in `DATA_SOURCES.md` and `data/vocabularies/source-metadata.json` (pin `generated_at_utc`: `2026-07-06T05:07:27+00:00`).

**Table 2.** Bundled row counts at the vocabulary pin used throughout this draft.

| Scheme | Rows in this pin | Coverage note |
| --- | ---: | --- |
| ATC-1 | 14 | Level-1 snapshot |
| ATC-2 | 90 | Level-2 snapshot |
| ATC-3 | 248 | Level-3 snapshot |
| ATC-4 | 841 | Level-4 snapshot |
| ATC-5 | 5579 | Refreshed snapshot |
| ICD-10-CM | 74260 | Valid-for-coding snapshot |
| ICD-9-CM | 14567 | Historical snapshot |
| ICD-11 | 64 | **Demo subset — not full ICD-11** |
| LOINC | 600 | **Partial subset — not full LOINC** |
| HCPCS Level II | 8724 | Quarterly snapshot |
| CVX | 289 | CDC vaccine-administered codes |

ICD-11 in this repository is a **64-code demo subset**. LOINC in this repository is a **600-code partial subset** (ranked observations imported from a common-panel list, not the full Regenstrief distribution). Do not describe either file as complete.

ATC levels 1–5 are WHOCC ATC/DDD snapshots: WHOCC terms require attribution and preservation of source context; do not redistribute beyond those terms without review, and verify the latest commercial/redistribution terms (`DATA_SOURCES.md`).

**CPT is not shipped as a scheme.** Official AMA CPT descriptors are not redistributed. The HCPCS Level II snapshot still contains ten official CMS `name_en` strings that mention CPT codes. Those strings are **upstream CMS text**, not an AMA CPT vocabulary. They are not scrubbed. The ten HCPCS codes are:

G0316, G0317, G0318, G2212, M1483, M1485, S1030, S1031, S8055, S9123.

Full CMS wording for those rows is listed in `DATA_SOURCES.md`. Restricted sources that are **not** bundled include AMA CPT as a scheme, SNOMED CT, and several commercial drug-knowledge bases.

## 3. Illustrative examples

A public web demo is at https://nadavweisler.github.io/MedCodeTranslator/. After dismissing the safety notice, a user picks a scheme tab, types a code or a label fragment, and reads the score and `matchMethod` on each row. First access to a scheme may show a short “Loading …” state while SQLite is seeded; that delay is expected.

Programmatic use of the same engine:

```typescript
import { layeredSearch } from '@medcode/search';
import type { ScoredEntry } from '@medcode/core';

const results: ScoredEntry[] = layeredSearch(entries, 'diabetes', 'icd10', { limit: 10 });

for (const r of results) {
  console.log(r.code, r.name_en, r.score, r.matchMethod);
}
```

The remainder of this section is the committed held-out evaluation, not a walkthrough of clinician workflow.

### 3.1. Held-out protocol (known-item, not clinician-judged)

Published retrieval numbers come from `npm run eval:heldout` and `data/eval/heldout-report.json` (`generated_at`: `2026-09-06T15:33:44.067Z`). The protocol is `data/eval/PROTOCOL.md`.

The task is **known-item lexical lookup**: a query is derived from a vocabulary row; a hit is that row’s code (and any other row with the identical official English name). Queries are not clinician-authored. Relevance is not clinician-judged. Graded clinical relevance and user studies are out of scope.

The generator loads the pinned vocabularies, **drops ICD-11** (the 64-row demo subset), excludes labels/codes that appear in UI demo chips or hand-written fixture files, drops generic labels, shuffles with Mulberry32 seed `20260906`, and assigns 198 queries in round-robin across three types (66 each): `official_label` (full `name_en`), `label_typo` (synthetic single-character deletion of official `name_en`, often concatenated CMS short+long descriptions; not an observed user typo), and `exact_code`. Regenerating with the same seed and the same pin must reproduce the committed query file.

Two systems are scored on that file, both against the same JSON pin:

1. **layered** — in-repository exact → prefix → substring → Fuse.js → alias.
2. **fts5** — SQLite **3.45.1**, FTS5 tokenizer `unicode61` with `remove_diacritics 1`, ordered by FTS5 `rank`, implemented in `scripts/fts5_baseline.py` with the Python standard-library `sqlite3` module.

FTS5 is a **CI-reproducible lexical baseline** on the same vocabulary pin. It is not Athena, not UTS/UMLS, not a clinical IR benchmark, and not a state-of-the-art claim. No hosted terminology service is part of this comparison.

Metrics are defined in the protocol. **Success@k** is 1 if any relevant code appears in the top *k* (hit rate). **P@k** is true precision, \(|\text{relevant} \cap \text{top-}k| / k\). Success@k must not be called precision. With typically one relevant code, P@5 cannot approach 1.0 even when Success@5 is 1.0. Cutoff is 10.

Hand-written queries in `data/benchmarks/` remain a CI smoke gate. They are **not** the published evaluation and are not quoted here.

### 3.2. `label_typo` is the informative slice

Exact official labels and exact codes are solved by both systems. Those two types therefore inflate any macro average. The slice that can distinguish a pipeline with a fuzzy layer from FTS5 is `label_typo`.

**Table 3.** Known-item mean reciprocal rank by query type (66 queries each). Report this table before any macro average.

| Query type | *n* | Layered MRR | FTS5 MRR |
| --- | ---: | ---: | ---: |
| `label_typo` | 66 | 0.9924 | 0.0606 |
| `official_label` | 66 | 1.0000 | 1.0000 |
| `exact_code` | 66 | 1.0000 | 1.0000 |

On `label_typo` queries, layered MRR is 0.9924 and FTS5 MRR is 0.0606. On `official_label` and `exact_code`, both systems score 1.0000. That pattern matches the implementations: FTS5 as configured here has no fuzzy layer; exact strings are in both indexes.

This draft does not report a clinician preference study, a diagnostic accuracy study, or an inter-rater agreement statistic. Table 3 is known-item rank of a generator-defined target row.

### 3.3. Macro scores are secondary

Macro averages over all 198 queries are dominated by the 132 exact label and exact code queries. They are reported for completeness, with **Success@5** as the hit-rate column of interest. Macro MRR is secondary known-item evidence.

**Table 4.** Macro known-item scores on the full 198-query held-out set (secondary to Table 3).

| System | Success@5 | P@1 | P@5 | MRR | nDCG@5 | nDCG@10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| layered | 1.0000 | 0.9949 | 0.2071 | 0.9975 | 0.9981 | 0.9981 |
| FTS5 | 0.6869 | 0.6869 | 0.1434 | 0.6869 | 0.6869 | 0.6869 |

Layered Success@5 is 1.0000; FTS5 Success@5 is 0.6869. Layered P@5 is 0.2071; FTS5 P@5 is 0.1434. The P@5 values are true precision under a small relevant set; they are not a failure of Success@5. Layered macro MRR (0.9975) should not be presented as the headline empirical result: two-thirds of the queries are exact lookups on which both systems already score 1.0000 (Table 3).

FTS5 MRR, nDCG@5, nDCG@10, P@1, and Success@5 are the same number (0.6869) in this report. That equality is consistent with a first-hit-or-miss pattern on this known-item set; it is not interpreted here as a clinical ranking quality score.

## 4. Impact

The practical contribution is a redistributable, offline lookup package with transparent lexical ranking and a committed evaluation recipe. Researchers and developers can run the web demo, import `@medcode/search`, or point the Python client at the bundled JSON. The held-out file, protocol, and FTS5 script live in-tree so the lexical comparison can be replayed in CI without third-party credentials.

**Explicit non-claims.** This software does not perform semantic search. It does not translate between coding systems and is not a crosswalk engine. It does not ship CPT. ICD-11 and LOINC are incomplete subsets (64 demo codes and 600 partial codes, respectively). The FTS5 numbers are a same-pin lexical baseline, not a comparison to Athena, UTS, or any clinical IR leaderboard, and not a state-of-the-art claim. No clinician study is reported. The tool must not be used for diagnosis, treatment, prescribing, or patient-specific advice (`docs/SAFE_SCOPE.md`).

Impact that would require evidence this draft does not have—deployment counts, time-and-motion savings, coding-accuracy gains, or diagnostic utility—is omitted.

## 5. Conclusions

MedCodeTranslator is an offline multi-vocabulary medical-code search application with transparent lexical ranking. The shipped pipeline is exact, prefix, substring, Fuse.js, then alias expansion, with score and `matchMethod` exposed on every hit. A held-out known-item harness (198 queries, seed `20260906`; ICD-11 dropped; not clinician-judged) shows that the fuzzy layer matters on `label_typo` (layered MRR 0.9924 vs FTS5 0.0606, *n*=66), while exact labels and exact codes are solved by both the layered engine and the SQLite FTS5 baseline. Macro Success@5 is 1.0000 (layered) versus 0.6869 (FTS5); those macro figures are secondary. Coverage honesty is part of the software description: ICD-11 is a 64-code demo subset, LOINC is a 600-code partial subset, and CPT is not a shipped scheme. Before journal submission, a Zenodo capsule and `CITATION.cff` remain to be added.

## Acknowledgements

TBD before submission. Thank reviewers of this internal draft (DH Skeptic) in the submitted version only if they consent to be named. Funding: none to declare unless updated.

## References

1. Weisler, N., 2026. *MedCodeTranslator* (version 1.0.0). GitHub. https://github.com/nadavWeisler/MedCodeTranslator (accessed 2026-09-07). Demo: https://nadavweisler.github.io/MedCodeTranslator/.
2. MedCodeTranslator contributors, 2026. Held-out IR evaluation protocol. `data/eval/PROTOCOL.md` in [1].
3. MedCodeTranslator contributors, 2026. Data sources and licensing notes. `DATA_SOURCES.md` in [1].
4. Fuse.js (fuzzy-search library used for the approximate-match layer). https://www.fusejs.io/ ; source: https://github.com/krisk/fuse (accessed 2026-09-07).
5. Hipp, D.R. SQLite FTS5 Extension. https://www.sqlite.org/fts5.html (accessed 2026-09-07). Baseline in this repo uses SQLite 3.45.1, tokenizer `unicode61` with `remove_diacritics 1`.
6. Bodenreider, O., 2004. The Unified Medical Language System (UMLS): integrating biomedical terminology. *Nucleic Acids Research* 32, D267–D270.
7. Noy, N.F., et al., 2009. BioPortal: ontologies and integrated data resources at the click of a mouse. *Nucleic Acids Research* 37, W170–W173.
8. Observational Health Data Sciences and Informatics (OHDSI). Athena. https://athena.ohdsi.org/ (accessed 2026-09-07).

## Appendix A. Honesty checklist (internal — strip or move to a cover letter)

Use this list in review. If any box cannot be ticked, the manuscript is not ready.

- [x] Title is the packaging claim: offline multi-vocabulary medical-code search with transparent lexical ranking.
- [x] Abstract and §3 lead empirics with `label_typo` (*n*=66, layered MRR 0.9924 vs FTS5 0.0606) and treat Success@k as the macro hit-rate (layered Success@5 1.0000 vs FTS5 0.6869).
- [x] Macro MRR (0.9975 layered / 0.6869 FTS5) is labeled **secondary** known-item evidence driven by `official_label` and `exact_code` (both 1.0000 on both systems).
- [x] P@5 is true precision (layered 0.2071 / FTS5 0.1434) and is not called Success@k.
- [x] FTS5 is described only as a CI-reproducible lexical baseline on the same vocab pin (SQLite 3.45.1; `unicode61` `remove_diacritics 1`). No Athena, UTS, SOTA, or clinical-IR claim.
- [x] Not semantic search. Fuse.js is named as approximate string matching.
- [x] Not a crosswalk / translation engine, despite the repository name.
- [x] ICD-11 = 64-code demo subset; dropped from the held-out eval.
- [x] LOINC = 600-code partial subset.
- [x] CPT is not a shipped scheme. Ten CMS HCPCS Level II `name_en` strings that mention CPT are disclosed: G0316, G0317, G0318, G2212, M1483, M1485, S1030, S1031, S8055, S9123 (upstream CMS text, not AMA CPT redistributed).
- [x] No clinician study, no diagnostic-accuracy claim, no user-study claim. Known-item protocol cited.
- [x] Numeric claims limited to the verified set for pin `2026-07-06T05:07:27+00:00` and report `2026-09-06T15:33:44.067Z` (198 queries, seed `20260906`).
- [x] Fixture `data/benchmarks/` numbers are not quoted as IR results.
- [x] C3 Zenodo capsule and `CITATION.cff` marked TBD.
- [x] Support email is weisler.nadav@gmail.com; license MIT, Copyright 2026 Nadav Weisler.
- [x] Root package 1.0.0; `@medcode/search` 0.1.0.
- [x] Related-work citations for UMLS / BioPortal / Athena appear in References as prior art, not bake-off arms.
- [x] `label_typo` is described as synthetic single-character deletion of official (often CMS short+long) strings, not as misspelling or observed user typos.
- [x] ATC/WHOCC redistribution terms are stated next to the CPT/LOINC coverage honesty in §2.3.
