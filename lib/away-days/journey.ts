import { haversineKm, roundKm } from './distance'
import type { AwayDaysMaster, AwayVisit, DesignatedSide, Result, VenueRecord, VerifiedScorer } from './types'

/**
 * The journey, as the page reads it — pure functions over the generated master, so the
 * order, the legs and the distances are tested without a browser (tests/away-days*.test.ts).
 */

export type VenueLite = {
  id: string
  nameHe: string
  nameLatin: string | null
  cityHe: string
  cityLatin: string | null
  countryHe: string
  countryCode: string
  lat: number
  lng: number
}

export type VisitLite = {
  id: string
  matchId: string
  playedOn: string
  year: number
  venueId: string
  side: DesignatedSide
  competitionHe: string
  stageHe: string | null
  opponentHe: string
  opponentLatin: string | null
  scoreFor: number
  scoreAgainst: number
  result: Result
  scorers: VerifiedScorer[] | null
}

export type JourneyData = {
  origin: VenueLite
  venues: Record<string, VenueLite>
  visits: VisitLite[]
  counts: { visits: number; stops: number; countries: number; research: number }
}

export function venueLite(v: VenueRecord): VenueLite {
  return {
    id: v.id,
    nameHe: v.canonicalNameHe,
    nameLatin: v.canonicalNameLatin,
    cityHe: v.cityHe,
    cityLatin: v.cityLatin,
    countryHe: v.countryHe,
    countryCode: v.countryCode,
    lat: v.latitude,
    lng: v.longitude,
  }
}

function visitLite(v: AwayVisit): VisitLite {
  return {
    id: v.id,
    matchId: v.matchId,
    playedOn: v.playedOn,
    year: Number(v.playedOn.slice(0, 4)),
    venueId: v.venueId,
    side: v.designatedSide,
    competitionHe: v.competitionHe,
    stageHe: v.stageHe,
    opponentHe: v.opponentHe,
    opponentLatin: v.opponentLatin,
    scoreFor: v.scoreFor,
    scoreAgainst: v.scoreAgainst,
    result: v.result,
    scorers: v.scorers,
  }
}

/** The projection a page ships: public visits only, and only the venues they stand on. */
export function journeyData(master: AwayDaysMaster): JourneyData {
  const venues: Record<string, VenueLite> = {}
  for (const v of master.venues) venues[v.id] = venueLite(v)
  const origin = venues[master.origin.venueId]
  if (!origin) throw new Error('away-days master has no origin venue')
  return {
    origin,
    venues,
    visits: master.visits.map(visitLite),
    counts: {
      visits: master.counts.visits,
      stops: master.counts.stops,
      countries: master.counts.countries,
      research: master.counts.researchQueue,
    },
  }
}

export type Leg = {
  from: VenueLite
  to: VenueLite
  /** Haversine, rounded for print — 0 when the stop is the same ground as the last */
  km: number
  sameGround: boolean
}

/** The leg that ARRIVES at stop `index` (0 = the first away day, from Bloomfield). */
export function legTo(data: JourneyData, index: number): Leg | null {
  const visit = data.visits[index]
  if (!visit) return null
  const to = data.venues[visit.venueId]
  if (!to) return null
  const prev = index > 0 ? data.visits[index - 1] : null
  const from = prev ? (data.venues[prev.venueId] ?? data.origin) : data.origin
  const sameGround = from.id === to.id
  return { from, to, km: sameGround ? 0 : roundKm(haversineKm(latLng(from), latLng(to))), sameGround }
}

export const latLng = (v: VenueLite) => ({ latitude: v.lat, longitude: v.lng })

/** "7,000" — grouped the way a caption prints it. */
export function formatKm(km: number): string {
  return km.toLocaleString('en-US')
}

/** Visits standing on one ground, oldest first. */
export function visitsAt(data: JourneyData, venueId: string): VisitLite[] {
  return data.visits.filter((v) => v.venueId === venueId)
}

/** How many times the journey has already stood on this ground before stop `index`. */
export function visitNumberAt(data: JourneyData, index: number): number {
  const visit = data.visits[index]
  if (!visit) return 0
  return data.visits.slice(0, index + 1).filter((v) => v.venueId === visit.venueId).length
}

/* ---------------------------------------------------------------- explore filters */

export type Filters = {
  decade: number | null
  country: string | null
  competition: string | null
  result: Result | null
}

export const NO_FILTERS: Filters = { decade: null, country: null, competition: null, result: null }

export const decadeOf = (year: number) => Math.floor(year / 10) * 10

export function applyFilters(data: JourneyData, filters: Filters): VisitLite[] {
  return data.visits.filter(
    (v) =>
      (filters.decade === null || decadeOf(v.year) === filters.decade) &&
      (filters.country === null || data.venues[v.venueId]?.countryCode === filters.country) &&
      (filters.competition === null || v.competitionHe === filters.competition) &&
      (filters.result === null || v.result === filters.result),
  )
}

export function filterOptions(data: JourneyData) {
  const decades = [...new Set(data.visits.map((v) => decadeOf(v.year)))].sort((a, b) => a - b)
  const countries = new Map<string, string>()
  for (const v of data.visits) {
    const venue = data.venues[v.venueId]
    if (venue) countries.set(venue.countryCode, venue.countryHe)
  }
  const competitions = [...new Set(data.visits.map((v) => v.competitionHe))]
  return {
    decades,
    countries: [...countries].map(([code, he]) => ({ code, he })).sort((a, b) => a.he.localeCompare(b.he, 'he')),
    competitions,
  }
}

export function activeFilterCount(filters: Filters): number {
  return Object.values(filters).filter((v) => v !== null).length
}
