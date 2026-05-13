# Med Code Translator

[![Accessibility review](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml/badge.svg)](https://github.com/nadavWeisler/MedCodeTranslator/actions/workflows/accessibility-review.yml)

Med Code Translator is an Expo app for fast medication and medical terminology code lookup across major coding systems.
It provides bilingual English/Hebrew support, autocomplete, and suggestion-based search across iOS, Android, and Web.

Positioning: medication terminology and code lookup utility for research and administrative workflows.

> **Medical disclaimer:** MedCodeTranslator is an informational reference tool only and is not intended for diagnosis, treatment decisions, prescribing, or medical advice.
>
> Always verify medication information using official clinical systems, licensed medical databases, and institutional procedures.
>
> Do **not** enter patient-identifiable or protected health information (PHI) into this application.

## Deployment Status

- **Web (live):** https://nadavweisler.github.io/MedCodeTranslator/
- **iOS:** EAS build workflow is configured; public deployment is planned
- **Android:** EAS build workflow is configured; public deployment is planned

## What the Product Does

- Search ATC-5, ICD-10, ICD-9-CM, ICD-11, LOINC, and CPT-4
- Match by code or medical term
- Offer autocomplete and fallback suggestions for near matches
- Run from bundled local data for offline-friendly use

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

### Mobile

- `.github/workflows/deploy-mobile.yml` builds iOS and Android apps through Expo Application Services (EAS)
- Supports `development`, `preview`, and `production` build profiles from `eas.json`
- Requires an `EXPO_TOKEN` GitHub Actions secret for authenticated builds

### Web

- Deployed automatically to GitHub Pages from `master` via `.github/workflows/deploy-pages.yml`
- Hosted under the project Pages path `/MedCodeTranslator`

### Accessibility Review

- `.github/workflows/accessibility-review.yml` builds the static web app for each pull request and push to `master`/`main`
- Lighthouse runs an accessibility audit against a Pages-compatible base path and uploads the HTML/JSON report as the `accessibility-review-report` workflow artifact
- The latest workflow status is shown in the badge at the top of this README

## Data Operations

Medical datasets are refreshed through `.github/workflows/refresh-medical-db.yml` or with:

```bash
npm run refresh:data
npm run validate:data
```

## Development

For repository validation:

```bash
npm ci
npx tsc --noEmit
npm run build:web
```

## Contributing

- Use the GitHub issue forms for bug reports, feature requests, and data issues.
- Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) for issue categories, labels, backlog seeding, and triage guidance.

## Branch Protection

- A CI workflow (`.github/workflows/ci.yml`) runs type checking and web build validation on pull requests and pushes.
- The accessibility workflow (`.github/workflows/accessibility-review.yml`) publishes a Lighthouse accessibility review report for pull requests and pushes.
- Standard default-branch protection is defined in `.github/settings.yml`:
  - Require pull requests with at least 1 approval
  - Dismiss stale approvals on new commits
  - Require passing `CI / validate` and `Accessibility Review / audit` status checks
  - Require conversation resolution and linear history
  - Disallow force pushes and branch deletion
