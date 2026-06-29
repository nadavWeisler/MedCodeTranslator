# AGENTS.md

## Cursor Cloud specific instructions

MedCodeTranslator is a single, **offline-first** Expo (React Native + web) app. There is
**no backend server, database server, or other external service** to start — vocabulary data
is bundled as JSON and search runs on-device via `expo-sqlite` + Fuse.js. To work on it
end to end you only need the Node toolchain (deps are refreshed by the startup update script,
i.e. `npm ci`).

### Running / testing (commands live in `package.json` and `.github/workflows/ci.yml`)

- Web dev server: `npm run web` (Expo, serves on `http://localhost:8081`).
- Type check: `npx tsc --noEmit`
- Tests: `npm test` (Jest via `jest-expo`).
- Web production export: `npm run build:web` (outputs to `dist/`).

### Non-obvious caveats

- On first load (and after a fresh dev server start) the app lazy-seeds the SQLite DB
  per coding scheme on first access to that scheme, so a brief "Loading <scheme>…"
  indicator appears before results show. This is expected, not a hang.
- The web UI shows an "Important safety notice" modal on first load that must be dismissed
  before searching.
- Search is scheme-scoped: pick the right tab (e.g. drugs like "aspirin" live under the
  `ATC-*` tabs, diagnoses like "diabetes" under `ICD-10`). A query can legitimately return
  "No results found" under the wrong scheme tab.
- CI pins Node 20; the app also runs fine on Node 22. Expo may print a Node-version warning.
- Python (3.9+) is only needed for the optional data-refresh scripts (`npm run refresh:data`
  / `validate:data`) and the standalone `packages/python-client`; it is not required to run,
  test, or build the app.
