export interface DateRange {
  /** 1-indexed month (1 = Jan, 10 = Oct, 11 = Nov, 12 = Dec) */
  startMonth: number
  /** 1-indexed day of month (1..31) */
  startDay: number
  /** 1-indexed month */
  endMonth: number
  /** 1-indexed day of month (1..31) */
  endDay: number
}

/**
 * Default active date range for the Spider event (Halloween season: Oct 20 - Nov 5).
 */
export const SPIDER_DEFAULT_DATES: DateRange[] = [
  { startMonth: 10, startDay: 20, endMonth: 11, endDay: 5 }
]

/**
 * Checks whether a given date falls inside a specific date range.
 */
export function isDateInRange(
  date: Date = new Date(),
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const month = date.getMonth() + 1
  const day = date.getDate()

  const currentVal = month * 100 + day
  const startVal = startMonth * 100 + startDay
  const endVal = endMonth * 100 + endDay

  if (startVal <= endVal) {
    return currentVal >= startVal && currentVal <= endVal
  } else {
    // Range spans over the new year (e.g. Dec 20 - Jan 10)
    return currentVal >= startVal || currentVal <= endVal
  }
}

/**
 * Checks if the spider feature should be active.
 * Prioritizes VITE_SPIDER_ENABLED env variable if present, otherwise checks date ranges.
 */
export function isSpiderActive(
  customDates: DateRange[] = SPIDER_DEFAULT_DATES,
  now: Date = new Date()
): boolean {
  const envOverride = import.meta.env.VITE_SPIDER_ENABLED
  if (envOverride === 'true' || envOverride === '1') return true
  if (envOverride === 'false' || envOverride === '0') return false

  return customDates.some((range) =>
    isDateInRange(now, range.startMonth, range.startDay, range.endMonth, range.endDay)
  )
}
