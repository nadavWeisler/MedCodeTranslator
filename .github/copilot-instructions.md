## MedCodeTranslator repository guidance

- This repository is an Expo + React Native + Expo Router application for terminology and code lookup across bundled medical coding datasets.
- Keep the product inside the safe scope documented in `docs/SAFE_SCOPE.md`: terminology lookup, autocomplete, fuzzy matching, source attribution, freshness metadata, and translation support.
- Do not add diagnosis assistance, treatment recommendations, prescribing support, patient-specific logic, risk scoring, interaction checking, or AI-generated clinical guidance.
- Never introduce workflows that require patient-identifiable or protected health information.

## Primary areas

- `app/` contains screens and UI components.
- `db/` contains SQLite schema, seeding, and lookup queries.
- `assets/data/` contains bundled terminology datasets.
- `scripts/refresh_medical_db.py` refreshes and validates medical datasets.
- `app/services/` contains fuzzy search, source metadata, and UI helpers.
- `.github/workflows/` contains CI, deploy, accessibility, and data refresh workflows.

## Project expectations

- Prefer surgical changes that match the current architecture.
- Preserve offline-friendly lookup behavior and deterministic local data handling.
- Treat bilingual and multilingual UX carefully, especially RTL handling and query parameter support on web.
- If a requested change could influence diagnosis, treatment, or prescribing decisions, stop and route it for legal or regulatory review instead of implementing it.

## Validation commands

- `npx tsc --noEmit`
- `npm run build:web`
- `npm run validate:data`

Run the commands that match the areas you changed. If you touch data refresh or dataset assets, include `npm run validate:data`.
