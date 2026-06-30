import { Platform } from 'react-native';

/**
 * MedCode Clinical — design tokens for a professional, clinician-trusted UI.
 */
export const brand = {
  name: 'MedCode',
  suffix: 'Clinical',
  fullName: 'MedCode Clinical',
} as const;

export const colors = {
  navy: '#0C2340',
  navyMid: '#1A3A5C',
  teal: '#0D7377',
  tealDark: '#0A5C5F',
  tealLight: '#E8F4F4',
  tealMuted: '#B8DEDE',

  pageBg: '#EEF2F6',
  surface: '#FFFFFF',
  surfaceRaised: '#F8FAFC',
  surfaceMuted: '#F1F5F9',

  textPrimary: '#0C2340',
  textSecondary: '#4A5F6D',
  textMuted: '#7A8B9A',
  textInverse: '#FFFFFF',

  border: '#D5DEE8',
  borderLight: '#E8EDF3',
  borderFocus: '#0D7377',

  trust: '#0D7377',
  trustBg: '#E8F4F4',
  warning: '#9A3412',
  warningBg: '#FFF7ED',
  warningBorder: '#FDBA74',
  danger: '#991B1B',
  dangerBg: '#FEF2F2',
  success: '#0F5C4A',
  successBg: '#ECFDF5',
  successBorder: '#6EE7B7',
  demo: '#92400E',
  demoBg: '#FFFBEB',
  demoBorder: '#FCD34D',

  shadow: '#0C2340',
  overlay: 'rgba(12, 35, 64, 0.55)',
} as const;

export const typography = {
  fontFamily: Platform.OS === 'web'
    ? '"IBM Plex Sans", "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : undefined,
  monoFamily: Platform.OS === 'web'
    ? '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    : undefined,
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0C2340',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dropdown: {
    shadowColor: '#0C2340',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

/** Professional, muted scheme accent colors grouped by clinical domain. */
export const schemeColors = {
  icd10: '#0D6E6E',
  icd9: '#3D5A80',
  icd11: '#0B7285',
  atc1: '#1A365D',
  atc2: '#1E4976',
  atc3: '#2563A8',
  atc4: '#3B6EA8',
  atc5: '#1E3A5F',
  cvx: '#5C4D8A',
  loinc: '#9A6B1A',
  cpt: '#8B3A3A',
  hcpcs: '#0F5C5C',
} as const;
