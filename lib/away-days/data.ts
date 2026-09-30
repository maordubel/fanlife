import masterJson from '@/content/generated/away-days-master.json'

import { journeyData, type JourneyData } from './journey'
import type { AwayDaysMaster } from './types'

/**
 * The AWAY DAYS master, read on the server. A page hands the client `awayJourney()` —
 * public visits and the grounds they stand on — never the research queue.
 */
export const awayDaysMaster = masterJson as unknown as AwayDaysMaster

let cached: JourneyData | null = null
export function awayJourney(): JourneyData {
  cached ??= journeyData(awayDaysMaster)
  return cached
}

/** The strip's three numbers: what the journey holds today. */
export function awayCounts() {
  const { visits, stops, countries } = awayDaysMaster.counts
  return { matches: visits, stadiums: stops, countries }
}
