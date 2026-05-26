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
  name: 'Med Code Translator',
  slug: 'med-code-translator',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  scheme: 'medcodes',
  web: {
    output: 'static',
    bundler: 'metro',
    favicon: './assets/icon.png',
    name: 'Med Code Translator',
    shortName: 'MedCode',
    description:
      'Search medications, diagnoses, labs, and procedures across multiple clinical coding systems.',
  },
  plugins: ['expo-sqlite', 'expo-router'],
  experiments: {
    baseUrl: getBaseUrl(),
  },
};

export default config;
