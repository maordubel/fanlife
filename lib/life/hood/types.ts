/**
 * LIFE · the hood — what the open neighbourhood adds to a RUSH `Level` (owner decision 23.11.2026, rule life-one-engine-hood).
 * Data only: places, the people who stand in the world, and the jobs they give. Nothing here names a club.
 */
import type {Look} from '@/lib/life/rush/level'

export type PlaceId = 'home' | 'kiosk' | 'corner' | 'school' | 'pitch' | 'ground'
export type PersonId = 'dad' | 'mate' | 'kiosk' | 'neighbour'
/** a job's id: the M1 job, or a story mission's id (`lib/life/hood/story`) */
export type JobId = string

/** a named place: a words key (`hood.place.*`), where it is and how near counts as "at" it */
export type HoodPlace = {id: PlaceId; key: string; x: number; z: number; r: number}
/** somebody standing in the world. `name` is the club cast's own first name, or null (the role's own word is printed instead). */
export type HoodPerson = {id: PersonId; name: string | null; role: string; x: number; z: number; r: number; look: Look}
/**
 * A job is given by a person when you walk up and press talk. Its steps are the level's own steps from `from`
 * (RUSH's reach / talk / collect / goal), its pickups the level's pickups; no clock, no fail state.
 */
export type HoodJob = {id: JobId; giver: PersonId; from: number; steps: number; titleKey: string; offerKey: string; againKey: string; doneKey: string}

export type HoodMeta = {
  places: HoodPlace[]
  people: HoodPerson[]
  jobs: HoodJob[]
  /** fixtures the renderer builds, so the level and the picture agree */
  door: {x: number; z: number}
  kiosk: {x: number; z: number}
  school: {x: number; z: number}
  pitch: {x: number; z: number; w: number; d: number}
  /** the year the street is in when the hood knows the life's birth year (`rush-render/era.ts` dresses it); absent: no era */
  year?: number | null
}
