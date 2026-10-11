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
  kind: 'vercel-blob' | 'memory'
  /** `maxAgeMs`: a copy this instance read or wrote that recently is answered without a request (0 = always ask the store). */
  read(name: string, opts?: { maxAgeMs?: number }): Promise<DurableRead>
  /** `etag` null = create only; returns false when someone else wrote first. */
  write(name: string, text: string, etag: string | null): Promise<boolean>
  list(prefix: string): Promise<string[]>
}

const PREFIX = 'fan-life/'
/** A Blob store is connected: a read-write token, or a store id the SDK pairs with the deployment's OIDC token. */
export const blobConnected = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
const g = globalThis as typeof globalThis & { fanDurable?: DurableStore | null }

export function durableConfigured(): boolean {
  return !!(g.fanDurable || blobConnected())
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
      const hit = memo.get(name)
      if (hit && opts?.maxAgeMs && Date.now() - hit.at < opts.maxAgeMs) return { text: hit.text, etag: hit.etag }
      let p = inflight.get(name)
      if (!p) {
        p = (async () => {
          const { get, BlobNotFoundError } = await sdk
          const r = await get(PREFIX + name, { access: 'private', useCache: false, ...(hit ? { ifNoneMatch: hit.etag } : {}) }).catch((e: unknown) => { if (e instanceof BlobNotFoundError) return null; throw e })
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
        const done = await put(PREFIX + name, text, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: etag !== null, ...(etag ? { ifMatch: etag } : {}) })
        // this instance's own save is the newest copy: its next read needs no download (and other instances revalidate by ETag)
        if (done?.etag) memo.set(name, { text, etag: done.etag, at: Date.now() }); else memo.delete(name)
        return true
      } catch (e) {
        memo.delete(name) // whatever we held may be the copy that just lost
        if (e instanceof BlobPreconditionFailedError || lostRace(e, etag === null)) return false
        throw e
      }
    },
    async list(prefix) {
      const { list } = await sdk
      const out: string[] = []
      let cursor: string | undefined
      do {
        const page = await list({ prefix: PREFIX + prefix, cursor })
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
  return blobConnected() ? (g.fanDurable = blobStore()) : null
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
