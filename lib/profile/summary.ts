'use client'

/**
 * מה שנשמר במכשיר הזה — everything the app remembers about you, read in one place.
 *
 * The four stores that existed before the profile did — the ballot, the kit collection,
 * the member book and the LIFE save — are not migrated into it and are not going to be.
 * Each one is the right shape for what it holds, two of them have interfaces built for
 * the day a table lands behind them (`BallotStore.countable`, `CollectionStore.remote`),
 * and a migration that loses a member number loses the one thing on the card that
 * cannot be re-earned.
 *
 * What was missing is anybody who READS all of them at once. That is this file: the
 * personal area asks it one question — *what has this person actually got here?* — and
 * gets one answer, so the screen is a single truthful list rather than five widgets
 * that each know a fifth of it.
 *
 * **The LIFE save is read by key rather than through `lib/life/save.ts`.** That module
 * pulls in the engine's types, and the personal area does not want a dependency on the
 * game runtime to print one line about it. What it needs is the version, the year and
 * whether the file is there at all, and those are three fields off the front of the JSON.
 */

const LIFE_KEY = 'the-worker:life'
const KIT_KEY = 'worker.kits.v1'
/** the two team sheets gate 1 keeps — `lib/xi/store.ts` */
const XI_KEY = 'worker.xi.v1'
const BALLOT_KEY = 'worker.ballot.v1'
/**
 * The ballot is TWO keys, and forgetting one of them is worse than forgetting neither:
 * clearing the picks while leaving the seal meant the polls wing reloaded as a sealed,
 * empty slip — a screen with no way forward and nothing on it. Found 17.9.2026.
 */
const BALLOT_SEAL_KEY = 'worker.ballot.sealed.v1'
/** gate 5's saved designs — `lib/kit/studio-store.ts` */
const STUDIO_KEY = 'worker.kitStudio.v1'

export type DeviceSummary = {
  /** shirts assembled in gate 4 */
  kits: number
  /**
   * team sheets saved in gate 1 — the all-time eleven and the worst eleven.
   *
   * A sheet counts once it has a man on it. Counting only a full eleven would report
   * nothing for the person who has spent a fortnight arguing with himself about the
   * second centre back, which is the state this gate is actually played in.
   */
  xi: number
  /** poll questions answered */
  ballot: number
  /** designs saved in gate 5's studio */
  designs: number
  /** the gate 4 collection's keys (`1984/85|home`), for a card that unions them with `kits` */
  kitKeys: string[]
  /** the LIFE save, if there is one */
  life: { year: number | null; events: number } | null
}

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    // Blocked storage, private mode, corrupt JSON. A device that cannot be read is a
    // device with nothing on it — never a crash on the one screen that is about them.
    return null
  }
}

function countKeys(value: unknown): number {
  return typeof value === 'object' && value !== null ? Object.keys(value).length : 0
}

export function readDevice(): DeviceSummary {
  const life = readJson(LIFE_KEY) as { year?: unknown; events?: unknown } | null
  const xi = readJson(XI_KEY)
  const kits = readJson(KIT_KEY)
  const studio = readJson(STUDIO_KEY)
  return {
    kits: countKeys(kits),
    kitKeys: typeof kits === 'object' && kits !== null && !Array.isArray(kits) ? Object.keys(kits) : [],
    designs: Array.isArray(studio) ? studio.length : 0,
    xi:
      typeof xi === 'object' && xi !== null
        ? Object.values(xi as Record<string, unknown>).filter(
            (sheet) =>
              typeof sheet === 'object' &&
              sheet !== null &&
              countKeys((sheet as { picks?: unknown }).picks) > 0,
          ).length
        : 0,
    ballot: countKeys(readJson(BALLOT_KEY)),
    life:
      life === null
        ? null
        : {
            year: typeof life.year === 'number' ? life.year : null,
            events: Array.isArray(life.events) ? life.events.length : 0,
          },
  }
}

/**
 * Every key `forgetDevice` removes, out of everything the browser holds.
 *
 * It used to be a hand-written list of seven, and it had already fallen behind by three
 * (`worker.kitStudio.v1`, `worker.replayProgress.v1`, `worker.ballot.reasons.v1`) — so
 * "forget this device" left gate 5's designs, gate 8's ledger and the ballot's reasons
 * sitting in storage. A list somebody has to remember to extend is the bug (rule 59), so
 * it is now a PREFIX: every `worker.*` key, whoever wrote it and whenever — including the
 * device id, because a person who wipes their browser has asked to be a new voter
 * (`lib/portal/device.ts`). The LIFE save keeps its own name and is listed.
 */
export const FORGET_PREFIX = 'worker.'
const FORGET_ALSO = [LIFE_KEY] as const

export function keysToForget(present: readonly string[]): string[] {
  const known = [
    'worker.profile.v1',
    KIT_KEY,
    XI_KEY,
    BALLOT_KEY,
    'worker.member.v1',
    BALLOT_SEAL_KEY,
    STUDIO_KEY,
    'worker.replayProgress.v1',
    'worker.ballot.reasons.v1',
  ]
  const out = new Set<string>([...known, ...FORGET_ALSO])
  for (const key of present) if (key.startsWith(FORGET_PREFIX)) out.add(key)
  return [...out]
}

/** Wipe everything this device holds. Only ever called behind an explicit confirm. */
export function forgetDevice(): void {
  if (typeof window === 'undefined') return
  const present: string[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key !== null) present.push(key)
    }
  } catch {
    // storage that cannot be listed can still be cleared by name, below
  }
  for (const key of keysToForget(present)) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // nothing to do, and nothing worth breaking the page over
    }
  }
}
