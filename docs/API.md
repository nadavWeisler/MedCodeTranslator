# API and Integration Notes

## TypeScript packages

Install the retrieval engine for use in Node.js or browser bundlers:

```bash
npm install @medcode/core @medcode/search
```

```typescript
import { layeredSearch } from '@medcode/search';
import type { ScoredEntry } from '@medcode/core';

const results: ScoredEntry[] = layeredSearch(entries, 'diabetes', 'icd10', { limit: 10 });
```

Build the packages from the monorepo root:

```bash
npm run build:packages
```

Publishing uses `.github/workflows/publish-packages.yml` on GitHub Release events.

- **npm:** add repository secret `NPM_TOKEN` with publish access for `@medcode/core` and `@medcode/search`.
- **PyPI:** configure [trusted publishing](https://docs.pypi.org/trusted-publishers/) for the `pypi` GitHub environment used by the workflow.

## Python client

```bash
pip install medcodetranslator
```

See [`packages/python-client/README.md`](../packages/python-client/README.md).

## Intended Scope
MedCodeTranslator is an informational terminology lookup utility for administrative and educational workflows.

## No PHI Rule
Do **not** send patient-identifiable information or PHI in requests, query parameters, logs, or payloads.

## Safety Boundary
Any API or endpoint in this project must return terminology matches only and must not provide diagnosis, treatment, or prescribing recommendations.

## Metadata Expectations
Dataset metadata responses should include:
- dataset version,
- source revision,
- last updated timestamp.
