# Mobile release guide (iOS & Android)

This document describes how to produce the first internal builds of MedCodeTranslator
using [EAS Build](https://docs.expo.dev/build/introduction/). Store submission is
out of scope until legal review and listing assets are finalized.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Expo account | https://expo.dev — create org/project for `med-code-translator` |
| EAS CLI | `npm install -g eas-cli` |
| Apple Developer Program | Required for iOS device / TestFlight builds |
| Google Play Console | Required for Android internal testing |

**Do not commit** API keys, keystores, or App Store Connect credentials to the repo.

## One-time setup

```bash
npm ci
eas login
eas init          # links local project to Expo; run once per machine
```

The repo includes `eas.json` with `development`, `preview`, and `production` profiles.

### Required EAS secrets (configure in Expo dashboard or CLI)

| Secret | Platform | Purpose |
|--------|----------|---------|
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | iOS | App Store Connect API / submit |
| Apple distribution cert + provisioning profile | iOS | EAS can manage via `eas credentials` |
| Android keystore | Android | EAS can generate on first build |

Run `eas credentials` for interactive setup.

## Build commands

### Internal preview (recommended first build)

```bash
# iOS — ad hoc or TestFlight internal
eas build --platform ios --profile preview

# Android — APK for sideload / internal track
eas build --platform android --profile preview
```

### Production (store-ready binaries)

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Development client (optional, for native debugging)

```bash
eas build --platform ios --profile development
```

## Submit to stores (after build succeeds)

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Copy for listings lives in [`store-listing.md`](../store-listing.md) and
[`docs/APP_STORE_DESCRIPTION.md`](APP_STORE_DESCRIPTION.md).

## CI integration

`.github/workflows/eas-build.yml` triggers EAS `preview` builds on GitHub Release publish or manual `workflow_dispatch`. Required GitHub secret:

- `EXPO_TOKEN` — Expo access token with build permissions

Until `EXPO_TOKEN` is configured, builds remain manual via the commands above.

## Verification checklist

- [ ] App launches offline with bundled `data/vocabularies/`
- [ ] Search works for ICD-10, ATC-5, and LOINC demo subsets
- [ ] Disclaimer modal appears on first launch
- [ ] No network calls during search (verify with airplane mode)
- [ ] Icons and splash match `assets/icon.png` / `assets/splash-icon.png`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `expo-sqlite` native module missing | Ensure `expo-sqlite` is in `app.config.ts` plugins |
| Bundle too large | Vocabularies lazy-load per scheme; check Metro config |
| iOS signing failure | Run `eas credentials -p ios` and regenerate profiles |

See also [Expo EAS Build docs](https://docs.expo.dev/build/setup/).
