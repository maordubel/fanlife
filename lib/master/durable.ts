/**
 * Durable storage for the control room on a serverless deployment (owner, 7.10.2026: "ENOENT … /var/task/.fan-life").
 * The deployment's disk is read-only and /tmp lasts one instance, so the control file — club status, gates,
 * decisions, the audit — lives in Vercel Blob (private) when the project has a Blob store connected
 * — either the classic `BLOB_READ_WRITE_TOKEN`, or the newer connection that sets only `BLOB_STORE_ID` and signs
 * every call with the deployment's own OIDC token (owner, 7.10.2026: "connected but not active"). Writes are conditional on the ETag read (optimistic concurrency): two instances
 * can never silently overwrite each other; the loser re-reads and re-applies its change.
 * Without a store, the server keeps working on /tmp and says plainly that changes will not survive a restart.
 */
export type DurableRead = { text: string; etag: string } | null
export type DurableStore = {
  kind: 'vercel-blob' | 'supabase' | 'memory'
  /**
   * Owner, 12.10.2026: "no feature may ever close because of a limit". So a read, by default, is answered from the deployment-wide
   * data cache (see `SHARED_S`) and, when the store refuses (an outage, credentials, a plan's operation cap), answers NULL — the
   * page carries on with what it has — instead of throwing a whole screen into an error page.
   * `fresh`: ask the store itself and throw on refusal — for the read a compare-and-swap save is built on.
   * `soft: false`: shared, but a refusal still throws (the control state needs to know, to fall back).
   * `maxAgeMs`: a copy this instance read or wrote that recently is answered without a request.
   */
  read(name: string, opts?: { maxAgeMs?: number; fresh?: boolean; soft?: boolean; shared?: boolean }): Promise<DurableRead>
  /** `etag` null = create only; returns false when someone else wrote first. */
  write(name: string, text: string, etag: string | null): Promise<boolean>
  list(prefix: string, opts?: { fresh?: boolean; soft?: boolean; shared?: boolean }): Promise<string[]>
}

const PREFIX = 'fan-life/'

/**
 * Blob quota (owner's hub outage, 11.10.2026): the store showed "Limits Exceeded" — every page view on every cold server instance
 * read control.json from Blob, and the Hobby plan's monthly operations ran out, so every read was refused and the hub served every
 * club closed. A page's read now goes through Next's data cache, which every instance of the deployment shares: the store is asked
 * at most once per SHARED_S per file, a save drops the cached copy at once (`revalidateTag`), and when the store refuses, the last
 * copy that was read keeps being served (Next serves a stale entry and swallows a failed refresh) instead of a closed site.
 */
// A day: every save drops the copy at once (`dropShared`), so the only thing a short window bought was more store operations —
// 5 minutes × a dozen files is ~100K a month, ten times the Hobby cap; a day is ~400.
const SHARED_S = 86_400
export const sharedTag = (name: string) => `fan-blob:${name}`
export const sharedListTag = (prefix: string) => `fan-blob-list:${prefix.split('/')[0]}`
const noCacheHere = (e: unknown) => /incrementalCache missing|static generation store missing|staticGenerationStore/i.test(String((e as Error)?.message || e))
async function viaShared<T>(key: string[], tag: string, fn: () => Promise<T>): Promise<T> {
  try {
    const { unstable_cache } = await import('next/cache')
    return await unstable_cache(fn, key, { revalidate: SHARED_S, tags: [tag] })()
  } catch (e) {
    if (noCacheHere(e)) return fn() // a script or a test: there is no deployment cache to share
    throw e
  }
}
/** The last read the store refused and that a page carried on without — for the control room's storage line. */
const softG = globalThis as typeof globalThis & { fanStoreSoft?: { at: number; name: string; error: string } }
export const storeSoftFailure = () => softG.fanStoreSoft ?? null
function soften<T>(name: string, run: () => Promise<T>, empty: T, soft: boolean | undefined): Promise<T> {
  if (soft === false) return run()
  return run().catch((e: unknown) => {
    softG.fanStoreSoft = { at: Date.now(), name, error: String((e as Error)?.message || e).slice(0, 200) }
    console.error(`[fan-life] store refused ${name}; carrying on without it:`, softG.fanStoreSoft.error)
    return empty
  })
}
async function dropShared(name: string) {
  try {
    const { revalidateTag } = await import('next/cache')
    revalidateTag(sharedTag(name)); revalidateTag(sharedListTag(name))
  } catch { /* outside a request (a script): nothing is cached to drop */ }
}
/** A Blob store is connected: a read-write token, or a store id the SDK pairs with the deployment's OIDC token. */
export const blobConnected = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const g = globalThis as typeof globalThis & { fanDurable?: DurableStore | null }

export function durableConfigured(): boolean {
  return !!(g.fanDurable || blobConnected() || supabaseConnected())
}

/**
 * Supabase is the store (owner, 12.10.2026: "approved, Supabase" — "a permanent solution, no payment"). Vercel Blob on the Hobby
 * plan has a monthly operation cap; when it ran out the hub went empty. Supabase, this project's database already, has no
 * operation cap. One table, `worker_fanlife_files` (name, body, etag) — migration 20261012090000 — reached only by the server with
 * the service-role key it already holds; a save is the same compare-and-swap as on Blob (`etag=eq.<read>`).
 * Blob stays behind it for one job: a file Supabase does not hold yet is looked up there (at most once an hour while Blob refuses)
 * and copied across, so whatever Blob still holds moves over by itself the first time it answers.
 */
const SB_TABLE = 'worker_fanlife_files'
export const supabaseConnected = () => !!((process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY) && process.env.FAN_LIFE_STORE !== 'blob'
class TableMissing extends Error {}
const randomTag = () => `"${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}"`
function supabaseStore(): DurableStore {
  // FAN_LIFE_STORE_URL: the browser sweeps point the store at a local PostgREST stand-in (scripts/qa/files-rest-shim.mjs).
  const base = () => `${(process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!).replace(/\/$/, '')}/rest/v1/${SB_TABLE}`
  const headers = (extra: Record<string, string> = {}) => { const k = process.env.SUPABASE_SERVICE_ROLE_KEY!; return { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', ...extra } }
  async function call(url: string, init: RequestInit = {}): Promise<unknown> {
    const r = await fetch(url, { ...init, headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) }, cache: 'no-store' })
    const text = await r.text()
    if (!r.ok) {
      if (r.status === 404 || /PGRST205|42P01|does not exist|Could not find the table/i.test(text)) throw new TableMissing(`Supabase table ${SB_TABLE} is missing — run migration 20261012090000.`)
      throw new Error(`Supabase store ${r.status}: ${text.slice(0, 200)}`)
    }
    return text ? JSON.parse(text) : null
  }
  const q = (v: string) => encodeURIComponent(v)
  const rawRead = async (name: string): Promise<DurableRead> => {
    const rows = (await call(`${base()}?name=eq.${q(name)}&select=body,etag`)) as { body: string; etag: string }[]
    return rows[0] ? { text: rows[0].body, etag: rows[0].etag } : null
  }
  const rawList = async (prefix: string): Promise<string[]> => {
    const rows = (await call(`${base()}?name=like.${q(prefix.replace(/[*%_\\]/g, ''))}*&select=name&order=name`)) as { name: string }[]
    return rows.map((r) => r.name)
  }
  return {
    kind: 'supabase',
    async read(name, opts) {
      if (opts?.fresh) return rawRead(name)
      return soften(name, () => viaShared(['fan-sb', name], sharedTag(name), () => rawRead(name)), null, opts?.soft)
    },
    async write(name, text, etag) {
      const next = randomTag()
      const rows = (etag === null
        ? await call(`${base()}?on_conflict=name`, { method: 'POST', headers: { Prefer: 'return=representation,resolution=ignore-duplicates' }, body: JSON.stringify({ name, body: text, etag: next }) })
        : await call(`${base()}?name=eq.${q(name)}&etag=eq.${q(etag)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ body: text, etag: next, updated_at: new Date().toISOString() }) })) as unknown[]
      await dropShared(name) // won or lost, the shared copy is no longer the newest
      return !!rows?.length // empty = somebody else wrote (or created) it first
    },
    async list(prefix, opts) {
      if (opts?.fresh) return rawList(prefix)
      return soften(prefix, () => viaShared(['fan-sb-list', prefix], sharedListTag(prefix), () => rawList(prefix)), [] as string[], opts?.soft)
    },
  }
}

/** Supabase first. Blob only for a file Supabase has not got yet (copied across), or for everything while the table is missing. */
function layeredStore(sb: DurableStore, blob: DurableStore | null): DurableStore {
  const st = g as typeof g & { fanSbMissing?: number; fanBlobQuiet?: number }
  const tableGone = () => !!st.fanSbMissing && Date.now() - st.fanSbMissing < 60_000
  const viaBlob = <T>(e: unknown, fallback: (() => Promise<T>) | null): Promise<T> => {
    if (e instanceof TableMissing && fallback) { st.fanSbMissing = Date.now(); console.error('[fan-life]', e.message, 'Using Blob meanwhile.'); return fallback() }
    throw e
  }
  async function fromBlob(name: string): Promise<DurableRead> {
    if (!blob || (st.fanBlobQuiet && Date.now() - st.fanBlobQuiet < 3_600_000)) return null
    try {
      const old = await blob.read(name, { fresh: true })
      if (!old) return null
      await sb.write(name, old.text, null) // create-only: never over a copy Supabase already holds
      return sb.read(name, { fresh: true })
    } catch { st.fanBlobQuiet = Date.now(); return null } // Blob refuses (its cap): leave it alone for an hour
  }
  return {
    kind: 'supabase',
    async read(name, opts) {
      if (tableGone() && blob) return blob.read(name, opts)
      try {
        const hit = await sb.read(name, opts?.fresh ? opts : { ...opts, soft: false })
        if (hit) return hit
        return await fromBlob(name)
      } catch (e) {
        if (e instanceof TableMissing) return viaBlob(e, blob ? () => blob.read(name, opts) : null)
        if (opts?.fresh || opts?.soft === false) throw e
        return null // a page's read carries on (rule 105)
      }
    },
    async write(name, text, etag) {
      if (tableGone() && blob) return blob.write(name, text, etag)
      try { return await sb.write(name, text, etag) } catch (e) { return viaBlob(e, blob ? () => blob.write(name, text, etag) : null) }
    },
    async list(prefix, opts) {
      if (tableGone() && blob) return blob.list(prefix, opts)
      try { return await sb.list(prefix, opts?.fresh ? opts : { ...opts, soft: false }) } catch (e) {
        if (e instanceof TableMissing) return viaBlob(e, blob ? () => blob.list(prefix, opts) : null)
        if (opts?.fresh || opts?.soft === false) throw e
        return []
      }
    },
  }
}

/**
 * Which credential the store answered to (hub outage 11.10.2026: every read was "Failed to fetch blob: 403 Forbidden", so the
 * pages served every club closed and the hub was empty). The SDK prefers the deployment's OIDC token whenever BLOB_STORE_ID is
 * set and only then the classic BLOB_READ_WRITE_TOKEN; when one of the two is refused, the other is tried, and the one that
 * worked is used from then on. `blobAuthReport()` says which is configured and which answered — never a secret value.
 */
type AuthMode = 'default' | 'token'
const auth = globalThis as typeof globalThis & { fanBlobAuth?: { prefer: AuthMode; lastOk: AuthMode | null; lastError: string | null; at: string | null } }
const authState = () => (auth.fanBlobAuth ??= { prefer: 'default', lastOk: null, lastError: null, at: null })
const refused = (e: unknown) => /\b(401|403)\b|forbidden|unauthori[sz]ed|access denied|invalid token|no blob credentials/i.test(String((e as Error)?.message || e))
function modes(): AuthMode[] {
  const rw = !!process.env.BLOB_READ_WRITE_TOKEN, first = authState().prefer
  const all: AuthMode[] = rw ? ['default', 'token'] : ['default']
  return [first, ...all.filter((m) => m !== first)].filter((m) => all.includes(m))
}
const optsFor = (m: AuthMode) => (m === 'token' ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {})
async function withAuth<T>(op: (extra: { token?: string }) => Promise<T>): Promise<T> {
  let last: unknown
  for (const m of modes()) {
    try {
      const out = await op(optsFor(m))
      const st = authState(); st.prefer = m; st.lastOk = m; st.lastError = null; st.at = new Date().toISOString()
      return out
    } catch (e) {
      last = e
      if (!refused(e)) throw e // a lost race, a missing file or a network fault is not a credential question
      const st = authState(); st.lastError = `${m}: ${String((e as Error)?.message || e).slice(0, 160)}`; st.at = new Date().toISOString()
    }
  }
  throw last
}
/** For the admin's storage line and the cron's error: what is configured and what the store accepted. */
export function blobAuthReport() {
  const st = authState()
  return { storeId: !!process.env.BLOB_STORE_ID, readWriteToken: !!process.env.BLOB_READ_WRITE_TOKEN, oidcEnv: !!process.env.VERCEL_OIDC_TOKEN, answeredTo: st.lastOk, lastRefusal: st.lastError, at: st.at }
}

function blobStore(): DurableStore {
  const sdk = import('@vercel/blob')
  const memo = new Map<string, { text: string; etag: string; at: number }>()
  const inflight = new Map<string, Promise<DurableRead>>()
  // a LOST RACE is a failed precondition (ifMatch) or, for a create-only write, "already exists" — nothing else. Any other
  // failure (token, size, network) must reach the caller as itself; it used to be retried as a conflict and hidden.
  const lostRace = (e: unknown, createOnly: boolean) => {
    const text = String((e as Error)?.message || e) + ' ' + String((e as { name?: string })?.name || '')
    return /BlobPreconditionFailed|precondition failed|\b412\b/i.test(text) || (createOnly && /already exists/i.test(text))
  }
  return {
    kind: 'vercel-blob',
    // Reads are CONDITIONAL (performance audit, 11.10.2026): the last copy and its ETag are kept per name, the store is asked
    // with If-None-Match, and an unchanged file answers 304 with no body. Concurrent reads of one name share one request.
    async read(name, opts) {
      if (!opts?.fresh) return soften(name, () => viaShared(['fan-blob', name], sharedTag(name), () => this.read(name, { maxAgeMs: opts?.maxAgeMs, fresh: true })), null, opts?.soft)
      const hit = memo.get(name)
      if (hit && opts?.maxAgeMs && Date.now() - hit.at < opts.maxAgeMs) return { text: hit.text, etag: hit.etag }
      let p = inflight.get(name)
      if (!p) {
        p = (async () => {
          const { get, BlobNotFoundError } = await sdk
          const r = await withAuth((a) => get(PREFIX + name, { access: 'private', useCache: false, ...a, ...(hit ? { ifNoneMatch: hit.etag } : {}) }).catch((e: unknown) => { if (e instanceof BlobNotFoundError) return null; throw e }))
          if (r && r.statusCode === 304 && hit) { hit.at = Date.now(); return { text: hit.text, etag: hit.etag } }
          if (!r || r.statusCode !== 200) { memo.delete(name); return null }
          const out = { text: await new Response(r.stream).text(), etag: r.blob.etag }
          memo.set(name, { ...out, at: Date.now() })
          return out
        })().finally(() => inflight.delete(name))
        inflight.set(name, p)
      }
      return p
    },
    async write(name, text, etag) {
      const { put, BlobPreconditionFailedError } = await sdk
      try {
        const done = await withAuth((a) => put(PREFIX + name, text, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: etag !== null, ...a, ...(etag ? { ifMatch: etag } : {}) }))
        // this instance's own save is the newest copy: its next read needs no download (and other instances revalidate by ETag)
        if (done?.etag) memo.set(name, { text, etag: done.etag, at: Date.now() }); else memo.delete(name)
        await dropShared(name)
        return true
      } catch (e) {
        memo.delete(name) // whatever we held may be the copy that just lost
        // lost the race: the shared copy is the stale one it was built on — drop it so the caller's retry reads the new one
        if (e instanceof BlobPreconditionFailedError || lostRace(e, etag === null)) { await dropShared(name); return false }
        throw e
      }
    },
    async list(prefix, opts) {
      if (!opts?.fresh) return soften(prefix, () => viaShared(['fan-blob-list', prefix], sharedListTag(prefix), () => this.list(prefix, { fresh: true })), [] as string[], opts?.soft)
      const { list } = await sdk
      const out: string[] = []
      let cursor: string | undefined
      do {
        const page = await withAuth((a) => list({ prefix: PREFIX + prefix, cursor, ...a }))
        out.push(...page.blobs.map((b) => b.pathname.slice(PREFIX.length)))
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      return out
    },
  }
}

/** The store, or null when none is connected. Tests inject one through `useDurableStore`. */
export function durable(): DurableStore | null {
  if (g.fanDurable !== undefined) return g.fanDurable
  const blob = blobConnected() ? blobStore() : null
  if (supabaseConnected()) return (g.fanDurable = layeredStore(supabaseStore(), blob))
  return (g.fanDurable = blob)
}
export function useDurableStore(store: DurableStore | null) { g.fanDurable = store }

/** An in-memory store with real ETag semantics, for tests. */
export function memoryStore(): DurableStore {
  const files = new Map<string, { text: string; etag: string }>()
  let n = 0
  return {
    kind: 'memory',
    async read(name) { return files.get(name) ?? null },
    async write(name, text, etag) {
      const cur = files.get(name)
      if (etag === null ? !!cur : cur?.etag !== etag) return false
      files.set(name, { text, etag: `e${++n}` })
      return true
    },
    async list(prefix) { return [...files.keys()].filter((k) => k.startsWith(prefix)) },
  }
}
