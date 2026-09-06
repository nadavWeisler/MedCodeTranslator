# Architecture

## Overview

MedCodeTranslator is a cross-platform (iOS / Android / Web) biomedical terminology retrieval app built on Expo + React Native. All search runs **entirely on-device** — no external API calls, no data leaves the device.

```
┌────────────────────────────────────────────────────────────────┐
│                        User Interface                          │
│  SearchBar → SuggestionItem  |  SchemeTabs  |  CodeCard        │
└────────────────────┬───────────────────────────────────────────┘
                     │ query + scheme
                     ▼
┌────────────────────────────────────────────────────────────────┐
│               app/services/fuzzySearch.ts                      │
│  (app-level adapter — bridges UI ↔ packages/search)            │
│  • buildIndex(scheme) — loads SQLite entries + builds Fuse.js  │
│  • search(query, scheme) → ScoredEntry[]                       │
│  • getSuggestions(query, scheme) → ScoredEntry[]               │
│  • getDidYouMean(query, scheme) → ScoredEntry[]                │
└────────────────────┬───────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌─────────────────────────────────────────┐
│  packages/search │   │  db/ (expo-sqlite)                      │
│                  │   │                                         │
│  layered.ts      │◄──│  database.ts — initDB(), seedAll()      │
│  exact.ts        │   │  queries.ts — searchByScheme() (SQL)    │
│  fuzzy.ts        │   └─────────────────────────────────────────┘
└──────────────────┘             ▲
          │                      │
          ▼                      │ seeds from JSON on first launch
┌──────────────────┐   ┌─────────────────────────────────────────┐
│  packages/core   │   │  data/vocabularies/                     │
│  types.ts        │   │  atc5.json, icd10.json, loinc.json ...  │
│  (ScoredEntry,   │   │  source-metadata.json                   │
│   CodeEntry,     │   └─────────────────────────────────────────┘
│   SchemeKey …)   │
└──────────────────┘
```

---

## Directory Structure

| Path | Purpose |
|------|---------|
| `app/` | Expo Router screens and React Native components |
| `app/components/` | SearchBar, CodeCard, CodeList, SchemeTabs, SuggestionItem |
| `app/services/` | App-level adapters: fuzzySearch, RTL, sourceMetadata |
| `db/` | expo-sqlite init (`database.ts`) and query layer (`queries.ts`) |
| `packages/core/` | Shared TypeScript types (SchemeKey, CodeEntry, ScoredEntry) |
| `packages/search/` | Platform-agnostic retrieval engine |
| `packages/python-client/` | Python `medcodetranslator` package |
| `data/vocabularies/` | Bundled JSON vocabulary files (one per scheme) |
| `data/eval/` | Held-out IR query set and committed harness report |
| `data/benchmarks/` | Hand-written fixture query sets (CI smoke only) |
| `data/aliases/` | Abbreviation/brand-name alias table |
| `i18n/` | i18next locale files (9 languages) |
| `scripts/` | Data refresh (`refresh_medical_db.py`) and fetch scripts |
| `agents/` | Autonomous CI workflow agents (benchmarker, phi-guard, etc.) |
| `__tests__/` | Jest test suites |
| `.github/workflows/` | CI + deploy pipelines |

---

## Search Pipeline

### Layered Retrieval (packages/search/src/layered.ts)

All searches run through a **4-layer pipeline** in priority order:

```
query
  │
  ├─► 1. Exact match     (score=1.00)  code or name_en === query (case-insensitive)
  ├─► 2. Prefix match    (score=0.90)  starts-with on code or name_en
  ├─► 3. Substring match (score=0.70)  query appears anywhere (SQL LIKE equivalent)
  └─► 4. Fuzzy match     (score=0–0.65) Fuse.js approximate match
            │
            ▼
       Merge & deduplicate by code (keep highest score)
            │
            ▼
       Sort descending by score → return ScoredEntry[]
```

Each `ScoredEntry` includes:
- `score` — normalised relevance in `[0, 1]`
- `matchMethod` — which layer produced the result (`'exact'|'prefix'|'substring'|'fuzzy'|'alias'`)
- `highlights` — `[start, end]` character index pairs in `name_en` for UI highlighting

### Index Lifecycle

```
Scheme selected
    └─► buildIndex(scheme)
            ├─► getAllEntries(scheme) — SQLite SELECT *
            ├─► entryCache.set(scheme, entries)
            └─► buildFuseIndex(scheme, entries)

Query changes
    └─► search(query, scheme)
            └─► layeredSearch(entryCache.get(scheme), query, scheme)
```

Fuse.js indices are built **lazily** (first query per scheme) and cached for the session.

---

## Data Flow

```
data/vocabularies/*.json
        │ (bundled at build time)
        ▼
db/database.ts → initDB() → SQLite (on-device)
        │ (seeds on first launch or schema upgrade)
        ▼
getAllEntries(scheme) ← called once per scheme per session
        │
        ▼
entryCache (in-memory) + Fuse.js index
        │
        ▼
layeredSearch() → ScoredEntry[] → UI
```

On **web**, expo-sqlite uses WASM (wa-sqlite). On **iOS/Android**, it uses the native SQLite binding.

---

## Component Hierarchy

```
HomeScreen (app/index.tsx)
├── SchemeTabs          — 8 scheme selector tabs
├── SearchBar           — text input + suggestion dropdown
│   └── SuggestionItem  — individual autocomplete result (×n)
├── CodeList            — results list or empty/no-results state
│   └── CodeCard        — individual result card with score badge
└── Modal               — disclaimer / language selector
```

### Key State (HomeScreen)

| State | Type | Purpose |
|-------|------|---------|
| `query` | `string` | Current search text |
| `results` | `ScoredEntry[]` | Main search results |
| `suggestions` | `ScoredEntry[]` | Autocomplete dropdown items |
| `didYouMean` | `ScoredEntry[]` | Fallback when results empty |
| `recentSearches` | `string[]` | Persisted in AsyncStorage |
| `scheme` | `SchemeKey` | Active terminology scheme |
| `lang` | `Language` | Active UI language |

---

## i18n

- Uses `react-i18next` with locale files in `i18n/locales/`
- Supported: `en`, `he` (RTL), `es`, `fr`, `de`, `ar` (RTL), `pt`, `zh`, `ru`
- RTL detection via `app/services/rtl.ts` — affects layout direction in SearchBar, SuggestionItem, CodeCard

---

## Build & Deployment

| Target | Command | Output |
|--------|---------|--------|
| Web (PWA) | `npm run build:web` | `dist/` static files |
| iOS | `eas build --platform ios` | IPA via EAS |
| Android | `eas build --platform android` | AAB via EAS |
| GitHub Pages | Auto via `.github/workflows/deploy-pages.yml` | Live PWA |

---

## Testing

```
__tests__/
├── fuzzySearch.test.ts    — layered search service (8 tests)
├── rtl.test.ts            — RTL detection (6 tests)
├── queries.test.ts        — SQLite query layer with mocked DB (6 tests)
├── SearchBar.test.tsx     — SearchBar component (11 tests)
├── SuggestionItem.test.tsx — SuggestionItem component (6 tests)
├── SchemeTabs.test.tsx    — SchemeTabs component (8 tests)
└── CodeList.test.tsx      — CodeList component (8 tests)
```

Run: `npm test`

---

## Adding a New Terminology Scheme

1. Add JSON file to `data/vocabularies/<scheme>.json` (`[{code, name_en, name_he?}]`)
2. Add the scheme key to `packages/core/src/types.ts` → `SchemeKey` union
3. Add `CREATE TABLE` + seed call in `db/database.ts` (bump `SCHEMA_VERSION`)
4. Add tab entry in `app/components/SchemeTabs.tsx` → `SCHEMES` array
5. Add fixture-smoke queries to `data/benchmarks/<scheme>.json` only if you need a CI canary — published IR numbers come from `npm run eval:heldout`
6. Update `data/vocabularies/source-metadata.json` with provenance info
7. If the scheme is in the held-out harness quota, regenerate `data/eval/`
