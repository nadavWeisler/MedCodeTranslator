# Dependency License Audit

_Last updated: 2026-05-12_

Audit command used:

```bash
npx license-checker --summary
```

Summary in this repository state:
- Predominantly permissive licenses (MIT/ISC/BSD/Apache).
- No direct dependency requiring AGPL.
- One dual-license package (`node-forge`) reports `(BSD-3-Clause OR GPL-2.0)`; permissive BSD option should be used.
- `UNLICENSED` entry corresponds to this repository package metadata (`med-code-translator`), not a third-party runtime dependency.

Action items before public release:
- Re-run license audit in CI on every dependency change.
- Keep attribution notices for dependencies that require it.
- Block additions of GPL/AGPL-only runtime dependencies unless legal approval is documented.
