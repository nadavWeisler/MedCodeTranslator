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

## Screenshots

| Mobile — ICD-10 search | Mobile — Hebrew UI | Web — LOINC search |
|---|---|---|
| ![ICD-10](docs/screenshots/mobile-icd10-diabetes.png) | ![Hebrew](docs/screenshots/mobile-atc5-aspirin-he.png) | ![Web](docs/screenshots/web-wide-loinc-glucose.png) |

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

## Repository Layout

```
apps/                     (future: split apps here)
packages/
  core/src/types.ts       Shared TypeScript types (SchemeKey, CodeEntry, ScoredEntry)
  search/src/             Retrieval engine (exact / fuzzy / layered)
  python-client/          Python client (medcodetranslator package)
data/
  vocabularies/           JSON vocabulary files (one per scheme)
  benchmarks/             Benchmark query sets per scheme
  aliases/common.json     Abbreviation / brand-name alias table
app/                      Expo Router screens
  components/             SearchBar, SuggestionItem, SchemeTabs, CodeList, CodeCard
  services/               App-level adapters (fuzzySearch, sourceMetadata, RTL)
db/                       expo-sqlite init + query layer
i18n/                     i18next locale files (9 languages)
scripts/                  Data refresh + validation scripts
agents/                   Autonomous workflow agents (benchmarker, phi-guard, etc.)
benchmarks/               Evaluation scripts
__tests__/                Jest test suites (53 tests)
docs/                     Architecture, API, and retrieval docs
.github/workflows/        CI + deploy pipelines
```

---

## Installation

```bash
# Prerequisites: Node.js 18+, npm
git clone https://github.com/nadavWeisler/MedCodeTranslator.git
cd MedCodeTranslator
npm ci
```

---

## Quick Start

### Run the web app (development)

```bash
npx expo start --web
```

### Run on mobile (Expo Go)

```bash
npx expo start
# Scan QR with Expo Go on iOS or Android
```

### Build static PWA

```bash
npm run build:web
# Output in dist/ — deploy to any static host
```

### Run tests

```bash
npm test
npm run test:coverage
```

### Run benchmarks

```bash
npm run benchmark
```

---

## API Examples

### TypeScript (packages/search)

```typescript
import { layeredSearch } from '@medcode/search';
import type { CodeEntry } from '@medcode/core';

// entries from SQLite or JSON
const results = layeredSearch(entries, 'diabetes', 'icd10', { limit: 10 });

results.forEach(r => {
  console.log(r.code, r.name_en);
  console.log('  score:', r.score, '  via:', r.matchMethod);
  console.log('  highlights:', r.highlights); // [[0,7]] character spans
});
```

### Python (packages/python-client)

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

### Direct database query (Node.js / benchmark scripts)

```javascript
const { sqliteLikeSearch } = require('./agents/search-benchmarker/run_benchmark');
const data = require('./data/vocabularies/icd10.json');

const hits = sqliteLikeSearch(data, 'myocardial');
// Returns entries sorted: code matches first, then alphabetical
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

Run `npm run benchmark` to reproduce. Results written to `build/search-quality/benchmark-report.json`.

| Scheme | Precision@1 | Precision@5 |
|--------|------------|------------|
| ATC-5 | — | — |
| ICD-10 | — | — |
| ICD-11 | — | — |
| LOINC | — | — |
| CVX | — | — |

*Run `npm run benchmark` to populate.*

---

## Roadmap

- [ ] **Alias expansion** — plug `data/aliases/common.json` into retrieval pipeline
- [ ] **BM25 ranking** — `elasticlunr` / `rank-bm25` as an optional 5th layer
- [ ] **Score indicators in UI** — display `matchMethod` badge + score bar per result
- [ ] **Match highlighting** — render character-level highlights in search results
- [ ] **Recent searches** — persist last 10 queries in AsyncStorage/localStorage
- [ ] **Keyboard navigation** — arrow-key selection in web dropdown
- [ ] **Gradio demo** — Hugging Face Space for terminology retrieval playground
- [ ] **Full dataset ingestion** — replace demo subsets with full official releases
- [ ] **Multilingual fuzzy** — extend Fuse.js index to all 9 UI languages
- [ ] **Embeddings layer** — optional `sentence-transformers` semantic search (opt-in)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In brief:

1. Fork and create a feature branch
2. Run `npm test` and ensure all 53 tests pass
3. For data changes, update `data/vocabularies/` and `data/vocabularies/source-metadata.json`
4. For search logic changes, add benchmark queries to `data/benchmarks/`
5. Open a PR against `master`

**Scope constraint:** This project is a retrieval and reference tool. PRs that add diagnosis generation, clinical recommendations, or LLM inference will not be merged. See [docs/SAFE_SCOPE.md](docs/SAFE_SCOPE.md).

---

## Deployment

### GitHub Pages (PWA)

Automatic via `.github/workflows/deploy-pages.yml` on push to `master`.  
Live: [https://nadavweisler.github.io/MedCodeTranslator/](https://nadavweisler.github.io/MedCodeTranslator/)

### EAS (iOS / Android)

```bash
npm install -g eas-cli
eas login
eas build --platform all --profile production
```

See [`eas.json`](eas.json) for build profiles.

### Self-hosted static

```bash
npm run build:web
# Serve the dist/ directory from any static host (Netlify, Vercel, S3, nginx)
```

---

## License

[MIT](LICENSE) — vocabulary data is subject to individual upstream licenses; see [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`DEPENDENCY_LICENSE_AUDIT.md`](DEPENDENCY_LICENSE_AUDIT.md).
