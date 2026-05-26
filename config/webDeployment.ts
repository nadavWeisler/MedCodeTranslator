export const PRODUCTION_BRANCH = 'master';
export const DEVELOPMENT_BRANCH = 'dev';
export const PRODUCTION_BASE_URL = '/MedCodeTranslator';
export const DEVELOPMENT_BASE_URL = '/MedCodeTranslator/dev';
const DEFAULT_SITE_ORIGIN = 'https://nadavweisler.github.io';
const ENV =
  typeof globalThis === 'object' && globalThis && 'process' in globalThis
    ? (
        globalThis as {
          process?: {
            env?: Record<string, string | undefined>;
          };
        }
      ).process?.env
    : undefined;

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

export function normalizeBaseUrl(value?: string) {
  if (!value) {
    return PRODUCTION_BASE_URL;
  }

  const trimmed = trimTrailingSlashes(value.trim());

  if (!trimmed || trimmed === '/') {
    return PRODUCTION_BASE_URL;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function getBaseUrl() {
  return normalizeBaseUrl(ENV?.MEDCODE_BASE_URL);
}

export function getSiteOrigin() {
  return trimTrailingSlashes(ENV?.MEDCODE_SITE_ORIGIN?.trim() || DEFAULT_SITE_ORIGIN);
}

export function getSiteUrl() {
  return `${getSiteOrigin()}${getBaseUrl()}/`;
}

export function getAssetUrl(path: string) {
  return `${getBaseUrl()}/${path.replace(/^\/+/, '')}`;
}
