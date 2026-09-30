'use client'

import type { Tally, TallyRow } from './ballot'
import { DEBATES, debateQuestionId, isDebateReason } from './debates'
import { deviceId } from '@/lib/portal/device'
import { portalConfigured } from '@/lib/portal/env'
import { portalDb } from '@/lib/portal/db'

/**
 * איפה הוויכוח נשמר — the same seam as the ballot (`lib/polls/store.ts`), and deliberately
 * NOT the same store.
 *
 * הכרטיס שלי is a slip that gets sealed; a debate is a single opinion you can change your
 * mind about next week. Folding debates into `worker.ballot.v1` would have changed the
 * shape the ballot's own reader, migration and seal all depend on — so the debate keeps
 * its own keys and the ballot's storage is untouched.
 *
 * What it shares is the BOX. A debate vote is cast through `worker_poll_cast` under
 * `debate:<id>` and counted through `worker_poll_tally`, the same anonymous construction
 * rule 76 argues for: no user id, no read policy, a count out and nothing else. No SQL
 * change — `question_id` is free text up to 64 characters. The reason chip never leaves the
 * device, exactly as the ballot's reasons never do.
 *
 * `countable` is honest here too: the local store has one voter and says so, and the
 * screen shows no count rather than a bar chart of a sample of one (rule 11).
 */
export type DebateVotes = Record<string, string>
export type DebateReasons = Record<string, string>

export interface DebateStore {
  readonly countable: boolean
  read(): Promise<DebateVotes>
  save(debateId: string, pick: string): Promise<void>
  tally(debateId: string): Promise<Tally | null>
  reasons(): Promise<DebateReasons>
  saveReason(debateId: string, reason: string): Promise<void>
}

const KEY = 'worker.debate.v1'
const REASON_KEY = 'worker.debate.reasons.v1'
const KNOWN = new Set(DEBATES.map((debate) => debate.id))

function readMap(key: string, keep: (id: string, value: string) => boolean): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Record<string, string> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value !== '' && keep(id, value)) out[id] = value
    }
    return out
  } catch {
    return {}
  }
}

function writeMap(key: string, value: Record<string, string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // an unsaved opinion is still this session's opinion
  }
}

export class LocalDebateStore implements DebateStore {
  readonly countable = false

  async read(): Promise<DebateVotes> {
    // a retired prompt's vote is not read back under a heading nobody asked for
    return readMap(KEY, (id) => KNOWN.has(id))
  }

  async save(debateId: string, pick: string): Promise<void> {
    if (!KNOWN.has(debateId) || pick === '') return
    writeMap(KEY, { ...(await this.read()), [debateId]: pick })
  }

  async tally(): Promise<Tally | null> {
    return null
  }

  async reasons(): Promise<DebateReasons> {
    return readMap(REASON_KEY, (id, value) => KNOWN.has(id) && isDebateReason(value))
  }

  async saveReason(debateId: string, reason: string): Promise<void> {
    if (!KNOWN.has(debateId) || !isDebateReason(reason)) return
    const next = { ...(await this.reasons()) }
    if (next[debateId] === reason) delete next[debateId]
    else next[debateId] = reason
    writeMap(REASON_KEY, next)
  }
}

export class SupabaseDebateStore implements DebateStore {
  readonly countable = true
  private readonly paper = new LocalDebateStore()

  read(): Promise<DebateVotes> {
    return this.paper.read()
  }

  /** on the paper first, then into the box — a tap never waits on the network */
  async save(debateId: string, pick: string): Promise<void> {
    await this.paper.save(debateId, pick)
    const device = deviceId()
    if (device === null) return
    try {
      await portalDb().rpc('worker_poll_cast', {
        p_device_id: device,
        p_question_id: debateQuestionId(debateId),
        p_pick: pick,
      })
    } catch {
      // an uncast opinion is still on this device's paper
    }
  }

  /** counts only; `null` on any failure — a count that could not be read is not zero */
  async tally(debateId: string): Promise<Tally | null> {
    try {
      const { data, error } = await portalDb().rpc('worker_poll_tally', { p_question_id: debateQuestionId(debateId) })
      if (error || !Array.isArray(data)) return null
      const rows: TallyRow[] = []
      let total = 0
      for (const row of data) {
        const count = Number(row.votes)
        if (typeof row.pick !== 'string' || !Number.isFinite(count) || count <= 0) continue
        rows.push({ pick: row.pick, votes: count })
        total += count
      }
      return { total, rows }
    } catch {
      return null
    }
  }

  reasons(): Promise<DebateReasons> {
    return this.paper.reasons()
  }

  saveReason(debateId: string, reason: string): Promise<void> {
    return this.paper.saveReason(debateId, reason)
  }
}

/** keys present → the shared box; being signed in is deliberately not a condition (rule 76) */
export function activeDebateStore(): DebateStore {
  return portalConfigured() ? new SupabaseDebateStore() : new LocalDebateStore()
}
