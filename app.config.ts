import type { ExpoConfig } from 'expo/config';

function getBaseUrl() {
  const baseUrl = process.env.MEDCODE_BASE_URL?.trim();

  if (!baseUrl || baseUrl === '/') {
    return '/MedCodeTranslator';
  }

  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

const config: ExpoConfig = {
  name: 'MedCode Clinical',
  slug: 'med-code-translator',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0C2340',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0C2340',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  scheme: 'medcodes',
  web: {
    output: 'static',
    bundler: 'metro',
    favicon: './assets/icon.png',
    name: 'MedCode Clinical',
    shortName: 'MedCode',
    description:
      'Offline multi-vocabulary search across ICD, ATC, LOINC (subset), HCPCS, and related terminology systems.',
  },
  plugins: ['expo-sqlite', 'expo-router'],
  experiments: {
    baseUrl: getBaseUrl(),
  },
};

export default config;
