import { Platform } from 'react-native';
import type { CodeEntry } from '@medcode/core';
import type { SchemeKey } from '../../db/database';
import { getBaseUrl, getSiteOrigin } from '../../config/webDeployment';

export type ShareParams = {
  scheme: SchemeKey;
  lang: string;
  query?: string;
  code?: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Build a shareable deep link that restores scheme, query, language, and optional code. */
export function buildShareUrl(params: ShareParams): string {
  const searchParams = new URLSearchParams();
  if (params.query?.trim()) {
    searchParams.set('q', params.query.trim());
  }
  searchParams.set('scheme', params.scheme);
  searchParams.set('lang', params.lang);
  if (params.code?.trim()) {
    searchParams.set('code', params.code.trim());
  }

  const queryString = searchParams.toString();
  const basePath = trimTrailingSlash(getBaseUrl());
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? trimTrailingSlash(window.location.origin)
      : trimTrailingSlash(getSiteOrigin());

  return `${origin}${basePath}/${queryString ? `?${queryString}` : ''}`;
}

/** Format a code and its primary label for clipboard copy. */
export function formatCodeDescription(entry: CodeEntry, lang: string): string {
  const label = lang === 'he' && entry.name_he ? entry.name_he : entry.name_en;
  return `${entry.code} — ${label}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return;
    }

    throw new Error('Clipboard is not available in this environment.');
  }

  const Clipboard = await import('expo-clipboard');
  await Clipboard.setStringAsync(text);
}
