# MedCodeTranslator

[![CI](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml/badge.svg)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml)
[![Tests](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml/badge.svg?label=tests)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/ci.yml)
[![Accessibility review](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml/badge.svg)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Made with Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)](https://expo.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://nadavweisler.github.io/MedCodeTranslator/)

**Open-source biomedical terminology retrieval and semantic search infrastructure.**

[Live Demo](https://nadavweisler.github.io/MedCodeTranslator/) · [API Docs](docs/API.md) · [Architecture](docs/architecture.md) · [Contributing](CONTRIBUTING.md)

---

## Problem Statement

Biomedical terminology is fragmented across a dozen incompatible standards — ICD-10, ATC, LOINC, CPT, and more. Looking up a code across systems requires expensive licensed tools, proprietary APIs, or brittle scripts.

MedCodeTranslator is a **transparent, offline-capable, open-source retrieval engine** that works across all major coding schemes without sending data to a third party.

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
| Hard to reproduce or evaluate search quality | Benchmark suite with precision@1, precision@5, MRR |
| No programmatic access | Shared TypeScript + Python packages |

---

## Features

- **Layered retrieval** — exact → prefix → substring → fuzzy, with per-result score and `matchMethod`
- **8 medical code schemes** — ATC-5, ICD-10, ICD-9-CM, ICD-11, LOINC, CPT, HCPCS, CVX
- **Offline-first** — SQLite on-device via expo-sqlite; no network calls for search
- **Transparent ranking** — every result exposes its score (0–1) and how it was matched
- **Match highlighting** — character-level match spans returned for all result types
- **Did you mean** — fuzzy fallback suggestions when no exact/substring result found
- **Multilingual UI** — English, Hebrew (RTL), Spanish, French, Portuguese, Russian, Chinese, German, Arabic
- **Cross-platform** — iOS, Android, Web (PWA via GitHub Pages)
- **Reusable packages** — `packages/search/` (TypeScript) + `packages/python-client/` (Python)
- **Benchmark suite** — reproducible evaluation with precision@1, precision@5, MRR per scheme

---

## Supported Terminologies

| Scheme | Authority | Coverage |
|--------|-----------|----------|
| **ATC-5** | WHO Collaborating Centre (WHOCC) | Drug classification (level 5) |
| **ICD-10** | CMS / WHO | Diagnosis codes |
| **ICD-9-CM** | NBER / CMS (historical) | Legacy diagnosis codes |
| **ICD-11** | WHO | Latest international classification |
| **LOINC** | Regenstrief Institute | Lab & clinical observations |
| **CPT** | Curated demo subset | Procedure codes |
| **HCPCS** | CMS | Supplies & non-physician services |
| **CVX** | CDC | Vaccine codes |

Data files live in [`data/vocabularies/`](data/vocabularies/). See [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`data/vocabularies/source-metadata.json`](data/vocabularies/source-metadata.json) for provenance.

> **Note:** Bundled datasets are curated demo subsets. For production use, replace with full official releases — see [`scripts/refresh_medical_db.py`](scripts/refresh_medical_db.py).

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

## Benchmark Results

| Scheme | Precision@1 | Precision@5 |
|--------|------------|------------|
| ATC-5 | — | — |
| ICD-10 | — | — |
| ICD-11 | — | — |
| LOINC | — | — |
| CVX | — | — |

*See [`data/benchmarks/`](data/benchmarks/) for query sets and evaluation methodology.*

---

## Repository Layout

```
packages/
  core/src/types.ts       Shared TypeScript types (SchemeKey, CodeEntry, ScoredEntry)
  search/src/             Retrieval engine (exact / fuzzy / layered)
  python-client/          Python client (medcodetranslator package)
data/
  vocabularies/           JSON vocabulary files (one per scheme)
  benchmarks/             Benchmark query sets per scheme
  aliases/common.json     Abbreviation / brand-name alias table
app/                      Expo Router screens + components
db/                       expo-sqlite init + query layer
i18n/                     i18next locale files (9 languages)
docs/                     Architecture, API, and retrieval docs
.github/workflows/        CI + deploy pipelines
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In brief:

1. Fork and create a feature branch
2. Run `npm test` and ensure all 54 tests pass
3. For data changes, update `data/vocabularies/` and `data/vocabularies/source-metadata.json`
4. For search logic changes, add benchmark queries to `data/benchmarks/`
5. Open a PR against `master`

**Scope constraint:** This project is a retrieval and reference tool. PRs that add diagnosis generation, clinical recommendations, or LLM inference will not be merged. See [docs/SAFE_SCOPE.md](docs/SAFE_SCOPE.md).

---

## Deployment

Live PWA: [https://nadavweisler.github.io/MedCodeTranslator/](https://nadavweisler.github.io/MedCodeTranslator/) — auto-deployed on every push to `master`.

For iOS / Android builds via EAS, see [`eas.json`](eas.json).

---

## License

[MIT](LICENSE) — vocabulary data is subject to individual upstream licenses; see [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`DEPENDENCY_LICENSE_AUDIT.md`](DEPENDENCY_LICENSE_AUDIT.md).
