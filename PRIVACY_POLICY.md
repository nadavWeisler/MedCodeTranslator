# Privacy Policy

_Last updated: 2026-05-12_

## 1) Scope
This project is designed as a terminology/code lookup utility. It is not intended for patient record processing.

## 2) Data We Intend to Collect
- Query text entered by a user inside the app runtime.
- Local dataset/version metadata needed to show source freshness.

## 3) Data We Intend **Not** to Collect
- No patient-identifiable information should be entered.
- No PHI should be entered.
- No account/profile data is required.

## 4) Analytics and Crash Reporting
- Default repository implementation does not include third-party analytics SDKs.
- Default repository implementation does not include third-party crash reporting SDKs.
- If this changes in production builds, disclosure must be updated before release.

## 5) Logging and Retention
- Local app behavior may emit development logs to console during development.
- Repository code does not intentionally persist user-entered search terms to a backend service.
- Any operational logs retained by hosting platforms should use minimum retention and avoid sensitive payloads.

## 6) Third-Party Integrations
- Public terminology sources are used for dataset refresh workflows.
- No backend PHI integration is included.

## 7) Contact
For privacy questions or deletion requests regarding deployment-specific telemetry, contact your deployment operator's monitored privacy mailbox.  
Repository placeholder: **privacy@medcodetranslator.example** (must be replaced with a real monitored address before production release).
