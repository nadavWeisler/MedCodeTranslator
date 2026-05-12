# Med Code Translator

Med Code Translator is an Expo application for fast medical code lookup across multiple coding systems, with support for search by code or term, autocomplete, and bilingual English/Hebrew UX.

## Deployment Status

- **Web (live):** https://nadavweisler.github.io/MedCodeTranslator/
- **iOS:** planned future deployment
- **Android:** planned future deployment

## What the Product Does

- Search across ATC5, ICD-10, ICD-9-CM, ICD-11, LOINC, and CPT-4
- Provide autocomplete and fallback suggestions for near matches
- Support English and Hebrew interfaces
- Run from bundled local data for offline-friendly usage

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

## Web Deployment

The web application is deployed automatically to GitHub Pages from the `master` branch through `.github/workflows/deploy-pages.yml`.

## Development

For local work:

```bash
npm ci
npm run build:web
```

## Data Operations

Medical datasets can be refreshed and validated through `.github/workflows/refresh-medical-db.yml` or with:

```bash
npm run refresh:data
npm run validate:data
```

## Disclaimer

This project is intended for lookup convenience and experimentation. Always verify codes and clinical decisions against authoritative medical sources.
