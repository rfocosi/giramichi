import { test, expect } from '@playwright/test';
import { parseDisplayPeriod, getSessionHistoryCutoffIso, DEFAULT_DISPLAY_PERIOD } from '../../src/utils/periodParser.js';

test.describe('Period Parser Utility Tests', () => {
  const refTime = 1700000000000; // Fixed timestamp for deterministic testing

  test('should correctly parse hours (H/h)', () => {
    const result1H = parseDisplayPeriod('1H', refTime);
    expect(result1H).not.toBeNull();
    expect(result1H!.getTime()).toBe(refTime - 1 * 60 * 60 * 1000);

    const result24h = parseDisplayPeriod('24h', refTime);
    expect(result24h).not.toBeNull();
    expect(result24h!.getTime()).toBe(refTime - 24 * 60 * 60 * 1000);
  });

  test('should correctly parse days (D/d)', () => {
    const result3D = parseDisplayPeriod('3D', refTime);
    expect(result3D).not.toBeNull();
    expect(result3D!.getTime()).toBe(refTime - 3 * 24 * 60 * 60 * 1000);

    const result7d = parseDisplayPeriod('7d', refTime);
    expect(result7d).not.toBeNull();
    expect(result7d!.getTime()).toBe(refTime - 7 * 24 * 60 * 60 * 1000);
  });

  test('should correctly parse weeks (W/w)', () => {
    const result1W = parseDisplayPeriod('1W', refTime);
    expect(result1W).not.toBeNull();
    expect(result1W!.getTime()).toBe(refTime - 7 * 24 * 60 * 60 * 1000);

    const result4w = parseDisplayPeriod('4w', refTime);
    expect(result4w).not.toBeNull();
    expect(result4w!.getTime()).toBe(refTime - 4 * 7 * 24 * 60 * 60 * 1000);
  });

  test('should correctly parse years (Y/y)', () => {
    const result1Y = parseDisplayPeriod('1Y', refTime);
    expect(result1Y).not.toBeNull();
    expect(result1Y!.getTime()).toBe(refTime - 365 * 24 * 60 * 60 * 1000);

    const result2y = parseDisplayPeriod('2y', refTime);
    expect(result2y).not.toBeNull();
    expect(result2y!.getTime()).toBe(refTime - 2 * 365 * 24 * 60 * 60 * 1000);
  });

  test('should return null for special value "all" (case-insensitive)', () => {
    expect(parseDisplayPeriod('all', refTime)).toBeNull();
    expect(parseDisplayPeriod('ALL', refTime)).toBeNull();
    expect(parseDisplayPeriod('All', refTime)).toBeNull();
    expect(getSessionHistoryCutoffIso('all', refTime)).toBeNull();
  });

  test('should fall back to 3D for invalid or unrecognized period strings', () => {
    const expectedFallback = new Date(refTime - 3 * 24 * 60 * 60 * 1000);

    const resultInvalid = parseDisplayPeriod('invalid_string', refTime);
    expect(resultInvalid).toEqual(expectedFallback);

    const resultUnknownUnit = parseDisplayPeriod('10X', refTime);
    expect(resultUnknownUnit).toEqual(expectedFallback);
  });

  test('should respect process.env.SESSION_HISTORY_DISPLAY_PERIOD when arg is omitted', () => {
    const originalEnv = process.env.SESSION_HISTORY_DISPLAY_PERIOD;
    const originalLegacyEnv = process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD;
    try {
      delete process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD;
      process.env.SESSION_HISTORY_DISPLAY_PERIOD = '5D';
      const result = parseDisplayPeriod(undefined, refTime);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(refTime - 5 * 24 * 60 * 60 * 1000);

      process.env.SESSION_HISTORY_DISPLAY_PERIOD = 'all';
      expect(parseDisplayPeriod(undefined, refTime)).toBeNull();
    } finally {
      process.env.SESSION_HISTORY_DISPLAY_PERIOD = originalEnv;
      process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD = originalLegacyEnv;
    }
  });

  test('should fallback to legacy process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD when new var is unset', () => {
    const originalEnv = process.env.SESSION_HISTORY_DISPLAY_PERIOD;
    const originalLegacyEnv = process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD;
    try {
      delete process.env.SESSION_HISTORY_DISPLAY_PERIOD;
      process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD = '2W';
      const result = parseDisplayPeriod(undefined, refTime);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(refTime - 2 * 7 * 24 * 60 * 60 * 1000);
    } finally {
      process.env.SESSION_HISTORY_DISPLAY_PERIOD = originalEnv;
      process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD = originalLegacyEnv;
    }
  });

  test('should give precedence to SESSION_HISTORY_DISPLAY_PERIOD over GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD', () => {
    const originalEnv = process.env.SESSION_HISTORY_DISPLAY_PERIOD;
    const originalLegacyEnv = process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD;
    try {
      process.env.SESSION_HISTORY_DISPLAY_PERIOD = '1H';
      process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD = '10D';
      const result = parseDisplayPeriod(undefined, refTime);
      expect(result).not.toBeNull();
      expect(result!.getTime()).toBe(refTime - 1 * 60 * 60 * 1000);
    } finally {
      process.env.SESSION_HISTORY_DISPLAY_PERIOD = originalEnv;
      process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD = originalLegacyEnv;
    }
  });

  test('should generate valid ISO cutoff string with getSessionHistoryCutoffIso', () => {
    const iso = getSessionHistoryCutoffIso('1D', refTime);
    expect(iso).toBe(new Date(refTime - 24 * 60 * 60 * 1000).toISOString());
  });
});
