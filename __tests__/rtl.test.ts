import { isRTL } from '../app/services/rtl';

describe('isRTL', () => {
  it('returns true for Hebrew', () => {
    expect(isRTL('he')).toBe(true);
  });

  it('returns true for Arabic', () => {
    expect(isRTL('ar')).toBe(true);
  });

  it('returns false for English', () => {
    expect(isRTL('en')).toBe(false);
  });

  it('returns false for Spanish', () => {
    expect(isRTL('es')).toBe(false);
  });

  it('returns false for unknown language', () => {
    expect(isRTL('xx')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRTL('')).toBe(false);
  });
});
