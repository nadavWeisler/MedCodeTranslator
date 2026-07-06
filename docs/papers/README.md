# Scientific paper manuscripts — MedCode Clinical

Three peer-review-ready manuscript drafts derived from the MedCodeTranslator project. Each uses formal IMRaD structure, structured abstracts, numbered tables, and reference lists appropriate for biomedical informatics journals.

## Manuscripts

| # | Title (short) | Type | Primary venue options |
|---|---------------|------|---------------------|
| 1 | Offline multi-vocabulary retrieval **platform** | Systems / original research | *JAMIA Open*, *J Biomed Inform*, *BMC Med Inform Decis Mak* |
| 2 | Multi-standard terminology **corpus** | Data descriptor | *Scientific Data*, *Database*, *GigaScience* |
| 3 | Layered vs lexical retrieval **evaluation** | Methods / evaluation | *JAMIA Open*, *Int J Med Inform*, AMIA Symposium |

## Files

- [`01-software-platform.md`](./01-software-platform.md) — Platform design, architecture, safe scope, benchmark summary
- [`02-data-resource.md`](./02-data-resource.md) — Corpus curation, licensing, provenance, reproduction
- [`03-evaluation-methods.md`](./03-evaluation-methods.md) — Controlled benchmark study (layered vs SQLite)

## Before submission checklist

### All papers
- [ ] Complete author list, affiliations, ORCID
- [ ] Institutional legal review for safe-scope / non-SaMD claims
- [ ] Confirm vocabulary licenses permit any journal-required supplementary data deposit
- [ ] Assign Zenodo DOI for dataset snapshot cited in Paper 2

### Paper 1 (platform)
- [ ] High-resolution architecture figure
- [ ] Screenshots (mobile EN, Hebrew RTL, web cross-scheme)
- [ ] Latency profiling (P95 ms) on reference Android device

### Paper 2 (data)
- [ ] Table 1 with exact record counts from release tag
- [ ] Zenodo upload of `data/vocabularies/` snapshot (respecting upstream terms)
- [ ] LOINC / WHO / CMS attribution statements per publisher template

### Paper 3 (evaluation)
- [ ] Clinician reviewer credentials for gold-standard fixtures
- [ ] Integrate `icd10_hebrew.json` into automated benchmark runner
- [ ] Optional: bootstrap 95% CIs if fixture set expanded to n ≥ 100

## Submission strategy

1. **Paper 2** (*Scientific Data*) — establishes citable dataset; submit first if you need a DOI for the other papers to reference.
2. **Paper 3** (evaluation) — strongest empirical contribution; pair with AMIA abstract deadline.
3. **Paper 1** (platform) — comprehensive overview; can merge with Paper 3 if a journal requests single submission.

Papers 1 and 3 overlap in benchmark tables but serve different angles (implementation vs evaluation); journals may ask to cross-reference or merge—adjust before dual submission.

## Converting to journal format

These Markdown drafts are source manuscripts. For submission:

- **JAMIA / Oxford journals:** export to Word via Pandoc with journal stylesheet
- **Scientific Data:** use Nature LaTeX template (`wlscirep` or `nature` class)
- **AMIA:** follow proceedings page limit (typically 10 pages including figures)

```bash
# Example Pandoc export (install pandoc locally)
pandoc docs/papers/01-software-platform.md -o medcode-platform.docx
```

## Empirical results source

Benchmark numbers cited in all three papers come from:

```bash
npm run benchmark
# → build/search-quality/benchmark-report.json
```

Last run incorporated in drafts: **2026-07-06** (layered P@1 mean 0.95 vs SQLite 0.71).
