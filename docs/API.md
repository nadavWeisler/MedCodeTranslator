# API and Integration Notes

## Intended Scope
MedCodeTranslator is an informational terminology lookup utility for research and administrative workflows.

## No PHI Rule
Do **not** send patient-identifiable information or PHI in requests, query parameters, logs, or payloads.

## Safety Boundary
Any API or endpoint in this project must return terminology matches only and must not provide diagnosis, treatment, or prescribing recommendations.

## Metadata Expectations
Dataset metadata responses should include:
- dataset version,
- source revision,
- last updated timestamp.
