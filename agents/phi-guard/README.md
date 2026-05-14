# phi-guard

Scans every PR diff for patterns that would introduce PHI (patient-identifiable
information), SAFE_SCOPE violations, or external HTTP requests from the app/db layer.

## What it checks

| Pattern | Severity | Description |
|---|---|---|
| `phi-field-ts` | **hard** | PHI-named field/parameter in TypeScript (`patientId`, `mrn`, `dob`, `ssn`, …) |
| `clinical-decision-field-ts` | **hard** | Clinical decision support field in TypeScript (`dosageRecommendation`, `riskScore`, …) |
| `external-fetch-app` | **hard** | `fetch()` to an absolute external URL in `app/` or `db/` code |
| `asyncstorage-phi-key` | **hard** | `AsyncStorage` call with a PHI-adjacent key string |
| `patient-variable` | warning | Variable declaration named `patient*` in `app/` or `db/` code |

Hard violations exit 1 and block the PR. Warnings are informational only.

## Running locally

```bash
# Scan uncommitted changes
git diff HEAD | python agents/phi-guard/phi_guard.py

# Scan a saved diff file
git diff origin/master...HEAD > /tmp/pr.diff
python agents/phi-guard/phi_guard.py --diff-file /tmp/pr.diff

# Dry-run (print violations but never exit 1)
git diff HEAD | python agents/phi-guard/phi_guard.py --warn-only
```

## CI integration

`.github/workflows/phi-guard.yml` runs on every PR that touches `app/`, `db/`, or
`scripts/`. It fetches the base branch and computes the diff with:

```
git diff origin/$BASE_BRANCH...HEAD | python agents/phi-guard/phi_guard.py
```

In GitHub Actions, the script emits `::error` and `::warning` annotations that appear
inline in the PR diff view.

## Pattern maintenance

Patterns are defined in `agents/phi-guard/patterns.json` (not in the script) so they
can be updated without touching application code. Each pattern has:

| Field | Required | Description |
|---|---|---|
| `id` | ✓ | Unique identifier for the pattern |
| `description` | ✓ | Human-readable description |
| `pattern` | ✓ | Python `re` regular expression |
| `file_extensions` | | List of extensions to check (e.g. `[".ts", ".tsx"]`) |
| `case_insensitive` | | Whether to apply `re.IGNORECASE` |
| `message` | ✓ | Message shown to the developer on a match |

To add a new pattern, add an entry to `hard_violations` or `warnings` in `patterns.json`.

## Scope

The guard checks added lines in files under `app/`, `db/`, and `scripts/`. It skips:

- Comment lines (`//`, `*`, `#`, `/*`)
- Files under `agents/`, `legal/`, `docs/`, `i18n/`, `.github/`, `assets/`, `public/`
- Pure data/markup extensions: `.md`, `.json`, `.yml`, `.yaml`, `.png`, `.svg`, `.txt`
