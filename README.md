# MedCodeTranslator

[![CI](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml/badge.svg)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml)
[![Tests](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml/badge.svg?label=tests)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml)
[![Accessibility review](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml/badge.svg)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-production-brightgreen)](https://nadavweisler.github.io/MedCodeTranslator/)

**Offline multi-vocabulary medical-code search with transparent ranking.**

The useful part is packaging, on-device search, and a visible score — not a new mapping method, and not semantic retrieval.

[Production Demo](https://nadavweisler.github.io/MedCodeTranslator/) · [API Docs](docs/API.md) · [Architecture](docs/architecture.md) · [Contributing](CONTRIBUTING.md)

---

## Problem Statement

Biomedical terminology is fragmented across incompatible standards — ICD-10, ATC, LOINC, and others. Looking up a code across systems often requires licensed tools, proprietary APIs, or one-off scripts.

MedCodeTranslator is an **offline-capable, open-source search app** over bundled vocabularies. It does not send queries to a third party. It is **not** a crosswalk engine: it searches stored entries and shows how each hit ranked.

> **Medical disclaimer:** This is an informational reference tool only.
> Not for diagnosis, treatment decisions, prescribing, or clinical recommendations.
> Never enter patient-identifiable (PHI) data.

---

## Why This Exists

| Problem | This project |
|---------|-------------|
| Terminology lookup requires costly licensed APIs | Bundled offline-capable datasets |
| Black-box matching — no explanation of why a result matched | Transparent scoring + `matchMethod` label per result |
| Mobile/offline-unfriendly tools | React Native app, SQLite on-device |
| Hard to inspect ranking | Layered lexical search (exact → prefix → substring → Fuse.js fuzzy) |
| No programmatic access | Shared TypeScript + Python packages |

---

## Features

- **Layered lexical retrieval** — exact → prefix → substring → fuzzy (Fuse.js), with per-result score and `matchMethod`
- **11 coding schemes** — ATC-1, ATC-2, ATC-3, ATC-4, ATC-5, ICD-10, ICD-9-CM, ICD-11 (subset), LOINC (subset), HCPCS, CVX
- **Offline-first** — SQLite on-device via expo-sqlite; no network calls for search
- **Transparent ranking** — every result exposes its score (0–1) and how it was matched
- **Match highlighting** — character-level match spans returned for all result types
- **Did you mean** — fuzzy fallback suggestions when no exact/substring result found
- **Multilingual UI** — English, Hebrew (RTL), Spanish, French, Portuguese, Russian, Chinese, German, Arabic
- **Cross-platform** — iOS, Android, Web (PWA via GitHub Pages)
- **Reusable packages** — `packages/search/` (TypeScript) + `packages/python-client/` (Python)
- **Fixture regression gate** — `npm run benchmark` checks hand-written queries; it is not a held-out IR evaluation

---

## Supported Terminologies

Counts are the bundled files in this repo (see [`data/vocabularies/source-metadata.json`](data/vocabularies/source-metadata.json)).

| Scheme | Authority | Coverage in this repo |
|--------|-----------|------------------------|
| **ATC-1** | WHO/WHOCC | 14 codes (full level-1 snapshot) |
| **ATC-2** | WHO/WHOCC | 90 codes (full level-2 snapshot) |
| **ATC-3** | WHO/WHOCC | 248 codes (full level-3 snapshot) |
| **ATC-4** | WHO/WHOCC | 841 codes (full level-4 snapshot) |
| **ATC-5** | WHOCC | 5,579 codes (refreshed snapshot) |
| **ICD-10** | CMS / WHO | 74,260 ICD-10-CM codes (valid-for-coding snapshot) |
| **ICD-9-CM** | NBER / CMS (historical) | 14,567 codes (historical snapshot) |
| **ICD-11** | WHO | **64-code curated subset** — not full ICD-11 |
| **LOINC** | Regenstrief Institute | **600-code common-panel subset** — not full LOINC |
| **HCPCS** | CMS | 8,724 Level II codes (quarterly snapshot) |
| **CVX** | CDC | 289 vaccine codes |

Data files live in [`data/vocabularies/`](data/vocabularies/). See [`DATA_SOURCES.md`](DATA_SOURCES.md) for provenance.

> Public vocabularies such as ATC, ICD-9-CM, ICD-10-CM, HCPCS, and CVX are bundled from source refreshes. ICD-11 and LOINC are **explicit subsets** (64 and 600 rows). See [`scripts/fetch_public_vocabularies.py`](scripts/fetch_public_vocabularies.py).

---

## Screenshots

| Mobile — ICD-10 search | Mobile — Hebrew UI | Web — LOINC search |
|---|---|---|
| ![ICD-10](docs/screenshots/mobile-icd10-diabetes.png) | ![Hebrew](docs/screenshots/mobile-atc5-aspirin-he.png) | ![Web](docs/screenshots/web-wide-loinc-glucose.png) |

---

## Search Architecture

```
User query
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                   Layered Retrieval                      │
│                                                          │
│  1. Exact match        score = 1.000  matchMethod=exact  │
│  2. Prefix match       score = 0.900  matchMethod=prefix │
│  3. Substring match    score = 0.700  matchMethod=substr │
│  4. Fuzzy (Fuse.js)    score = 0–0.65 matchMethod=fuzzy  │
│  5. Alias expansion    score = parent matchMethod=alias  │
│                                                          │
│  → deduplicate by code (keep highest score)              │
│  → sort descending by score                              │
│  → return ScoredEntry[] with highlights[]                │
└─────────────────────────────────────────────────────────┘
    │
    ▼
SQLite (expo-sqlite)  ←→  Fuse.js in-memory index
```

This is lexical / string matching, not embedding-based semantic search.

All retrieval logic lives in [`packages/search/src/`](packages/search/src/):

| File | Responsibility |
|------|---------------|
| `exact.ts` | Exact, prefix, substring match + highlight spans |
| `fuzzy.ts` | Fuse.js index management + inverted score mapping |
| `layered.ts` | Merge + deduplicate across all layers |

---

## API Examples

### TypeScript (`packages/search`)

```typescript
import { layeredSearch } from '@medcode/search';
import type { ScoredEntry } from '@medcode/core';

const results = layeredSearch(entries, 'diabetes', 'icd10', { limit: 10 });

results.forEach((r: ScoredEntry) => {
  console.log(r.code, r.name_en);
  console.log('  score:', r.score, '  via:', r.matchMethod);
  console.log('  highlights:', r.highlights); // [[0, 7]] character spans
});
```

### Python (`packages/python-client`)

```python
from medcodetranslator import MedCodeTranslator

client = MedCodeTranslator()
results = client.search('icd10', 'diabetes', fuzzy=True, limit=5)

for r in results:
    print(f"{r.code}  {r.name_en:<45}  score={r.score:.3f}  via={r.match_method}")
```

```
E11  Type 2 diabetes mellitus                         score=1.000  via=substring
E10  Type 1 diabetes mellitus                         score=1.000  via=substring
E13  Other specified diabetes mellitus                score=1.000  via=substring
```

---

## Retrieval Methods

| Method | When it fires | Score range | Explainability |
|--------|--------------|-------------|----------------|
| Exact | Query === code or name (case-insensitive) | 1.0 | ✅ |
| Prefix | Query is a leading substring | 0.9 | ✅ |
| Substring | Query appears anywhere in code/name | 0.70–0.75 | ✅ |
| Fuzzy (Fuse.js) | No exact/prefix/substring match | 0–0.65 | ✅ score shown |
| Alias | Query matches synonym/abbreviation table | parent score | ✅ |

Results always include:
- `score` — normalised relevance in `[0, 1]`
- `matchMethod` — which layer produced the result
- `highlights` — `[start, end]` character ranges in `name_en`

---

## Fixture regression (not a published IR eval)

`npm run benchmark` runs **hand-written** queries in [`data/benchmarks/`](data/benchmarks/) as a CI regression gate (default thresholds P@1 ≥ 70%, P@5 ≥ 85%). Those fixtures are not a held-out information-retrieval evaluation and should not be read as near-perfect retrieval quality.

---

## Repository Layout

```
packages/
  core/src/types.ts       Shared TypeScript types (SchemeKey, CodeEntry, ScoredEntry)
  search/src/             Retrieval engine (exact / fuzzy / layered)
  python-client/          Python client (medcodetranslator package)
data/
  vocabularies/           JSON vocabulary files (one per scheme)
  benchmarks/             Hand-written fixture query sets per scheme
  aliases/common.json     Abbreviation / brand-name alias table
app/                      Expo Router screens + components
db/                       expo-sqlite init + query layer
i18n/                     i18next locale files (9 languages)
docs/                     Architecture, API, retrieval, and ops runbooks
.github/workflows/        CI + deploy pipelines
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In brief:

1. Fork and create a feature branch
2. Run `npm test` and `npm run benchmark` — tests and fixture gates must pass
3. For data changes, update `data/vocabularies/` and `data/vocabularies/source-metadata.json`
4. For search logic changes, add fixture queries to `data/benchmarks/`
5. Open a PR against `dev`

**Scope constraint:** This project is a retrieval and reference tool. PRs that add diagnosis generation, clinical recommendations, or LLM inference will not be merged. See [docs/SAFE_SCOPE.md](docs/SAFE_SCOPE.md).

---

## Deployment

Production PWA: [https://nadavweisler.github.io/MedCodeTranslator/](https://nadavweisler.github.io/MedCodeTranslator/) — built from `dev`.

---

## License

[MIT](LICENSE) — vocabulary data is subject to individual upstream licenses; see [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`DEPENDENCY_LICENSE_AUDIT.md`](DEPENDENCY_LICENSE_AUDIT.md).
