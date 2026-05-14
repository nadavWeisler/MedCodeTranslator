# Med Code Translator

[![Accessibility review](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml/badge.svg)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml)
[![Repo Size](https://img.shields.io/github/repo-size/nadavWeisler/MedCodeTranslator)](https://github.com/nadavWeisler/MedCodeTranslator)
[![Top Language](https://img.shields.io/github/languages/top/nadavWeisler/MedCodeTranslator)](https://github.com/nadavWeisler/MedCodeTranslator)
[![Language Count](https://img.shields.io/github/languages/count/nadavWeisler/MedCodeTranslator)](https://github.com/nadavWeisler/MedCodeTranslator)
[![Stars](https://img.shields.io/github/stars/nadavWeisler/MedCodeTranslator)](https://github.com/nadavWeisler/MedCodeTranslator/stargazers)
[![Forks](https://img.shields.io/github/forks/nadavWeisler/MedCodeTranslator)](https://github.com/nadavWeisler/MedCodeTranslator/network/members)
[![Open Issues](https://img.shields.io/github/issues/nadavWeisler/MedCodeTranslator)](https://github.com/nadavWeisler/MedCodeTranslator/issues)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Made with Expo](https://img.shields.io/badge/Made%20with-Expo-000020.svg?logo=expo)](https://expo.dev/)

Med Code Translator is a cross-platform app (iOS, Android, and Web) for fast medication and medical terminology code lookup across major coding systems.
It supports bilingual English/Hebrew interfaces, autocomplete, and suggestion-based search — making it a practical reference tool for research and administrative workflows.

> **Medical disclaimer:** MedCodeTranslator is an informational reference tool only and is not intended for diagnosis, treatment decisions, prescribing, or medical advice.
>
> Always verify medication information using official clinical systems, licensed medical databases, and institutional procedures.
>
> Do **not** enter patient-identifiable or protected health information (PHI) into this application.

## Availability

| Platform | Status |
|----------|--------|
| **Web** | [Live →](https://nadavweisler.github.io/MedCodeTranslator/) |
| **iOS** | Coming soon |
| **Android** | Coming soon |

## Features

- Search across ATC-5, ICD-10, ICD-9-CM, ICD-11, LOINC, and CPT-4
- Match by code or medical term
- Autocomplete and fallback suggestions for near matches
- Bundled local data for fast, offline-friendly lookups
- Bilingual English / Hebrew UI

## Screenshots

**Mobile · Empty state**

![Mobile empty state](docs/screenshots/mobile-empty.png)

**Mobile · ATC5 search (“aspirin”)**

![ATC5 search](docs/screenshots/mobile-atc5-aspirin.png)

**Mobile · ICD-10 search (“diabetes”)**

![ICD-10 search](docs/screenshots/mobile-icd10-diabetes.png)

**Mobile · Hebrew UI**

![Hebrew UI](docs/screenshots/mobile-atc5-aspirin-he.png)

**Web · Wide layout (LOINC “glucose”)**

![Web wide](docs/screenshots/web-wide-loinc-glucose.png)

## Quick Start

### Prerequisites

- Node.js (18+ recommended)
- npm

### Install

```bash
npm ci
```

### Build (Static Web)

```bash
npm run build:web
```

The static export is generated in `dist/`.

## Deep Links (Web)

On web, you can initialize the app state from query params:

- `scheme`: `atc5 | icd10 | icd9 | icd11 | loinc | cpt`
- `q`: initial search query
- `lang`: `en | he`

Examples:

- `https://nadavweisler.github.io/MedCodeTranslator/?scheme=atc5&q=aspirin&lang=en`
- `https://nadavweisler.github.io/MedCodeTranslator/?scheme=icd10&q=diabetes&lang=en`

## How It Works (High-Level)

- On startup, `db/database.ts` seeds `expo-sqlite` tables from `assets/data/*.json` (and keeps a `schema_version` in the `meta` table).
- Searches are an exact-ish SQLite `LIKE` query (limited to 100 results) via `db/queries.ts`.
- Autocomplete + “did you mean” suggestions are powered by `fuse.js` over an in-memory index per scheme (`app/services/fuzzySearch.ts`).

## Project Structure

- `app/` — screens and UI components (Expo Router)
- `db/` — SQLite schema, seed logic, queries
- `assets/data/` — bundled datasets (JSON)
- `i18n/` — translations and i18next setup

## Legal / Compliance Docs

- `DISCLAIMER.md`
- `TERMS_OF_SERVICE.md`
- `PRIVACY_POLICY.md`
- `DATA_SOURCES.md`
- `DEPENDENCY_LICENSE_AUDIT.md`
- `docs/SAFE_SCOPE.md`
- `docs/API.md`
- `docs/APP_STORE_DESCRIPTION.md`

Web routes are available at `/legal/terms`, `/legal/privacy`, and `/about` (data source attribution + freshness metadata).

## Deployments

### Web

The web app is deployed automatically to GitHub Pages and is available at:
[https://nadavweisler.github.io/MedCodeTranslator/](https://nadavweisler.github.io/MedCodeTranslator/)

### Mobile

iOS and Android builds are managed through [Expo Application Services (EAS)](https://expo.dev/eas).
Public App Store and Google Play releases are planned.

### Accessibility

Every build includes an automated [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) accessibility audit.
The current status is shown in the badge at the top of this README.

## Data

Medical datasets are refreshed periodically. To refresh and validate them locally:

```bash
npm run refresh:data
npm run validate:data
```

## Development

```bash
npm ci
npx tsc --noEmit   # type check
npm run build:web  # build static web export → dist/
```

## Contributing

- Use the GitHub issue forms for bug reports, feature requests, and data issues.
- Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) for issue categories, labels, backlog seeding, and triage guidance.
