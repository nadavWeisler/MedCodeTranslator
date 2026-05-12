# Med Code Translator

Med Code Translator is an Expo app for fast medical code lookup across major coding systems, with bilingual English/Hebrew support, autocomplete, and suggestion-based search.

## Deployment Status

- **Web (live):** https://nadavweisler.github.io/MedCodeTranslator/
- **iOS:** EAS build workflow is configured; public deployment is planned
- **Android:** EAS build workflow is configured; public deployment is planned

## What the Product Does

- Search ATC5, ICD-10, ICD-9-CM, ICD-11, LOINC, and CPT-4
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

## Deployments

### Web

- Deployed automatically to GitHub Pages from `master` via `.github/workflows/deploy-pages.yml`
- Hosted under the project Pages path `/MedCodeTranslator`

### Mobile

- `.github/workflows/deploy-mobile.yml` builds iOS and Android apps through Expo Application Services (EAS)
- Supports `development`, `preview`, and `production` build profiles from `eas.json`
- Requires an `EXPO_TOKEN` GitHub Actions secret for authenticated builds

## Data Operations

Medical datasets are refreshed through `.github/workflows/refresh-medical-db.yml` or with:

```bash
npm run refresh:data
npm run validate:data
```

## Development

For local validation:

```bash
npm ci
npx tsc --noEmit
npm run build:web
```

## Disclaimer

This project is intended for lookup convenience and experimentation. Always verify codes and clinical decisions against authoritative medical sources.
