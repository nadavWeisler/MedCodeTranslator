# upstream-sentinel

Probes all upstream dataset source URLs daily to detect outages and new annual CMS file
releases before the weekly `refresh-medical-db` workflow runs.

## What it checks

1. **Source availability** — every URL in `assets/data/source-metadata.json` is probed
   with a HEAD request (GET fallback) to confirm it returns 2xx.
2. **CMS annual file detection** — probes CMS ICD-10-CM and HCPCS annual ZIP URLs for
   the prior, current, and next two years. Surfaces when a future year's file becomes
   available so the refresh script's year resolver can be validated early.

## Running locally

```bash
# Basic probe (report written to build/upstream-sentinel/sentinel-report.json)
python agents/upstream-sentinel/sentinel.py

# Strict mode — exit 1 if any source is unreachable
python agents/upstream-sentinel/sentinel.py --strict

# Create a GitHub Issue on failure (requires GITHUB_TOKEN env var)
GITHUB_TOKEN=ghp_... python agents/upstream-sentinel/sentinel.py --create-issue
```

## CI integration

`.github/workflows/upstream-sentinel.yml` runs this script on a daily schedule at
06:00 UTC (before the Monday 04:00 UTC weekly refresh). The workflow:

- Uploads `sentinel-report.json` as a CI artifact.
- Writes a summary table to the GitHub Actions job summary.
- On `workflow_dispatch`, accepts a `create_issue` input to open a GitHub Issue when
  sources are unreachable.

## Output

| File | Description |
|---|---|
| `build/upstream-sentinel/sentinel-report.json` | JSON report of all probe results |
| GitHub Actions job summary | Human-readable table of probe results |
| GitHub Issue (optional) | Created when sources are unreachable and `--create-issue` is passed |

## Configuration

Key settings in `agents/agents-config.json`:

| Key | Default | Description |
|---|---|---|
| `upstream_sentinel.probe_timeout_seconds` | `20` | Per-URL probe timeout |
| `upstream_sentinel.cms_year_probe_offsets` | `[-1, 0, 1, 2]` | Year offsets to probe for CMS annual files |
