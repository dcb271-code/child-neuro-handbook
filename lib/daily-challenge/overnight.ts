// Overnight bypass for the daily-question gate. Residents asked for the front
// door to open without a question between 11 pm and 5:59 am Eastern — the
// on-call hours, when someone reaching for the handbook needs it now.
//
// The window is defined in the programme's clock (America/New_York, which
// follows daylight saving), not the device's, so a phone left on another
// zone's time still sees the same hours as everyone else.

export const BYPASS_ZONE = 'America/New_York';

/** First hour of the bypass window, inclusive (23 = 11 pm). */
export const BYPASS_FROM_HOUR = 23;
/** First hour the gate applies again (6 = 6:00 am, so 5:59 is still open). */
export const BYPASS_UNTIL_HOUR = 6;

/** Hour of the day, 0–23, in the programme's time zone. */
export function hourInZone(date: Date, zone: string = BYPASS_ZONE): number {
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric',
    hour12: false,
  }).format(date);
  // Some engines render midnight as "24" under hour12: false.
  return Number(text) % 24;
}

/** True between 23:00 and 05:59 Eastern, when the daily question is skipped. */
export function isOvernightBypass(date: Date = new Date()): boolean {
  const h = hourInZone(date);
  return h >= BYPASS_FROM_HOUR || h < BYPASS_UNTIL_HOUR;
}
