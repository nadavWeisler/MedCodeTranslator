# Scientific manuscript — MedCode Clinical

## Primary submission

**[`04-unified-manuscript.md`](./04-unified-manuscript.md)** — single integrated paper combining platform design, corpus description, and benchmark evaluation.

| Field | Value |
|-------|-------|
| **Title** | MedCode Clinical: An Offline, Explainable Multi-Vocabulary Terminology Retrieval Platform and Benchmark Evaluation |
| **Type** | Original research (systems + evaluation) |
| **Target** | *JAMIA Open* (primary) |
| **Alternates** | *BMC Medical Informatics and Decision Making*, *Journal of Biomedical Informatics*, AMIA Symposium |

## Archive

Earlier split drafts (superseded by the unified manuscript) live in [`archive/`](./archive/):

- `01-software-platform.md` — platform-only angle
- `02-data-resource.md` — data descriptor angle
- `03-evaluation-methods.md` — evaluation-only angle

Reuse these for supplementary sections or a future *Scientific Data* descriptor if the corpus is published separately with a Zenodo DOI.

## Reproduce benchmark numbers in the paper

```bash
npm ci
npm run import:icd10-he    # Hebrew labels required for icd10_he row
npm run benchmark          # 82 fixtures: 74 English + 8 Hebrew
```

Results: `build/search-quality/benchmark-report.json`

## Submission checklist

- [ ] Author list, affiliations, ORCID
- [ ] Figures 1–5 (architecture, pipeline, P@1 chart, cross-scheme screenshot, Hebrew UI)
- [ ] Clinician reviewer credentials for benchmark gold standards
- [ ] Institutional legal review (safe-scope / non-SaMD claims)
- [ ] Confirm upstream licenses allow supplementary data deposit
- [ ] Export to journal template:

```bash
pandoc docs/papers/04-unified-manuscript.md -o medcode-clinical-manuscript.docx
```

## Future spin-offs (optional, after unified paper)

| When | Possible follow-up |
|------|-------------------|
| Zenodo `dataset-YYYY.MM` tag | *Scientific Data* descriptor (use `archive/02-data-resource.md`) |
| Coder validation study (n≥50) | Short communication on coding accuracy |
| P95 latency + FTS5 study | Performance-focused workshop paper |
