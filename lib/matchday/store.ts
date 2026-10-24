import 'server-only'
import {durable} from '@/lib/master/durable'
import {inOrder, untilWon} from '@/lib/master/cas'

/**
 * TODAY’S FOOTBALL keeps its files in the control room's durable store under `matchday/`. Every read that a write is built
 * on is fresh, every write is compare-and-swap, and with NO durable store nothing is saved at all: a dedupe record kept in one
 * server's memory is how a result gets sent twice. `fn` may run more than once (lost race) — it must not have side effects.
 */
const ROOT = 'matchday/'
const store = () => {
  const d = durable()
  if (!d) throw new Error('TODAY’S FOOTBALL needs the durable store (Supabase). Nothing is saved or sent without it.')
  return d
}
export const storeAvailable = () => !!durable()

export async function readDoc<T>(name: string, fallback: T): Promise<{value: T; etag: string | null}> {
  const r = await store().read(ROOT + name, {fresh: true})
  return r ? {value: JSON.parse(r.text) as T, etag: r.etag} : {value: fallback, etag: null}
}

/** read → fn → write; returns what is stored afterwards. If `fn` returns the value unchanged nothing is written. */
export function updateDoc<T>(name: string, fallback: T, fn: (cur: T) => T): Promise<T> {
  return inOrder(ROOT + name, async () => {
    let out!: T
    await untilWon(`TODAY’S FOOTBALL file ${name}`, async () => {
      const r = await store().read(ROOT + name, {fresh: true})
      const cur = r ? (JSON.parse(r.text) as T) : fallback
      const next = fn(cur)
      const text = JSON.stringify(next)
      if (r && r.text === text) { out = cur; return true }
      if (await store().write(ROOT + name, text, r ? r.etag : null)) { out = next; return true }
      return false
    })
    return out
  })
}

export async function listDocs<T>(prefix: string): Promise<T[]> {
  const names = await store().list(ROOT + prefix, {fresh: true})
  const rows = await Promise.all(names.map(async n => { const r = await store().read(n, {fresh: true}); return r ? (JSON.parse(r.text) as T) : null }))
  return rows.filter((x): x is Awaited<typeof x> & T => x !== null)
}
