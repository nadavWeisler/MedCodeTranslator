# Contributing to MedCodeTranslator

## Issue Intake

Use the GitHub issue forms to keep reports actionable and safe to review:

- **Bug report** for search, results, UI, CI, deployment, and documentation/compliance defects.
- **Feature request** for product improvements that stay within the app's informational lookup scope.
- **Data issue** for stale, incorrect, missing, or inconsistent terminology data and refresh workflow output.

Before opening any issue:

- Do **not** include patient-identifiable or protected health information (PHI).
- Keep requests within the product's informational/reference scope.
- If a proposal could influence diagnosis, treatment, or prescribing decisions, pause and route it for legal/regulatory review first.
- Include the affected platform (`Web`, `iOS`, `Android`, or `Shared / all platforms`) and the coding scheme (`ATC-5`, `ICD-10`, `ICD-9-CM`, `ICD-11`, `LOINC`, `CPT-4`) when relevant.

Every actionable issue should capture:

- problem summary
- affected area
- expected behavior
- actual behavior
- reproduction steps or data example
- risk/compliance notes when relevant
- acceptance criteria

## Label Taxonomy

Apply labels before or during triage so the backlog stays searchable.

### Type labels

- `type: bug`
- `type: feature`
- `type: data`
- `type: docs`
- `type: ci`

### Area labels

- `area: web`
- `area: mobile`
- `area: search`
- `area: dataset`
- `area: compliance`

### Priority labels

- `priority: P1` — urgent user-facing, safety, privacy, or release-blocking work
- `priority: P2` — important but not immediately blocking
- `priority: P3` — routine backlog work

### Triage label

- `needs-triage` — newly opened issue awaiting review

## Initial Backlog Seed Drafts

Use the titles below when opening the first batch of focused issues. Keep each issue scoped tightly enough that one pull request can reasonably complete it.

1. **Publish the first public iOS build path from the existing EAS workflow**
   - Suggested labels: `type: ci`, `area: mobile`, `priority: P2`
2. **Publish the first public Android build path from the existing EAS workflow**
   - Suggested labels: `type: ci`, `area: mobile`, `priority: P2`
3. **Document how dataset refresh failures are triaged from the GitHub Actions workflow**
   - Suggested labels: `type: docs`, `area: dataset`, `priority: P2`
4. **Review search-result reporting quality after the first bug reports land**
   - Suggested labels: `type: bug`, `area: search`, `priority: P3`
5. **Reassess issue templates after the first five submitted reports**
   - Suggested labels: `type: docs`, `area: compliance`, `priority: P3`

## Triage Workflow

Operational runbooks:

- Dataset refresh failures → [`docs/dataset-refresh-triage.md`](docs/dataset-refresh-triage.md)
- Mobile builds (EAS) → [`docs/mobile-release.md`](docs/mobile-release.md)

After the first batch of issues is opened:

1. remove duplicates
2. assign type, area, and priority labels
3. link related issues and note dependencies
4. mark blockers before implementation starts
5. remove `needs-triage` once the issue has clear scope and ownership

Revisit the issue forms after a few real submissions and tighten any prompts that are producing ambiguous or incomplete reports.
