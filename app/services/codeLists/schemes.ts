import { SCHEME_KEYS, type SchemeKey } from '@medcode/core';

const ATC_LEVELS: SchemeKey[] = ['atc1', 'atc2', 'atc3', 'atc4', 'atc5'];

const ATC_PATTERNS: Record<'atc1' | 'atc2' | 'atc3' | 'atc4' | 'atc5', RegExp> = {
  atc1: /^[A-Z]$/,
  atc2: /^[A-Z]\d{2}$/,
  atc3: /^[A-Z]\d{2}[A-Z]$/,
  atc4: /^[A-Z]\d{2}[A-Z]{2}$/,
  atc5: /^[A-Z]\d{2}[A-Z]{2}\d{2}$/,
};

export function schemeExportLabel(scheme: SchemeKey): string {
  switch (scheme) {
    case 'icd10':
      return 'ICD-10';
    case 'icd9':
      return 'ICD-9';
    case 'icd11':
      return 'ICD-11';
    case 'atc1':
      return 'ATC-1';
    case 'atc2':
      return 'ATC-2';
    case 'atc3':
      return 'ATC-3';
    case 'atc4':
      return 'ATC-4';
    case 'atc5':
      return 'ATC-5';
    case 'cvx':
      return 'CVX';
    case 'loinc':
      return 'LOINC';
    case 'hcpcs':
      return 'HCPCS';
    default: {
      const exhaustive: never = scheme;
      return exhaustive;
    }
  }
}

export function roleExportLabel(role: 'inclusion' | 'exclusion'): 'Inclusion' | 'Exclusion' {
  switch (role) {
    case 'inclusion':
      return 'Inclusion';
    case 'exclusion':
      return 'Exclusion';
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

function aliasKey(token: string): string {
  return token.trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
}

const SCHEME_ALIASES: Record<string, SchemeKey> = {};

function addAliases(scheme: SchemeKey, tokens: string[]): void {
  SCHEME_ALIASES[aliasKey(scheme)] = scheme;
  SCHEME_ALIASES[aliasKey(schemeExportLabel(scheme))] = scheme;
  for (const token of tokens) {
    SCHEME_ALIASES[aliasKey(token)] = scheme;
  }
}

addAliases('icd10', ['icd-10', 'icd 10', 'icd-10-cm', 'icd10-cm', 'icd 10 cm']);
addAliases('icd9', ['icd-9', 'icd 9', 'icd-9-cm', 'icd9-cm', 'icd 9 cm']);
addAliases('icd11', ['icd-11', 'icd 11', 'icd-11-mms']);
addAliases('atc1', ['atc-1', 'atc 1', 'atc level 1']);
addAliases('atc2', ['atc-2', 'atc 2', 'atc level 2']);
addAliases('atc3', ['atc-3', 'atc 3', 'atc level 3']);
addAliases('atc4', ['atc-4', 'atc 4', 'atc level 4']);
addAliases('atc5', ['atc-5', 'atc 5', 'atc level 5']);
addAliases('cvx', ['cvx vaccines']);
addAliases('loinc', []);
addAliases('hcpcs', ['hcpcs level ii', 'hcpcs level 2']);

export function parseSchemeToken(token: string): SchemeKey | null {
  const key = aliasKey(token);
  if (!key) return null;
  return SCHEME_ALIASES[key] ?? null;
}

export function isSchemeKey(value: string): value is SchemeKey {
  return (SCHEME_KEYS as string[]).includes(value);
}

/** Schemes that must be loaded to resolve a code and its descendants. */
export function schemesForExpansion(scheme: SchemeKey): SchemeKey[] {
  switch (scheme) {
    case 'atc1':
      return ['atc1', 'atc2', 'atc3', 'atc4', 'atc5'];
    case 'atc2':
      return ['atc2', 'atc3', 'atc4', 'atc5'];
    case 'atc3':
      return ['atc3', 'atc4', 'atc5'];
    case 'atc4':
      return ['atc4', 'atc5'];
    case 'atc5':
      return ['atc5'];
    case 'icd10':
      return ['icd10'];
    case 'icd9':
      return ['icd9'];
    case 'icd11':
      return ['icd11'];
    case 'loinc':
      return ['loinc'];
    case 'hcpcs':
      return ['hcpcs'];
    case 'cvx':
      return ['cvx'];
    default: {
      const exhaustive: never = scheme;
      return exhaustive;
    }
  }
}

export function atcLevelIndex(scheme: SchemeKey): number {
  return ATC_LEVELS.indexOf(scheme);
}

export function isAtcScheme(scheme: SchemeKey): scheme is 'atc1' | 'atc2' | 'atc3' | 'atc4' | 'atc5' {
  return atcLevelIndex(scheme) >= 0;
}

export function matchesAtcLevel(scheme: SchemeKey, code: string): boolean {
  if (!isAtcScheme(scheme)) return false;
  return ATC_PATTERNS[scheme].test(code);
}
