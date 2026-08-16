export const DEFAULT_DISPLAY_PERIOD = '3D';

const UNIT_MULTIPLIERS_MS: Record<string, number> = {
  H: 60 * 60 * 1000,
  D: 24 * 60 * 60 * 1000,
  W: 7 * 24 * 60 * 60 * 1000,
  Y: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Parses a display period string into a cutoff Date.
 * Supported units: H (Hours), D (Days), W (Weeks), Y (Years) - case-insensitive.
 * Special value: 'all' returns null (indicating no date filtering).
 * If invalid, logs a warning and falls back to default 3D.
 *
 * @param periodStr Optional period string (e.g., '12H', '3D', '2W', '1Y', 'all'). If omitted, reads process.env.SESSION_HISTORY_DISPLAY_PERIOD (or legacy process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD).
 * @param referenceTime Optional reference timestamp in ms (defaults to Date.now()).
 * @returns Date cutoff or null if 'all' / unrestricted.
 */
export function parseDisplayPeriod(periodStr?: string, referenceTime: number = Date.now()): Date | null {
  const envPeriod = process.env.SESSION_HISTORY_DISPLAY_PERIOD ?? process.env.GIRAMICHI_SESSION_HISTORY_DISPLAY_PERIOD;
  const rawPeriod = (periodStr !== undefined ? periodStr : envPeriod) ?? DEFAULT_DISPLAY_PERIOD;
  const trimmed = rawPeriod.trim();

  if (trimmed.toLowerCase() === 'all') {
    return null;
  }

  const match = trimmed.match(/^(\d+)\s*([hdwmyHDWMY])$/);
  if (!match) {
    console.warn(`[Giramichi] Invalid SESSION_HISTORY_DISPLAY_PERIOD format "${trimmed}". Falling back to default "${DEFAULT_DISPLAY_PERIOD}".`);
    return new Date(referenceTime - 3 * UNIT_MULTIPLIERS_MS.D);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();

  const multiplier = UNIT_MULTIPLIERS_MS[unit];
  if (!multiplier) {
    console.warn(`[Giramichi] Unsupported unit "${unit}" in period "${trimmed}". Falling back to default "${DEFAULT_DISPLAY_PERIOD}".`);
    return new Date(referenceTime - 3 * UNIT_MULTIPLIERS_MS.D);
  }

  return new Date(referenceTime - value * multiplier);
}

/**
 * Returns the ISO 8601 string cutoff for the configured session history display period,
 * or null if 'all' is configured.
 */
export function getSessionHistoryCutoffIso(periodStr?: string, referenceTime: number = Date.now()): string | null {
  const cutoff = parseDisplayPeriod(periodStr, referenceTime);
  return cutoff ? cutoff.toISOString() : null;
}
