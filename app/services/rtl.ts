export const RTL_LANGUAGES = ['he', 'ar'] as const;

export function isRTL(lang: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(lang);
}
