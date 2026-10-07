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
  read(name: string): Promise<DurableRead>
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
  const conflict = (e: unknown) => /precondition|412|already exists|BlobPreconditionFailed/i.test(String((e as Error)?.message || e) + String((e as { name?: string })?.name || ''))
  return {
    kind: 'vercel-blob',
    async read(name) {
      const { get, BlobNotFoundError } = await sdk
      const r = await get(PREFIX + name, { access: 'private', useCache: false }).catch((e: unknown) => { if (e instanceof BlobNotFoundError) return null; throw e })
      if (!r || r.statusCode !== 200) return null
      return { text: await new Response(r.stream).text(), etag: r.blob.etag }
    },
    async write(name, text, etag) {
      const { put, BlobPreconditionFailedError } = await sdk
      try {
        await put(PREFIX + name, text, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: etag !== null, ...(etag ? { ifMatch: etag } : {}) })
        return true
      } catch (e) {
        if (e instanceof BlobPreconditionFailedError || conflict(e)) return false
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
